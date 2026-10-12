import { PencilIcon, PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { ListPagination, paginateItems } from "@/components/list-pagination";
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

import { useCreateProject, useDirectoryUsers, useProjects } from "./hooks";
import { ProjectEditDialog } from "./project-edit-dialog";
import type { Project } from "./types";

type ActiveDialog = "create" | "edit" | null;

export default function ProjectsListPage() {
  const projects = useProjects();
  const managers = useDirectoryUsers("Manager");
  const createProject = useCreateProject();
  const navigate = useNavigate();
  const { id: routeProjectId } = useParams<{ id: string }>();

  const [query, setQuery] = useState("");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");

  // Opening /admin/projects/:id shows that project's summary dialog.
  useEffect(() => {
    if (!routeProjectId || projects.isLoading) return;
    const found = (projects.data ?? []).find((p) => p.id === routeProjectId);
    if (found) {
      setSelectedProject(found);
      setActiveDialog("edit");
    } else {
      navigate("/admin/projects", { replace: true });
    }
  }, [routeProjectId, projects.data, projects.isLoading, navigate]);

  const managerOptions = managers.data ?? [];

  /** Base UI Select.Value shows raw UUID unless Root `items` maps value → label. */
  const managerSelectItems = useMemo(
    () =>
      Object.fromEntries(managerOptions.map((m) => [m.id, m.name])) as Record<
        string,
        string
      >,
    [managerOptions],
  );

  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = projects.data ?? [];
    if (!needle) return rows;
    return rows.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.managerName ?? "").toLowerCase().includes(needle),
    );
  }, [projects.data, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const paged = paginateItems(filtered, page);

  const resolveManagerLabel = (
    id: string | null,
    fallbackName?: string | null,
  ) => {
    if (fallbackName) return fallbackName;
    if (!id) return "—";
    return managerOptions.find((m) => m.id === id)?.name ?? "—";
  };

  function resetCreateForm() {
    setName("");
    setManagerId("");
  }

  function openCreate() {
    resetCreateForm();
    setSelectedProject(null);
    setActiveDialog("create");
  }

  function openSummary(project: Project) {
    navigate(`/admin/projects/${project.id}`);
  }

  function closeSummary(open: boolean) {
    if (open) return;
    setActiveDialog(null);
    setSelectedProject(null);
    if (routeProjectId) {
      navigate("/admin/projects", { replace: true });
    }
  }

  async function onCreate() {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!managerId) {
      toast.error("Manager is required");
      return;
    }
    try {
      const created = await createProject.mutateAsync({
        name: name.trim(),
        managerId,
      });
      toast.success(`Created ${created.name}`);
      setActiveDialog(null);
      resetCreateForm();
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
            Create a project, then open it to manage its name, Manager,
            members, and modules.
          </p>
        </div>
        <Button className="shrink-0" onClick={openCreate}>
          <PlusIcon />
          New project
        </Button>
      </div>

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
        <div className="flex flex-col gap-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.items.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      className="text-left hover:underline"
                      onClick={() => openSummary(project)}
                    >
                      {project.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    {resolveManagerLabel(project.managerId, project.managerName)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {project.createdAt
                      ? new Date(project.createdAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openSummary(project)}
                      >
                        <PencilIcon />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No projects yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <ListPagination
            page={paged.page}
            totalPages={paged.totalPages}
            total={paged.total}
            onPageChange={setPage}
            label="projects"
          />
        </div>
      ) : null}

      <Dialog
        open={activeDialog === "create"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDialog(null);
            resetCreateForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Set a name and assign a Manager. Open it afterward to add
              members and modules.
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
              {managers.isLoading ? (
                <p className="text-muted-foreground text-xs">
                  Loading managers…
                </p>
              ) : null}
              {!managers.isLoading && managerOptions.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No Manager users found. Seed `manager@sadhox.local` first.
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveDialog(null);
                resetCreateForm();
              }}
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

      <ProjectEditDialog
        open={activeDialog === "edit"}
        onOpenChange={closeSummary}
        project={selectedProject}
      />
    </div>
  );
}
