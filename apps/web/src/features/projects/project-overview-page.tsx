import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  useDeleteProject,
  useDirectoryUsers,
  useProject,
  useUpdateProject,
} from "./hooks";

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = useProject(id);
  const managers = useDirectoryUsers("Manager");
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");

  useEffect(() => {
    if (project.data) {
      setName(project.data.name);
      setManagerId(project.data.managerId ?? "");
    }
  }, [project.data]);

  if (!id) return null;
  if (project.isLoading) return <Skeleton className="h-40" />;
  if (!project.data) return null;

  async function onSave() {
    try {
      await updateProject.mutateAsync({
        id: id!,
        input: { name: name.trim(), managerId: managerId || null },
      });
      toast.success("Project updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  async function onDelete() {
    if (!confirm(`Delete project “${project.data?.name}”?`)) return;
    try {
      await deleteProject.mutateAsync(id!);
      toast.success("Project deleted");
      navigate("/admin/projects");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="grid max-w-xl gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Manager</Label>
        <Select
          items={[
            { value: "__none__", label: "No manager" },
            ...(managers.data ?? []).map((m) => ({
              value: m.id,
              label: `${m.name} (${m.email})`,
            })),
          ]}
          value={managerId || "__none__"}
          onValueChange={(v) => setManagerId(!v || v === "__none__" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Optional">
              {(value) => {
                if (!value || value === "__none__") return "No manager";
                const manager = managers.data?.find((m) => m.id === value);
                return manager
                  ? `${manager.name} (${manager.email})`
                  : "Loading…";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No manager</SelectItem>
            {(managers.data ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} ({m.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Managers supervise the project and are not added as members.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={updateProject.isPending}>
          Save
        </Button>
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={deleteProject.isPending}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
