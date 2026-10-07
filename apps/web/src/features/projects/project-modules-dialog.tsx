import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
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
  useCreateProjectModule,
  useDeleteProjectModule,
  useProjectModules,
  useUpdateProjectModule,
} from "./hooks";
import type { Project } from "./types";

type ProjectModulesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
};

export function ProjectModulesDialog({
  open,
  onOpenChange,
  project,
}: ProjectModulesDialogProps) {
  const projectId = open ? project?.id : undefined;
  const modules = useProjectModules(projectId);
  const createModule = useCreateProjectModule(projectId ?? "");
  const updateModule = useUpdateProjectModule(projectId ?? "");
  const deleteModule = useDeleteProjectModule(projectId ?? "");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moduleName, setModuleName] = useState("");

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setModuleName("");
  }

  function openCreate() {
    setEditingId(null);
    setModuleName("");
    setFormOpen(true);
  }

  function openEdit(id: string, name: string) {
    setEditingId(id);
    setModuleName(name);
    setFormOpen(true);
  }

  async function onSave() {
    if (!moduleName.trim()) {
      toast.error("Module name is required");
      return;
    }
    try {
      if (editingId) {
        await updateModule.mutateAsync({
          id: editingId,
          name: moduleName.trim(),
        });
        toast.success("Module updated");
      } else {
        await createModule.mutateAsync(moduleName.trim());
        toast.success("Module added");
      }
      closeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  }

  async function onDelete(moduleId: string, name: string) {
    if (!confirm(`Delete module “${name}”?`)) return;
    try {
      await deleteModule.mutateAsync(moduleId);
      toast.success("Module deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  const saving = createModule.isPending || updateModule.isPending;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) closeForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Modules{project ? ` · ${project.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Modules group work inside a project (for example Networking or
              Access). Add them after the project exists.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-1">
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={openCreate}>
                <PlusIcon />
                Add module
              </Button>
            </div>

            {modules.isLoading ? <Skeleton className="h-32" /> : null}
            {modules.isError ? (
              <p className="text-destructive text-sm">
                {modules.error instanceof Error
                  ? modules.error.message
                  : "Failed to load modules"}
              </p>
            ) : null}

            {!modules.isLoading && !modules.isError ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-36" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(modules.data ?? []).map((mod) => (
                    <TableRow key={mod.id}>
                      <TableCell className="font-medium">{mod.name}</TableCell>
                      <TableCell className="space-x-1 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(mod.id, mod.name)}
                        >
                          <PencilIcon />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void onDelete(mod.id, mod.name)}
                          disabled={deleteModule.isPending}
                        >
                          <Trash2Icon />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(modules.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-muted-foreground text-sm"
                      >
                        No modules yet. Click Add module to create one.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={formOpen}
        onOpenChange={(next) => {
          if (!next) closeForm();
          else setFormOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit module" : "Add module"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? `Rename a module in ${project?.name ?? "this project"}.`
                : `Create a module under ${project?.name ?? "this project"}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5 py-2">
            <Label htmlFor="module-name">Name</Label>
            <Input
              id="module-name"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              placeholder="Networking"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onSave();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onSave()}
              disabled={saving}
            >
              {saving ? "Saving…" : editingId ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
