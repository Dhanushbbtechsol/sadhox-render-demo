import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectModules, useProjects } from "@/hooks/use-projects";

const NONE = "__none__";

export function ProjectModuleFields({
  projectId,
  moduleId,
  onProjectChange,
  onModuleChange,
}: {
  projectId: string;
  moduleId: string;
  onProjectChange: (projectId: string) => void;
  onModuleChange: (moduleId: string) => void;
}) {
  const projects = useProjects();
  const modules = useProjectModules(projectId || undefined);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Project (optional)</Label>
        <Select
          value={projectId || NONE}
          onValueChange={(value) => {
            const next = value === NONE || !value ? "" : value;
            onProjectChange(next);
            onModuleChange("");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="No project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No project</SelectItem>
            {(projects.data ?? []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Module (optional)</Label>
        <Select
          value={moduleId || NONE}
          onValueChange={(value) => {
            onModuleChange(value === NONE || !value ? "" : value);
          }}
          disabled={!projectId}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={projectId ? "No module" : "Select a project first"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No module</SelectItem>
            {(modules.data ?? []).map((mod) => (
              <SelectItem key={mod.id} value={mod.id}>
                {mod.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
