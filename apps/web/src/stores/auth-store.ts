import { create } from "zustand";
import { persist } from "zustand/middleware";

import { apiFetch, getAccessToken, isMockAccessToken, setAccessToken, setRefreshHandler, setUnauthorizedHandler } from "@/lib/api";
import type { AuthUser, LoginResponse, UserRole } from "@/types/itsm";

/** Local mock users — only referenced from DEV code paths. */
const MOCK_USERS: Record<string, AuthUser & { password: string }> = import.meta
  .env.DEV
  ? {
      "enduser@sadhox.local": {
        id: "user-enduser",
        email: "enduser@sadhox.local",
        name: "End User",
        role: "EndUser",
        password: "password",
      },
      // Alias used by seed / login presets — same EndUser persona as enduser@.
      "user@sadhox.local": {
        id: "user-enduser",
        email: "user@sadhox.local",
        name: "End User",
        role: "EndUser",
        password: "password",
      },
      "agent@sadhox.local": {
        id: "user-agent",
        email: "agent@sadhox.local",
        name: "Support Agent",
        role: "Agent",
        password: "password",
      },
      "admin@sadhox.local": {
        id: "user-admin",
        email: "admin@sadhox.local",
        name: "IT Admin",
        role: "Admin",
        password: "password",
      },
      "manager@sadhox.local": {
        id: "user-manager",
        email: "manager@sadhox.local",
        name: "Morgan Manager",
        role: "Manager",
        password: "password",
      },
    }
  : {};

interface AuthState {
  user: AuthUser | null;
  /** In-memory only — never written to localStorage (XSS mitigation). */
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  setHydrated: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export function homePathForRole(role: UserRole): string {
  if (role === "Admin") return "/admin/dashboard";
  if (role === "Manager") return "/manager";
  if (role === "EndUser") return "/portal";
  return "/incidents";
}

function applyMockSession(
  set: (partial: Partial<AuthState>) => void,
  mockUser: AuthUser & { password: string },
) {
  const { password: _password, ...user } = mockUser;
  const accessToken = `mock-token-${user.role.toLowerCase()}`;
  setAccessToken(accessToken);
  set({
    user,
    accessToken,
    isAuthenticated: true,
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: false,

      setHydrated: () => set({ isHydrated: true }),

      hasRole: (...roles) => {
        const role = get().user?.role;
        return role ? roles.includes(role) : false;
      },

      login: async (email, password) => {
        try {
          const data = await apiFetch<LoginResponse>("/auth/login", {
            method: "POST",
            body: { email, password },
            skipAuth: true,
            signal: AbortSignal.timeout(5_000),
          });

          setAccessToken(data.accessToken);
          set({
            user: data.user,
            accessToken: data.accessToken,
            isAuthenticated: true,
          });
          return data.user;
        } catch (error) {
          // Only mock-fallback when the API is unreachable — never on 401 invalid credentials.
          const message = error instanceof Error ? error.message : "";
          const isCredentialReject =
            /invalid credentials|unauthorized|401/i.test(message);
          const isOffline =
            error instanceof TypeError ||
            (error instanceof DOMException && error.name === "TimeoutError") ||
            /failed to fetch|network|timeout|aborted/i.test(message);

          if (!import.meta.env.DEV || isCredentialReject || !isOffline) {
            throw error instanceof Error ? error : new Error("Login failed");
          }
        }

        // Offline / DB-down fallback for local UI work (Phase stubs).
        const mockUser = MOCK_USERS[email.toLowerCase()];
        const allowedPasswords = new Set([mockUser?.password, "ChangeMe123!", "password"]);
        if (!mockUser || !allowedPasswords.has(password)) {
          throw new Error(
            "Invalid email or password (API unreachable — try password `password` or `ChangeMe123!` in local DEV)",
          );
        }

        applyMockSession(set, mockUser);
        const { password: _password, ...user } = mockUser;
        return user;
      },

      logout: async () => {
        if (!isMockAccessToken(getAccessToken())) {
          try {
            await apiFetch<void>("/auth/logout", { method: "POST" });
          } catch {
            // Clear local session even if revoke fails
          }
        }
        setAccessToken(null);
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      refresh: async () => {
        const current = getAccessToken() ?? get().accessToken;
        if (isMockAccessToken(current)) {
          return current;
        }

        try {
          const data = await apiFetch<{ accessToken: string; user: AuthUser }>(
            "/auth/refresh",
            {
              method: "POST",
              skipAuth: true,
              signal: AbortSignal.timeout(5_000),
            },
          );
          setAccessToken(data.accessToken);
          set({
            accessToken: data.accessToken,
            user: data.user,
            isAuthenticated: true,
          });
          return data.accessToken;
        } catch {
          setAccessToken(null);
          set({ user: null, accessToken: null, isAuthenticated: false });
          return null;
        }
      },
    }),
    {
      name: "sadhox-auth",
      // Persist identity flag only — access token stays in memory; restore via refresh cookie.
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

function finishAuthHydration() {
  const state = useAuthStore.getState();
  if (state.isHydrated) return;

  if (state.isAuthenticated) {
    void state.refresh().finally(() => {
      useAuthStore.getState().setHydrated();
    });
    return;
  }

  state.setHydrated();
}

if (typeof window !== "undefined") {
  if (useAuthStore.persist.hasHydrated()) {
    finishAuthHydration();
  } else {
    useAuthStore.persist.onFinishHydration(() => {
      finishAuthHydration();
    });
  }

  // Failsafe: never leave the app on the hydration spinner (e.g. hung refresh / DB down).
  window.setTimeout(() => {
    if (!useAuthStore.getState().isHydrated) {
      setAccessToken(null);
      useAuthStore.setState({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
      useAuthStore.getState().setHydrated();
    }
  }, 5_000);
}

setRefreshHandler(() => useAuthStore.getState().refresh());
setUnauthorizedHandler(() => {
  setAccessToken(null);
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
  });
});
