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

/**
 * U8 — the project summary. One Save persists the name, the manager, the
 * member changes, and the module changes together (requirement, verbatim:
 * "One save updates the name, the manager, the members, and the modules.").
 * Member/module edits below only change local staged state; nothing is
 * written to the server until Save. KTD6: members are Agent users only;
 * Managers supervise, they are never project members.
 */
export function ProjectEditDialog({
  open,
  onOpenChange,
  project,
}: ProjectEditDialogProps) {
  const projectId = open ? project?.id : undefined;
  const managers = useDirectoryUsers("Manager");
  const agents = useDirectoryUsers("Agent");
  const saveSummary = useSaveProjectSummary(projectId ?? "");
  const deleteProject = useDeleteProject();

  const members = useProjectMembers(projectId);
  const modulesQuery = useProjectModules(projectId);

  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [editingModuleKey, setEditingModuleKey] = useState<string | null>(
    null,
  );
  const [editingModuleName, setEditingModuleName] = useState("");

  // Staged (not-yet-saved) member and module state.
  const [stagedMemberIds, setStagedMemberIds] = useState<string[]>([]);
  const [stagedMembers, setStagedMembers] = useState<
    { userId: string; name: string; email: string }[]
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

  const availableAgents = useMemo(() => {
    const taken = new Set(stagedMemberIds);
    return (agents.data ?? []).filter((a) => !taken.has(a.id));
  }, [agents.data, stagedMemberIds]);

  const agentSelectItems = useMemo(
    () =>
      Object.fromEntries(
        availableAgents.map((a) => [a.id, a.name]),
      ) as Record<string, string>,
    [availableAgents],
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
    setSelectedAgentId("");
    setModuleName("");
    setEditingModuleKey(null);
    setEditingModuleName("");
  }, [open, project]);

  // Populate staged members/modules from the server once per dialog open,
  // the first time both queries have resolved for this project.
  useEffect(() => {
    if (!open || !project) return;
    if (initializedProjectId.current === project.id) return;
    if (members.isLoading || modulesQuery.isLoading) return;
    setStagedMemberIds((members.data ?? []).map((m) => m.userId));
    setStagedMembers(
      (members.data ?? []).map((m) => ({
        userId: m.userId,
        name: m.name,
        email: m.email,
      })),
    );
    setStagedModules(
      (modulesQuery.data ?? []).map((m) => ({
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
    members.data,
    modulesQuery.isLoading,
    modulesQuery.data,
  ]);

  async function onSave() {
    if (!project) return;
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
    if (!selectedAgentId) return;
    const agent = (agents.data ?? []).find((a) => a.id === selectedAgentId);
    if (!agent) return;
    setStagedMemberIds((ids) => [...ids, agent.id]);
    setStagedMembers((rows) => [
      ...rows,
      { userId: agent.id, name: agent.name, email: agent.email },
    ]);
    setSelectedAgentId("");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Project summary{project ? ` · ${project.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            One save updates the name, the Manager, the members, and the
            modules together. Managers supervise and are not project members
            — only Agent users can be added as members.
          </DialogDescription>
        </DialogHeader>

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
            Members are Agent users. Managers supervise this project and are
            not listed here. Changes here are saved with the Save button
            below.
          </p>

          <div className="mb-3 flex gap-2">
            <Select
              value={selectedAgentId || null}
              onValueChange={(v) => setSelectedAgentId(v ?? "")}
              items={agentSelectItems}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an Agent to add" />
              </SelectTrigger>
              <SelectContent>
                {availableAgents.map((a) => (
                  <SelectItem key={a.id} value={a.id} label={a.name}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={onAddMember}
              disabled={!selectedAgentId}
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
                      colSpan={3}
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
              disabled={saveSummary.isPending}
            >
              {saveSummary.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
