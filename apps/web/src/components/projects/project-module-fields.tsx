import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

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

type RhfProps<T extends FieldValues> = {
  control: Control<T>;
  projectField: Path<T>;
  moduleField: Path<T>;
  projectId: string | undefined | null;
  onProjectChange?: (projectId: string | undefined) => void;
};

type ControlledProps = {
  projectId: string;
  moduleId: string;
  onProjectChange: (projectId: string) => void;
  onModuleChange: (moduleId: string) => void;
};

function isRhfProps<T extends FieldValues>(
  props: RhfProps<T> | ControlledProps,
): props is RhfProps<T> {
  return "control" in props && props.control != null;
}

/** Shared project → module cascading selects (RHF or controlled). */
export function ProjectModuleFields<T extends FieldValues>(
  props: RhfProps<T> | ControlledProps,
) {
  if (isRhfProps(props)) {
    return <RhfProjectModuleFields {...props} />;
  }
  return <ControlledProjectModuleFields {...props} />;
}

function RhfProjectModuleFields<T extends FieldValues>({
  control,
  projectField,
  moduleField,
  projectId,
  onProjectChange,
}: RhfProps<T>) {
  const { data: projects = [] } = useProjects();
  const { data: modules = [] } = useProjectModules(projectId);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Project</Label>
        <Controller
          control={control}
          name={projectField}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : NONE}
              onValueChange={(value) => {
                const next = !value || value === NONE ? undefined : value;
                field.onChange(next);
                onProjectChange?.(next);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional project…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No project (Admin unscoped)</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label>Module</Label>
        <Controller
          control={control}
          name={moduleField}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : NONE}
              disabled={!projectId}
              onValueChange={(value) => {
                field.onChange(!value || value === NONE ? undefined : value);
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    projectId ? "Optional module…" : "Select a project first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No module</SelectItem>
                {modules.map((mod) => (
                  <SelectItem key={mod.id} value={mod.id}>
                    {mod.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </div>
  );
}

function ControlledProjectModuleFields({
  projectId,
  moduleId,
  onProjectChange,
  onModuleChange,
}: ControlledProps) {
  const { data: projects = [] } = useProjects();
  const { data: modules = [] } = useProjectModules(projectId || undefined);

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
            {projects.map((project) => (
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
            {modules.map((mod) => (
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
