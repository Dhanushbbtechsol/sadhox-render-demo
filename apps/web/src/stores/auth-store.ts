import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  ApiError,
  apiFetch,
  getAccessToken,
  isMockAccessToken,
  isServiceReachabilityError,
  setAccessToken,
  setRefreshHandler,
  setServiceUnavailableHandler,
  setUnauthorizedHandler,
} from "@/lib/api";
import type { AuthUser, LoginResponse, UserRole } from "@/types/itsm";

interface AuthState {
  user: AuthUser | null;
  /** In-memory only — never written to localStorage (XSS mitigation). */
  accessToken: string | null;
  /**
   * True only after a 200 from /auth/login or /auth/refresh in this page load
   * that deposited an in-memory access token. Never restored from storage alone.
   */
  isAuthenticated: boolean;
  /** Non-sensitive hint: try refresh on start. No role/user persisted. */
  hadSession: boolean;
  isHydrated: boolean;
  /** Backend/DB unreachable during boot or refresh — keep hint + cookie. */
  serviceUnavailable: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  /** Re-run refresh after a service-unavailable screen (Retry). */
  retryRestore: () => Promise<boolean>;
  setHydrated: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export function homePathForRole(role: UserRole): string {
  if (role === "Admin") return "/admin/dashboard";
  if (role === "Manager") return "/manager";
  return "/incidents";
}

/** Legacy DEV mock personas (pre-removal). Never treat these as a live session. */
const LEGACY_MOCK_USER_IDS = new Set([
  "user-enduser",
  "user-agent",
  "user-admin",
  "user-manager",
]);

function isLegacyMockUser(user: AuthUser | null | undefined): boolean {
  return Boolean(user && LEGACY_MOCK_USER_IDS.has(user.id));
}

function clearVerifiedSession(set: (partial: Partial<AuthState>) => void) {
  setAccessToken(null);
  set({
    user: null,
    accessToken: null,
    isAuthenticated: false,
  });
}

/** 401 / logout — drop hint so the next boot does not auto-refresh. */
function clearEverything(set: (partial: Partial<AuthState>) => void) {
  clearVerifiedSession(set);
  set({
    hadSession: false,
    serviceUnavailable: false,
  });
}

const REFRESH_TIMEOUT_MS = 5_000;
const HYDRATION_FAILSAFE_MS = 35_000;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      hadSession: false,
      isHydrated: false,
      serviceUnavailable: false,

      setHydrated: () => set({ isHydrated: true }),

      hasRole: (...roles) => {
        const role = get().user?.role;
        return role ? roles.includes(role) : false;
      },

      login: async (email, password) => {
        const data = await apiFetch<LoginResponse>("/auth/login", {
          method: "POST",
          body: { email, password },
          skipAuth: true,
          signal: AbortSignal.timeout(15_000),
        });

        setAccessToken(data.accessToken);
        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
          hadSession: true,
          serviceUnavailable: false,
        });
        return data.user;
      },

      logout: async () => {
        if (!isMockAccessToken(getAccessToken())) {
          try {
            await apiFetch<void>("/auth/logout", { method: "POST" });
          } catch {
            // Clear local session even if revoke fails
          }
        }
        clearEverything(set);
      },

      refresh: async () => {
        const current = getAccessToken() ?? get().accessToken;
        if (isMockAccessToken(current)) {
          clearEverything(set);
          return null;
        }

        try {
          const data = await apiFetch<{ accessToken: string; user: AuthUser }>(
            "/auth/refresh",
            {
              method: "POST",
              skipAuth: true,
              signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
            },
          );
          setAccessToken(data.accessToken);
          set({
            accessToken: data.accessToken,
            user: data.user,
            isAuthenticated: true,
            hadSession: true,
            serviceUnavailable: false,
          });
          return data.accessToken;
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            clearEverything(set);
            return null;
          }
          if (isServiceReachabilityError(error)) {
            // Keep hadSession + httpOnly cookie; drop unverified in-memory identity.
            clearVerifiedSession(set);
            set({ serviceUnavailable: true });
            return null;
          }
          clearVerifiedSession(set);
          set({ serviceUnavailable: true });
          return null;
        }
      },

      retryRestore: async () => {
        set({ serviceUnavailable: false });
        const token = await get().refresh();
        if (token) {
          set({ serviceUnavailable: false, isHydrated: true });
          return true;
        }
        // If refresh 401'd, refresh() already cleared the session — stay off the gate.
        if (!get().hadSession) {
          set({ serviceUnavailable: false });
        }
        return false;
      },
    }),
    {
      name: "sadhox-auth",
      version: 3,
      // Persist only a non-sensitive "had a session" hint — never role/user/token.
      partialize: (state) => ({
        hadSession: state.hadSession,
      }),
      migrate: (persisted, fromVersion) => {
        const state = persisted as {
          user?: AuthUser | null;
          isAuthenticated?: boolean;
          hadSession?: boolean;
        } | null;
        if (!state) {
          return { hadSession: false };
        }
        if (fromVersion < 3) {
          if (isLegacyMockUser(state.user)) {
            return { hadSession: false };
          }
          return {
            hadSession: Boolean(state.isAuthenticated && state.user),
          };
        }
        return { hadSession: Boolean(state.hadSession) };
      },
    },
  ),
);

async function finishAuthHydration() {
  const state = useAuthStore.getState();
  if (state.isHydrated) return;

  try {
    if (!state.hadSession) {
      clearVerifiedSession(useAuthStore.setState);
      return;
    }

    const token = await state.refresh();
    if (!token && useAuthStore.getState().serviceUnavailable) {
      // Stay on unavailable screen; hint + cookie kept.
      return;
    }
    // 401 path already cleared everything inside refresh().
  } finally {
    useAuthStore.getState().setHydrated();
  }
}

if (typeof window !== "undefined") {
  if (useAuthStore.persist.hasHydrated()) {
    void finishAuthHydration();
  } else {
    useAuthStore.persist.onFinishHydration(() => {
      void finishAuthHydration();
    });
  }

  // Failsafe: never open the shell with an unverified session.
  window.setTimeout(() => {
    const s = useAuthStore.getState();
    if (s.isHydrated) return;
    if (s.hadSession) {
      clearVerifiedSession(useAuthStore.setState);
      useAuthStore.setState({
        serviceUnavailable: true,
        isHydrated: true,
      });
      return;
    }
    useAuthStore.getState().setHydrated();
  }, HYDRATION_FAILSAFE_MS);
}

setRefreshHandler(() => useAuthStore.getState().refresh());
setUnauthorizedHandler(() => {
  if (useAuthStore.getState().serviceUnavailable) {
    // Refresh already marked the outage — do not wipe the session hint/cookie.
    return;
  }
  clearEverything(useAuthStore.setState);
});
setServiceUnavailableHandler(() => {
  // Mid-session outage (Nest/DB down): drop the shell, keep hadSession + cookie.
  clearVerifiedSession(useAuthStore.setState);
  useAuthStore.setState({ serviceUnavailable: true });
});
