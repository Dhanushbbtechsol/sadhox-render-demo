import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useCreateProject,
  useDirectoryUsers,
  useProjects,
} from "./hooks";

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const projects = useProjects();
  const managers = useDirectoryUsers("Manager");
  const createProject = useCreateProject();

  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = projects.data ?? [];
    if (!needle) return rows;
    return rows.filter((p) => p.name.toLowerCase().includes(needle));
  }, [projects.data, query]);

  const managerName = (id: string | null) => {
    if (!id) return "—";
    return managers.data?.find((m) => m.id === id)?.name ?? id.slice(0, 8);
  };

  async function onCreate() {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    try {
      const created = await createProject.mutateAsync({
        name: name.trim(),
        managerId: managerId || null,
      });
      toast.success(`Created ${created.name}`);
      setName("");
      setManagerId("");
      setCreating(false);
      navigate(`/admin/projects/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Create projects, assign Managers, and manage Agent members and
            modules.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setCreating((v) => !v)}>
          <PlusIcon />
          New project
        </Button>
      </div>

      {creating ? (
        <div className="grid gap-3 rounded-none border p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Corporate IT"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Manager</Label>
            <Select
              value={managerId || "__none__"}
              onValueChange={(v) => setManagerId(!v || v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No manager</SelectItem>
                {(managers.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onCreate} disabled={createProject.isPending}>
            Create
          </Button>
        </div>
      ) : null}

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search projects"
        className="md:max-w-xs"
      />

      {projects.isLoading ? <Skeleton className="h-64" /> : null}
      {projects.isError ? (
        <p className="text-destructive text-sm">
          {projects.error instanceof Error
            ? projects.error.message
            : "Failed to load projects"}
        </p>
      ) : null}

      {!projects.isLoading && !projects.isError ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link
                    to={`/admin/projects/${project.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell>{managerName(project.managerId)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(project.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No projects yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      ) : null}
<<<<<<< Updated upstream
=======

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Set a name and assign a Manager. You can add Agents and modules
              after creating.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Corporate IT"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onCreate();
                  }
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Manager</Label>
              <Select
                items={(managers.data ?? []).map((m) => ({
                  value: m.id,
                  label: m.name,
                }))}
                value={managerId || undefined}
                onValueChange={(v) => setManagerId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Manager" />
                </SelectTrigger>
                <SelectContent>
                  {(managers.data ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onCreate()}
              disabled={createProject.isPending}
            >
              {createProject.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
>>>>>>> Stashed changes
    </div>
  );
}
