import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDirectoryUsers } from "@/features/projects/hooks";

import type { AdminUser } from "./use-admin-users";
import { useCreateAdminUser, useUpdateAdminUser } from "./use-admin-users";

const ROLES = ["Admin", "Agent", "EndUser", "Manager"] as const;
const NONE_REPORTS_TO = "__none__";

function passwordIssue(value: string): string | null {
  if (value.length < 12) return "Password must be at least 12 characters";
  if (!/[a-z]/.test(value)) return "Password must include a lowercase letter";
  if (!/[A-Z]/.test(value)) return "Password must include an uppercase letter";
  if (!/[0-9]/.test(value)) return "Password must include a digit";
  if (!/[^A-Za-z0-9]/.test(value)) {
    return "Password must include a special character";
  }
  return null;
}

const userSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(255),
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z.string().max(128),
    role: z.enum(ROLES),
    reportsToId: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.password) return;
    const issue = passwordIssue(value.password);
    if (issue) {
      ctx.addIssue({ code: "custom", path: ["password"], message: issue });
    }
  });

type UserFormValues = z.infer<typeof userSchema>;

type UserFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
};

export function UserFormDialog({
  open,
  onOpenChange,
  user,
}: UserFormDialogProps) {
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();
  const managers = useDirectoryUsers("Manager");
  const admins = useDirectoryUsers("Admin");
  const editing = Boolean(user);

  const reportsToOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; role: string }>();
    for (const entry of [...(managers.data ?? []), ...(admins.data ?? [])]) {
      if (user && entry.id === user.id) continue;
      byId.set(entry.id, { id: entry.id, name: entry.name, role: entry.role });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [managers.data, admins.data, user]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "Agent",
      reportsToId: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      role: (user?.role as UserFormValues["role"]) ?? "Agent",
      reportsToId: user?.reportsToId ?? null,
    });
  }, [open, user, form]);

  async function onSubmit(values: UserFormValues) {
    if (!editing && !values.password) {
      form.setError("password", { message: "Password is required" });
      return;
    }
    try {
      if (editing && user) {
        await updateUser.mutateAsync({
          id: user.id,
          input: {
            name: values.name,
            email: values.email,
            role: values.role,
            reportsToId: values.reportsToId,
            ...(values.password ? { password: values.password } : {}),
          },
        });
        toast.success(
          values.role === "Manager"
            ? `${values.name} updated. Project memberships were cleared.`
            : `${values.name} updated`,
        );
      } else {
        await createUser.mutateAsync({
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
          reportsToId: values.reportsToId,
        });
        toast.success(`${values.name} created`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  }

  const pending = createUser.isPending || updateUser.isPending;
  const reportsToValue = form.watch("reportsToId") ?? NONE_REPORTS_TO;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit user" : "New user"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Leave password blank to keep the current one. Promoting to Manager removes project memberships."
              : "Set a password the user can sign in with. Admins manage users; Managers do not."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="user-name">Name</Label>
            <Input id="user-name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" type="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">
              {editing ? "New password" : "Password"}
            </Label>
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
            />
            <p className="text-muted-foreground text-xs">
              At least 12 characters with upper, lower, a digit, and a symbol.
            </p>
            {form.formState.errors.password ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={form.watch("role")}
              onValueChange={(value) =>
                form.setValue("role", value as UserFormValues["role"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reports to</Label>
            <Select
              value={reportsToValue}
              onValueChange={(value) =>
                form.setValue(
                  "reportsToId",
                  value === NONE_REPORTS_TO ? null : value,
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_REPORTS_TO}>None</SelectItem>
                {reportsToOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name} ({option.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {editing ? "Save" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
