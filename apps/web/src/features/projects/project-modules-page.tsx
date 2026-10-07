import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function ProjectModulesPage() {
  const { id } = useParams<{ id: string }>();
  const modules = useProjectModules(id);
  const createModule = useCreateProjectModule(id ?? "");
  const updateModule = useUpdateProjectModule(id ?? "");
  const deleteModule = useDeleteProjectModule(id ?? "");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (!id) return null;

  async function onCreate() {
    if (!name.trim()) {
      toast.error("Module name is required");
      return;
    }
    try {
      await createModule.mutateAsync(name.trim());
      toast.success("Module created");
      setName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    }
  }

  async function onSaveEdit() {
    if (!editingId || !editName.trim()) return;
    try {
      await updateModule.mutateAsync({ id: editingId, name: editName.trim() });
      toast.success("Module updated");
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  async function onDelete(moduleId: string) {
    try {
      await deleteModule.mutateAsync(moduleId);
      toast.success("Module deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Modules belong to this project. Create the project first, then add
        modules here.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Module name"
          className="sm:max-w-xs"
        />
        <Button onClick={onCreate} disabled={createModule.isPending}>
          Add module
        </Button>
      </div>

      {modules.isLoading ? <Skeleton className="h-40" /> : null}
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
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(modules.data ?? []).map((mod) => (
              <TableRow key={mod.id}>
                <TableCell>
                  {editingId === mod.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="max-w-xs"
                    />
                  ) : (
                    mod.name
                  )}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  {editingId === mod.id ? (
                    <>
                      <Button size="sm" onClick={onSaveEdit}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(mod.id);
                          setEditName(mod.name);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(mod.id)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(modules.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  No modules yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
