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

import {
  useDeleteProject,
  useDirectoryUsers,
  useUpdateProject,
} from "./hooks";
import type { Project } from "./types";

type ProjectEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
};

export function ProjectEditDialog({
  open,
  onOpenChange,
  project,
}: ProjectEditDialogProps) {
  const managers = useDirectoryUsers("Manager");
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");

  const managerOptions = managers.data ?? [];
  const managerSelectItems = useMemo(
    () =>
      Object.fromEntries(managerOptions.map((m) => [m.id, m.name])) as Record<
        string,
        string
      >,
    [managerOptions],
  );

  useEffect(() => {
    if (!open || !project) return;
    setName(project.name);
    setManagerId(project.managerId ?? "");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update the name or assigned Manager. Managers supervise and are not
            project members.
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onSave();
                }
              }}
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

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onDelete()}
            disabled={deleteProject.isPending}
          >
            {deleteProject.isPending ? "Deleting…" : "Delete"}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
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
