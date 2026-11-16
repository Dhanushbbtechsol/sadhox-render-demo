# Cross-site refresh cookie verification (staging / production)

## Why SameSite=Strict / Lax fail here

| Host | Platform | Example origin |
| --- | --- | --- |
| Frontend | Render Static Site (or Vercel) | `https://sadhox-web-staging.onrender.com` |
| Backend | Render | `https://sadhox-api-staging.onrender.com` |

These are **different registrable domains** → every browser classifies
`fetch(API/auth/refresh, { credentials: "include" })` as a **cross-site** request.

| SameSite | Sent on cross-site XHR POST? | Usable for refresh? |
| --- | --- | --- |
| `Strict` | No | No |
| `Lax` | No (only top-level GET navigations) | No |
| `None` (+ `Secure`) | Yes | **Yes** |

Code: `apps/server/src/auth/refresh-cookie.ts`  
(`production` → `SameSite=None; Secure`, `development` → `SameSite=Lax`).

Supertest / same-origin unit tests **cannot** prove cross-site delivery. Use the
manual check below on real staging domains.

## Manual staging checklist (required before go-live)

Prerequisites: staging API HTTPS + `CORS_ORIGIN` = exact Static Site origin;
frontend `VITE_SERVER_URL` = staging API origin.

1. Open the **Static Site** app in Chrome. DevTools → Application → Cookies: clear
   site data for both web and API hosts.
2. Log in via the UI (hits `POST {API}/auth/login` with `credentials: include`).
3. On the **API** host cookies, confirm `refresh_token` has:
   - `HttpOnly`
   - `Secure`
   - `SameSite=None`
   - `Path=/auth`
4. DevTools → Network: delete / expire the in-memory access token path
   (or wait for expiry), then trigger any authenticated API call so the client
   runs `POST /auth/refresh` with `credentials: "include"`.
5. Inspect that refresh request:
   - Request cookies include `refresh_token`
   - Response is **200** with a new `accessToken`
6. Negative check (optional): temporarily set API cookie to `SameSite=Lax` on a
   throwaway branch — refresh request must **omit** the cookie and fail. Revert.

Record date + staging URLs in the Day 20 go-live notes when this passes.
