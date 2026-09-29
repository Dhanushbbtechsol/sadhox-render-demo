import { env } from "@sadhox/env/web";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
};

let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshHandler = handler;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function parseError(response: Response): Promise<Error> {
  let message = `Request failed (${response.status})`;
  try {
    const data = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };
    if (Array.isArray(data.message)) {
      message = data.message.join(", ");
    } else {
      message = data.message ?? data.error ?? message;
    }
  } catch {
    // ignore non-JSON bodies
  }
  return new Error(message);
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options;

  const makeRequest = (token: string | null) =>
    fetch(`${env.VITE_SERVER_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let response = await makeRequest(accessToken);

  if (response.status === 401 && !skipAuth && refreshHandler) {
    const nextToken = await refreshHandler();
    if (nextToken) {
      response = await makeRequest(nextToken);
    } else {
      onUnauthorized?.();
      throw await parseError(response);
    }
  }

  if (response.status === 401) {
    onUnauthorized?.();
    throw await parseError(response);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
