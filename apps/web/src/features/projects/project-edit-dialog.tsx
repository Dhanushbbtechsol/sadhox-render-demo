import { PencilIcon, PlusIcon, Trash2Icon, UserMinusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useAddProjectMember,
  useCreateProjectModule,
  useDeleteProject,
  useDeleteProjectModule,
  useDirectoryUsers,
  useProjectMembers,
  useProjectModules,
  useRemoveProjectMember,
  useUpdateProject,
  useUpdateProjectModule,
} from "./hooks";
import type { Project } from "./types";

type ProjectEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
};

/**
 * U8 — the project summary. Shows and saves name, manager, members, and
 * modules in one place (Edit / Members / Modules dialogs are retired).
 * KTD6: members are Agent users only; Managers supervise, they are never
 * project members.
 */
export function ProjectEditDialog({
  open,
  onOpenChange,
  project,
}: ProjectEditDialogProps) {
  const projectId = open ? project?.id : undefined;
  const managers = useDirectoryUsers("Manager");
  const agents = useDirectoryUsers("Agent");
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const members = useProjectMembers(projectId);
  const addMember = useAddProjectMember(projectId ?? "");
  const removeMember = useRemoveProjectMember(projectId ?? "");

  const modulesQuery = useProjectModules(projectId);
  const createModule = useCreateProjectModule(projectId ?? "");
  const updateModule = useUpdateProjectModule(projectId ?? "");
  const deleteModule = useDeleteProjectModule(projectId ?? "");

  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleName, setEditingModuleName] = useState("");

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
    const taken = new Set((members.data ?? []).map((m) => m.userId));
    return (agents.data ?? []).filter((a) => !taken.has(a.id));
  }, [agents.data, members.data]);

  const agentSelectItems = useMemo(
    () =>
      Object.fromEntries(
        availableAgents.map((a) => [a.id, a.name]),
      ) as Record<string, string>,
    [availableAgents],
  );

  useEffect(() => {
    if (!open || !project) return;
    setName(project.name);
    setManagerId(project.managerId ?? "");
    setSelectedAgentId("");
    setModuleName("");
    setEditingModuleId(null);
    setEditingModuleName("");
  }, [open, project]);

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
    try {
      await updateProject.mutateAsync({
        id: project.id,
        input: { name: name.trim(), managerId },
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

  async function onAddMember() {
    if (!selectedAgentId) return;
    try {
      await addMember.mutateAsync(selectedAgentId);
      toast.success("Member added");
      setSelectedAgentId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Add failed");
    }
  }

  async function onRemoveMember(userId: string) {
    try {
      await removeMember.mutateAsync(userId);
      toast.success("Member removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Remove failed");
    }
  }

  async function onAddModule() {
    if (!moduleName.trim()) {
      toast.error("Module name is required");
      return;
    }
    try {
      await createModule.mutateAsync(moduleName.trim());
      toast.success("Module added");
      setModuleName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Add failed");
    }
  }

  function startEditModule(id: string, currentName: string) {
    setEditingModuleId(id);
    setEditingModuleName(currentName);
  }

  async function onSaveModule() {
    if (!editingModuleId) return;
    if (!editingModuleName.trim()) {
      toast.error("Module name is required");
      return;
    }
    try {
      await updateModule.mutateAsync({
        id: editingModuleId,
        name: editingModuleName.trim(),
      });
      toast.success("Module updated");
      setEditingModuleId(null);
      setEditingModuleName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  async function onDeleteModule(moduleId: string, currentName: string) {
    if (!confirm(`Delete module “${currentName}”?`)) return;
    try {
      await deleteModule.mutateAsync(moduleId);
      toast.success("Module deleted");
      if (editingModuleId === moduleId) {
        setEditingModuleId(null);
        setEditingModuleName("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Project summary{project ? ` · ${project.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            Update the name, Manager, members, and modules together. Managers
            supervise and are not project members — only Agent users can be
            added as members.
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
            not listed here.
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
              onClick={() => void onAddMember()}
              disabled={!selectedAgentId || addMember.isPending}
            >
              <PlusIcon />
              Add
            </Button>
          </div>

          {members.isLoading ? <Skeleton className="h-20" /> : null}
          {members.isError ? (
            <p className="text-destructive text-sm">
              {members.error instanceof Error
                ? members.error.message
                : "Failed to load members"}
            </p>
          ) : null}
          {!members.isLoading && !members.isError ? (
            <Table>
              <TableBody>
                {(members.data ?? []).map((m) => (
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
                        onClick={() => void onRemoveMember(m.userId)}
                        disabled={removeMember.isPending}
                        aria-label={`Remove ${m.name}`}
                      >
                        <UserMinusIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(members.data ?? []).length === 0 ? (
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
                  void onAddModule();
                }
              }}
            />
            <Button
              type="button"
              onClick={() => void onAddModule()}
              disabled={createModule.isPending}
            >
              <PlusIcon />
              Add
            </Button>
          </div>

          {modulesQuery.isLoading ? <Skeleton className="h-20" /> : null}
          {modulesQuery.isError ? (
            <p className="text-destructive text-sm">
              {modulesQuery.error instanceof Error
                ? modulesQuery.error.message
                : "Failed to load modules"}
            </p>
          ) : null}
          {!modulesQuery.isLoading && !modulesQuery.isError ? (
            <Table>
              <TableBody>
                {(modulesQuery.data ?? []).map((mod) => (
                  <TableRow key={mod.id}>
                    <TableCell className="font-medium">
                      {editingModuleId === mod.id ? (
                        <Input
                          value={editingModuleName}
                          onChange={(e) =>
                            setEditingModuleName(e.target.value)
                          }
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void onSaveModule();
                            }
                          }}
                        />
                      ) : (
                        mod.name
                      )}
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      {editingModuleId === mod.id ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void onSaveModule()}
                          disabled={updateModule.isPending}
                        >
                          Save
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditModule(mod.id, mod.name)}
                        >
                          <PencilIcon />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void onDeleteModule(mod.id, mod.name)}
                        disabled={deleteModule.isPending}
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(modulesQuery.data ?? []).length === 0 ? (
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
              disabled={updateProject.isPending}
            >
              {updateProject.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
