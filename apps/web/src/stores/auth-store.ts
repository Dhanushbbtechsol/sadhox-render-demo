import { create } from "zustand";

import type { Role } from "@/features/admin/types";

type AuthState = {
  role: Role;
  name: string;
  setRole: (role: Role) => void;
};

export const ROLE_HOME: Record<Role, string> = {
  Admin: "/admin/dashboard",
  Agent: "/incidents",
  EndUser: "/",
};

export const useAuthStore = create<AuthState>((set) => ({
  role: "Admin",
  name: "Ian Okonkwo",
  setRole: (role) => set({ role }),
}));
