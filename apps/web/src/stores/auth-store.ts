import { create } from "zustand";
import { persist } from "zustand/middleware";

import { apiFetch, setAccessToken, setRefreshHandler, setUnauthorizedHandler } from "@/lib/api";
import type { AuthUser, LoginResponse, UserRole } from "@/types/itsm";

interface AuthState {
  user: AuthUser | null;
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
  if (role === "EndUser") return "/portal";
  return "/incidents";
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
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          setAccessToken(state.accessToken);
        }
        state?.setHydrated();
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
