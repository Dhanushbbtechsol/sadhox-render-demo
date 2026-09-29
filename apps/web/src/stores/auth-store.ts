import { create } from "zustand";
import { persist } from "zustand/middleware";

import { apiFetch, setAccessToken, setRefreshHandler, setUnauthorizedHandler } from "@/lib/api";
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
    }
  : {};

interface AuthState {
  user: AuthUser | null;
  /** In-memory only — never written to localStorage (XSS mitigation). */
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginAsRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  setHydrated: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export function homePathForRole(role: UserRole): string {
  if (role === "Admin") return "/admin/dashboard";
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
          });

          setAccessToken(data.accessToken);
          set({
            user: data.user,
            accessToken: data.accessToken,
            isAuthenticated: true,
          });
          return data.user;
        } catch (error) {
          if (!import.meta.env.DEV) {
            throw error instanceof Error ? error : new Error("Login failed");
          }
        }

        const mockUser = MOCK_USERS[email.toLowerCase()];
        if (!mockUser || mockUser.password !== password) {
          throw new Error("Invalid email or password");
        }

        applyMockSession(set, mockUser);
        const { password: _password, ...user } = mockUser;
        return user;
      },

      loginAsRole: (role) => {
        if (!import.meta.env.DEV) return;
        const mockUser = Object.values(MOCK_USERS).find(
          (entry) => entry.role === role,
        );
        if (!mockUser) return;
        applyMockSession(set, mockUser);
      },

      logout: async () => {
        try {
          await apiFetch<void>("/auth/logout", { method: "POST" });
        } catch {
          // Clear local session even if revoke fails
        }
        setAccessToken(null);
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      refresh: async () => {
        try {
          const data = await apiFetch<{ accessToken: string; user: AuthUser }>(
            "/auth/refresh",
            { method: "POST", skipAuth: true },
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
      onRehydrateStorage: () => (state) => {
        const finish = () => {
          useAuthStore.getState().setHydrated();
        };
        if (state?.isAuthenticated) {
          void useAuthStore.getState().refresh().finally(finish);
        } else {
          finish();
        }
      },
    },
  ),
);

setRefreshHandler(() => useAuthStore.getState().refresh());
setUnauthorizedHandler(() => {
  setAccessToken(null);
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
  });
});
