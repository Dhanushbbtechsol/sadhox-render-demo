import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, getAccessToken, isMockAccessToken } from "@/lib/api";
import { mockDirectoryUsers, mockProjectMembers } from "@/features/projects/mocks";
import type { DirectoryUser } from "@/features/projects/types";

export type AdminUser = DirectoryUser;

export type CreateAdminUserInput = {
  name: string;
  email: string;
  password: string;
  role: "Admin" | "Agent" | "EndUser" | "Manager";
};

export type UpdateAdminUserInput = {
  name?: string;
  email?: string;
  password?: string;
  role?: CreateAdminUserInput["role"];
};

function useOfflineAdminData() {
  return import.meta.env.DEV && isMockAccessToken(getAccessToken());
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users", "all", useOfflineAdminData() ? "mock" : "live"],
    queryFn: async (): Promise<AdminUser[]> => {
      if (useOfflineAdminData()) return [...mockDirectoryUsers];
      const result = await apiFetch<{ data: AdminUser[] }>("/admin/users");
      return result.data;
    },
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAdminUserInput) => {
      if (useOfflineAdminData()) {
        const created: AdminUser = {
          id: `user-${Date.now()}`,
          name: input.name,
          email: input.email,
          role: input.role,
        };
        mockDirectoryUsers.push(created);
        return created;
      }
      return apiFetch<AdminUser>("/admin/users", {
        method: "POST",
        body: input,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateAdminUserInput;
    }) => {
      if (useOfflineAdminData()) {
        const index = mockDirectoryUsers.findIndex((user) => user.id === id);
        if (index < 0) throw new Error("User not found");
        const { password: _password, ...rest } = input;
        mockDirectoryUsers[index] = {
          ...mockDirectoryUsers[index],
          ...rest,
        };
        if (input.role === "Manager") {
          for (let i = mockProjectMembers.length - 1; i >= 0; i -= 1) {
            if (mockProjectMembers[i]?.userId === id) {
              mockProjectMembers.splice(i, 1);
            }
          }
        }
        return mockDirectoryUsers[index];
      }
      return apiFetch<AdminUser>(`/admin/users/${id}`, {
        method: "PATCH",
        body: input,
      });
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      if (variables.input.role === "Manager") {
        await queryClient.invalidateQueries({ queryKey: ["projects"] });
      }
    },
  });
}
