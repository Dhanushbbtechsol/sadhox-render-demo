import { create } from "zustand";
import { persist } from "zustand/middleware";

import { env } from "@sadhox/env/web";

import type { AuthUser, UserRole } from "@/types/api";

const MOCK_USERS: Record<string, AuthUser & { password: string }> = {
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
};

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  setSession: (user: AuthUser, accessToken: string) => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

async function tryRemoteLogin(email: string, password: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${env.VITE_SERVER_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Remote login failed");
    }

    return (await response.json()) as { accessToken: string; user: AuthUser };
  } finally {
    clearTimeout(timeout);
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setSession: (user, accessToken) => {
        set({ user, accessToken, isAuthenticated: true });
      },

      login: async (email, password) => {
        try {
          const remote = await tryRemoteLogin(email, password);
          set({
            user: remote.user,
            accessToken: remote.accessToken,
            isAuthenticated: true,
          });
          return;
        } catch {
          // Fall back to local mock auth until Dev D staging is available.
        }

        const mockUser = MOCK_USERS[email.toLowerCase()];
        if (!mockUser || mockUser.password !== password) {
          throw new Error("Invalid email or password");
        }

        const { password: _password, ...user } = mockUser;
        set({
          user,
          accessToken: `mock-token-${user.role.toLowerCase()}`,
          isAuthenticated: true,
        });
      },

      loginAsRole: (role) => {
        const mockUser = Object.values(MOCK_USERS).find((entry) => entry.role === role);
        if (!mockUser) return;
        const { password: _password, ...user } = mockUser;
        set({
          user,
          accessToken: `mock-token-${user.role.toLowerCase()}`,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 1500);
          await fetch(`${env.VITE_SERVER_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
            signal: controller.signal,
          });
          clearTimeout(timeout);
        } catch {
          // Ignore remote logout failures in mock mode.
        }
      },

      hasRole: (...roles) => {
        const role = get().user?.role;
        return role ? roles.includes(role) : false;
      },
    }),
    {
      name: "sadhox-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
