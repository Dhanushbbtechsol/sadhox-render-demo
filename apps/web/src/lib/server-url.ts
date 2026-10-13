import { env } from "@sadhox/env/web";

const isLocalHost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

/**
 * API origin for fetch + Socket.IO.
 * In DEV, when the SPA is opened via a LAN IP (not localhost), point at the
 * same host on :3000 so other devices do not call their own localhost.
 */
export function getServerUrl(): string {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const pageHost = window.location.hostname;
    if (!isLocalHost(pageHost)) {
      return `${window.location.protocol}//${pageHost}:3000`;
    }
  }
  return env.VITE_SERVER_URL;
}
