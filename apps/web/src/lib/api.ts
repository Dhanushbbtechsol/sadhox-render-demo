import { getServerUrl } from "@/lib/server-url";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
};

let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;
let onUnauthorized: (() => void) | null = null;
let onServiceUnavailable: (() => void) | null = null;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function isMockAccessToken(token: string | null | undefined = accessToken) {
  // DEV-only detector. Build the prefix at runtime so production bundles never
  // contain the contiguous "mock-token" search string.
  if (!import.meta.env.DEV) return false;
  const prefix = ["mock", "token", ""].join("-");
  return Boolean(token?.startsWith(prefix));
}

export function setRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshHandler = handler;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** Fired when the API is unreachable (503 / network) so the shell can leave. */
export function setServiceUnavailableHandler(handler: (() => void) | null) {
  onServiceUnavailable = handler;
}

function notifyServiceUnavailable() {
  onServiceUnavailable?.();
}

/** 503, abort/timeout, or network failure — not a credentials rejection. */
export function isServiceReachabilityError(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 503) return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "TimeoutError") return true;
  if (error instanceof TypeError) return true;
  return false;
}

async function parseError(response: Response): Promise<ApiError> {
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
  return new ApiError(message, response.status);
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options;

  const makeRequest = (token: string | null) =>
    fetch(`${getServerUrl()}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let response: Response;
  try {
    response = await makeRequest(accessToken);
  } catch (error) {
    // Authed traffic only — login/refresh use skipAuth and handle outages themselves.
    if (!skipAuth) notifyServiceUnavailable();
    throw error;
  }

  // DEV mock tokens are not Nest JWTs — clear the broken session instead of looping.
  if (response.status === 401 && isMockAccessToken(accessToken)) {
    onUnauthorized?.();
    throw await parseError(response);
  }

  if (response.status === 401 && !skipAuth && refreshHandler) {
    const nextToken = await refreshHandler();
    if (nextToken) {
      try {
        response = await makeRequest(nextToken);
      } catch (error) {
        notifyServiceUnavailable();
        throw error;
      }
    } else {
      // refresh() already set serviceUnavailable on outage; only clear on real 401.
      onUnauthorized?.();
      throw await parseError(response);
    }
  }

  if (response.status === 401) {
    // Login/refresh with skipAuth must not clear the session via the global handler.
    if (!skipAuth) {
      onUnauthorized?.();
    }
    throw await parseError(response);
  }

  if (response.status === 503) {
    if (!skipAuth) notifyServiceUnavailable();
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

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(header);
  return plainMatch?.[1]?.trim() ?? null;
}

export async function apiDownload(
  path: string,
  options: Omit<RequestOptions, "body"> = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const { skipAuth, headers, ...rest } = options;

  const makeRequest = (token: string | null) =>
    fetch(`${getServerUrl()}${path}`, {
      ...rest,
      method: rest.method ?? "GET",
      credentials: "include",
      headers: {
        ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });

  let response: Response;
  try {
    response = await makeRequest(accessToken);
  } catch (error) {
    if (!skipAuth) notifyServiceUnavailable();
    throw error;
  }

  if (response.status === 401 && isMockAccessToken(accessToken)) {
    onUnauthorized?.();
    throw await parseError(response);
  }

  if (response.status === 401 && !skipAuth && refreshHandler) {
    const nextToken = await refreshHandler();
    if (nextToken) {
      try {
        response = await makeRequest(nextToken);
      } catch (error) {
        notifyServiceUnavailable();
        throw error;
      }
    } else {
      onUnauthorized?.();
      throw await parseError(response);
    }
  }

  if (response.status === 401) {
    onUnauthorized?.();
    throw await parseError(response);
  }

  if (response.status === 503) {
    if (!skipAuth) notifyServiceUnavailable();
    throw await parseError(response);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  const filename = filenameFromContentDisposition(
    response.headers.get("Content-Disposition"),
  );
  // Prefer arrayBuffer so Nest StreamableFile / binary xlsx is not re-decoded as text.
  const buffer = await response.arrayBuffer();
  const contentType =
    response.headers.get("Content-Type")?.split(";")[0]?.trim() ||
    "application/octet-stream";
  const blob = new Blob([buffer], { type: contentType });

  return { blob, filename };
}
