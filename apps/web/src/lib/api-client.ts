import { env } from "@sadhox/env/web";

import { setAccessToken } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/types/itsm";

type ApiOptions = RequestInit & {
  skipAuth?: boolean;
};

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${env.VITE_SERVER_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { accessToken: string; user: AuthUser };
    setAccessToken(data.accessToken);
    useAuthStore.setState({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
    });
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { skipAuth = false, headers, ...rest } = options;
  const token = useAuthStore.getState().accessToken;

  const buildHeaders = (accessToken?: string | null): HeadersInit => ({
    "Content-Type": "application/json",
    ...(headers ?? {}),
    ...(!skipAuth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  });

  let response = await fetch(`${env.VITE_SERVER_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: buildHeaders(token),
  });

  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetch(`${env.VITE_SERVER_URL}${path}`, {
        ...rest,
        credentials: "include",
        headers: buildHeaders(refreshed),
      });
    }
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as {
        message?: string | string[];
        error?: string;
      };
      if (Array.isArray(data.message)) {
        message = data.message.join(", ");
      } else if (data.message || data.error) {
        message = data.message ?? data.error ?? message;
      }
    } catch {
      // ignore non-JSON
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
