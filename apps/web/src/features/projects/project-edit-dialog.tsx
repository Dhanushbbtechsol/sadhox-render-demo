import { PlusIcon, Trash2Icon, UserMinusIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

import {
  useDeleteProject,
  useDirectoryUsers,
  useProjectMembers,
  useProjectModules,
  useSaveProjectSummary,
} from "./hooks";
import type { Project, ProjectSummaryModuleInput } from "./types";

type ProjectEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
};

/** A staged module row: `id` present means an existing module (rename/keep);
 * `tempKey` is a client-only key for React lists / editing new rows. */
type StagedModule = ProjectSummaryModuleInput & { tempKey: string };

function memberLabel(user: { name: string; role: string }) {
  return `${user.name} · ${user.role}`;
}

/**
 * U8 — the project summary. One Save persists the name, the manager, the
 * member changes, and the module changes together. Member/module edits
 * below only change local staged state until Save. Members may be any
 * user role; ticket assignment still uses Agents only.
 */
export function ProjectEditDialog({
  open,
  onOpenChange,
  project,
}: ProjectEditDialogProps) {
  const projectId = open ? project?.id : undefined;
  const managers = useDirectoryUsers("Manager");
  const directory = useDirectoryUsers();
  const saveSummary = useSaveProjectSummary(projectId ?? "");
  const deleteProject = useDeleteProject();

  const members = useProjectMembers(projectId);
  const modulesQuery = useProjectModules(projectId);

  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [editingModuleKey, setEditingModuleKey] = useState<string | null>(
    null,
  );
  const [editingModuleName, setEditingModuleName] = useState("");

  // Staged (not-yet-saved) member and module state.
  const [stagedMemberIds, setStagedMemberIds] = useState<string[]>([]);
  const [stagedMembers, setStagedMembers] = useState<
    { userId: string; name: string; email: string; role: string }[]
  >([]);
  const [stagedModules, setStagedModules] = useState<StagedModule[]>([]);
  const initializedProjectId = useRef<string | null>(null);

  const managerOptions = managers.data ?? [];
  const managerSelectItems = useMemo(
    () =>
      Object.fromEntries(managerOptions.map((m) => [m.id, m.name])) as Record<
        string,
        string
      >,
    [managerOptions],
  );

  const availableUsers = useMemo(() => {
    const taken = new Set(stagedMemberIds);
    return (directory.data ?? [])
      .filter((u) => !taken.has(u.id))
      .slice()
      .sort((a, b) => {
        const roleCmp = a.role.localeCompare(b.role);
        return roleCmp !== 0 ? roleCmp : a.name.localeCompare(b.name);
      });
  }, [directory.data, stagedMemberIds]);

  const memberSelectItems = useMemo(
    () =>
      Object.fromEntries(
        availableUsers.map((u) => [u.id, memberLabel(u)]),
      ) as Record<string, string>,
    [availableUsers],
  );

  // Reset staging when the dialog closes / a different project opens.
  useEffect(() => {
    if (!open || !project) {
      initializedProjectId.current = null;
      return;
    }
    if (initializedProjectId.current === project.id) return;
    setName(project.name);
    setManagerId(project.managerId ?? "");
    setSelectedUserId("");
    setModuleName("");
    setEditingModuleKey(null);
    setEditingModuleName("");
  }, [open, project]);

  // Populate staged members/modules from the server once per dialog open,
  // only after both queries succeed (errors must not stage empty lists).
  useEffect(() => {
    if (!open || !project) return;
    if (initializedProjectId.current === project.id) return;
    if (members.isLoading || modulesQuery.isLoading) return;
    if (members.isError || modulesQuery.isError) return;
    if (!members.isSuccess || !modulesQuery.isSuccess) return;
    const memberRows = members.data ?? [];
    const moduleRows = modulesQuery.data ?? [];
    setStagedMemberIds(memberRows.map((m) => m.userId));
    setStagedMembers(
      memberRows.map((m) => ({
        userId: m.userId,
        name: m.name,
        email: m.email,
        role: m.role,
      })),
    );
    setStagedModules(
      moduleRows.map((m) => ({
        id: m.id,
        name: m.name,
        tempKey: m.id,
      })),
    );
    initializedProjectId.current = project.id;
  }, [
    open,
    project,
    members.isLoading,
    members.isError,
    members.isSuccess,
    members.data,
    modulesQuery.isLoading,
    modulesQuery.isError,
    modulesQuery.isSuccess,
    modulesQuery.data,
  ]);

  async function onSave() {
    if (!project) return;
    if (initializedProjectId.current !== project.id) {
      if (members.isLoading || modulesQuery.isLoading) {
        toast.error("Members and modules are still loading");
        return;
      }
      if (members.isError || modulesQuery.isError) {
        toast.error(
          "Could not load members or modules. Fix the error before saving.",
        );
        return;
      }
      toast.error("Members and modules are still loading");
      return;
    }
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!managerId) {
      toast.error("Manager is required");
      return;
    }
    if (stagedModules.some((m) => !m.name.trim())) {
      toast.error("Module name is required");
      return;
    }
    try {
      await saveSummary.mutateAsync({
        name: name.trim(),
        managerId,
        memberUserIds: stagedMemberIds,
        modules: stagedModules.map((m) => ({
          id: m.id,
          name: m.name.trim(),
        })),
      });
      toast.success("Project updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  async function onDelete() {
    if (!project) return;
    if (!confirm(`Delete project “${project.name}”? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteProject.mutateAsync(project.id);
      toast.success("Project deleted");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  function onAddMember() {
    if (!selectedUserId) return;
    const user = (directory.data ?? []).find((u) => u.id === selectedUserId);
    if (!user) return;
    setStagedMemberIds((ids) => [...ids, user.id]);
    setStagedMembers((rows) => [
      ...rows,
      {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    ]);
    setSelectedUserId("");
  }

  function onRemoveMember(userId: string) {
    setStagedMemberIds((ids) => ids.filter((id) => id !== userId));
    setStagedMembers((rows) => rows.filter((m) => m.userId !== userId));
  }

  function onAddModule() {
    if (!moduleName.trim()) {
      toast.error("Module name is required");
      return;
    }
    setStagedModules((rows) => [
      ...rows,
      { name: moduleName.trim(), tempKey: `new-${Date.now()}-${rows.length}` },
    ]);
    setModuleName("");
  }

  function startEditModule(tempKey: string, currentName: string) {
    setEditingModuleKey(tempKey);
    setEditingModuleName(currentName);
  }

  function onSaveModuleName() {
    if (!editingModuleKey) return;
    if (!editingModuleName.trim()) {
      toast.error("Module name is required");
      return;
    }
    setStagedModules((rows) =>
      rows.map((r) =>
        r.tempKey === editingModuleKey
          ? { ...r, name: editingModuleName.trim() }
          : r,
      ),
    );
    setEditingModuleKey(null);
    setEditingModuleName("");
  }

  function onDeleteModule(tempKey: string, currentName: string) {
    if (!confirm(`Delete module “${currentName}”?`)) return;
    setStagedModules((rows) => rows.filter((r) => r.tempKey !== tempKey));
    if (editingModuleKey === tempKey) {
      setEditingModuleKey(null);
      setEditingModuleName("");
    }
  }

  const membersLoading = members.isLoading || modulesQuery.isLoading;
  const stagingInitialized =
    project != null && initializedProjectId.current === project.id;

  const managerLabel =
    managerOptions.find((m) => m.id === managerId)?.name ??
    project?.managerName ??
    "—";

  const createdLabel = project?.createdAt
    ? new Date(project.createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Project summary
            {project
              ? ` · ${project.referenceCode ? `${project.referenceCode} · ` : ""}${project.name}`
              : ""}
          </DialogTitle>
          <DialogDescription>
            Overview of this project, who is on it, and its modules. One save
            updates the name, the Manager, the members, and the modules
            together.
          </DialogDescription>
        </DialogHeader>

        <dl className="bg-muted/40 grid gap-3 rounded-md border px-3 py-3 text-sm sm:grid-cols-2">
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Created
            </dt>
            <dd className="font-medium tabular-nums">{createdLabel}</dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Manager
            </dt>
            <dd className="font-medium">{managerLabel}</dd>
          </div>
          <div className="grid gap-0.5 sm:col-span-2">
            <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Members present
            </dt>
            <dd className="font-medium">
              {membersLoading
                ? "Loading…"
                : stagedMembers.length === 0
                  ? "None"
                  : `${stagedMembers.length}: ${stagedMembers.map((m) => m.name).join(", ")}`}
            </dd>
          </div>
          <div className="grid gap-0.5 sm:col-span-2">
            <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Modules present
            </dt>
            <dd className="font-medium">
              {membersLoading
                ? "Loading…"
                : stagedModules.length === 0
                  ? "None"
                  : `${stagedModules.length}: ${stagedModules.map((m) => m.name).join(", ")}`}
            </dd>
          </div>
        </dl>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-project-name">Name</Label>
            <Input
              id="edit-project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Manager</Label>
            <Select
              value={managerId || null}
              onValueChange={(v) => setManagerId(v ?? "")}
              items={managerSelectItems}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Manager" />
              </SelectTrigger>
              <SelectContent>
                {managerOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id} label={m.name}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Members</h3>
          </div>
          <p className="text-muted-foreground mb-3 text-xs">
            Add any user (Admin, Agent, EndUser, or Manager). Ticket
            assignment still uses Agents only. Changes here are saved with
            the Save button below.
          </p>

          <div className="mb-3 flex gap-2">
            <Select
              value={selectedUserId || null}
              onValueChange={(v) => setSelectedUserId(v ?? "")}
              items={memberSelectItems}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a member to add" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
                  <SelectItem
                    key={u.id}
                    value={u.id}
                    label={memberLabel(u)}
                  >
                    {memberLabel(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={onAddMember}
              disabled={!selectedUserId}
            >
              <PlusIcon />
              Add
            </Button>
          </div>

          {membersLoading ? <Skeleton className="h-20" /> : null}
          {members.isError ? (
            <p className="text-destructive text-sm">
              {members.error instanceof Error
                ? members.error.message
                : "Failed to load members"}
            </p>
          ) : null}
          {!membersLoading && !members.isError ? (
            <Table>
              <TableBody>
                {stagedMembers.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.role}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.email}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveMember(m.userId)}
                        aria-label={`Remove ${m.name}`}
                      >
                        <UserMinusIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {stagedMembers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground text-sm"
                    >
                      No members yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          ) : null}
        </div>

        <div className="border-t pt-4">
          <h3 className="mb-3 text-sm font-semibold">Modules</h3>

          <div className="mb-3 flex gap-2">
            <Input
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              placeholder="Networking"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddModule();
                }
              }}
            />
            <Button type="button" onClick={onAddModule}>
              <PlusIcon />
              Add
            </Button>
          </div>

          {membersLoading ? <Skeleton className="h-20" /> : null}
          {modulesQuery.isError ? (
            <p className="text-destructive text-sm">
              {modulesQuery.error instanceof Error
                ? modulesQuery.error.message
                : "Failed to load modules"}
            </p>
          ) : null}
          {!membersLoading && !modulesQuery.isError ? (
            <Table>
              <TableBody>
                {stagedModules.map((mod) => (
                  <TableRow key={mod.tempKey}>
                    <TableCell className="font-medium">
                      {editingModuleKey === mod.tempKey ? (
                        <Input
                          value={editingModuleName}
                          onChange={(e) =>
                            setEditingModuleName(e.target.value)
                          }
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              onSaveModuleName();
                            }
                          }}
                        />
                      ) : (
                        mod.name
                      )}
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      {editingModuleKey === mod.tempKey ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={onSaveModuleName}
                        >
                          Done
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            startEditModule(mod.tempKey, mod.name)
                          }
                        >
                          Rename
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteModule(mod.tempKey, mod.name)}
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {stagedModules.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-muted-foreground text-sm"
                    >
                      No modules yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onDelete()}
            disabled={deleteProject.isPending}
          >
            {deleteProject.isPending ? "Deleting…" : "Delete project"}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => void onSave()}
              disabled={saveSummary.isPending || !stagingInitialized}
            >
              {saveSummary.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
