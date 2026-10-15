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
import { useAuthStore } from "@/stores/auth-store";

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
  /** When true, project is required even for Admin/Agent/EndUser. */
  requireProject?: boolean;
};

function isRhfProps<T extends FieldValues>(
  props: RhfProps<T> | ControlledProps,
): props is RhfProps<T> {
  return "control" in props && props.control != null;
}

/** Admin/EndUser may leave project blank; Manager must pick a project. */
function useAllowUnscopedProject() {
  const role = useAuthStore((s) => s.user?.role);
  return role === "Admin" || role === "EndUser";
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
  const allowUnscoped = useAllowUnscopedProject();

  const projectItems = {
    ...(allowUnscoped ? { [NONE]: "Select" } : {}),
    ...Object.fromEntries(projects.map((project) => [project.id, project.name])),
  } as Record<string, string>;
  const moduleItems = {
    [NONE]: "Select",
    ...Object.fromEntries(modules.map((mod) => [mod.id, mod.name])),
  } as Record<string, string>;

  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{allowUnscoped ? "Project (optional)" : "Project"}</Label>
          <Controller
            control={control}
            name={projectField}
            render={({ field }) => (
              <Select
                items={projectItems}
                value={
                  field.value
                    ? String(field.value)
                    : allowUnscoped
                      ? NONE
                      : undefined
                }
                onValueChange={(value) => {
                  const next = !value || value === NONE ? undefined : value;
                  field.onChange(next);
                  onProjectChange?.(next);
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      allowUnscoped ? "Select" : "Select a project…"
                    }
                  >
                    {(value: string | null) =>
                      value && value in projectItems
                        ? projectItems[value]
                        : allowUnscoped
                          ? "Select"
                          : "Select a project…"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allowUnscoped ? (
                    <SelectItem value={NONE} label="Select">
                      Select
                    </SelectItem>
                  ) : null}
                  {projects.map((project) => (
                    <SelectItem
                      key={project.id}
                      value={project.id}
                      label={project.name}
                    >
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Module (optional)</Label>
          <Controller
            control={control}
            name={moduleField}
            render={({ field }) => (
              <Select
                items={moduleItems}
                value={field.value ? String(field.value) : NONE}
                disabled={!projectId}
                onValueChange={(value) => {
                  field.onChange(!value || value === NONE ? undefined : value);
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      projectId ? "Select" : "Select a project first"
                    }
                  >
                    {(value: string | null) =>
                      value && value in moduleItems
                        ? moduleItems[value]
                        : projectId
                          ? "Select"
                          : "Select a project first"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE} label="Select">
                    Select
                  </SelectItem>
                  {modules.map((mod) => (
                    <SelectItem key={mod.id} value={mod.id} label={mod.name}>
                      {mod.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        {allowUnscoped
          ? "Leave blank to keep the ticket under All projects. Pick a project to scope it."
          : "Managers must link the ticket to a project they own."}
      </p>
    </div>
  );
}

function ControlledProjectModuleFields({
  projectId,
  moduleId,
  onProjectChange,
  onModuleChange,
  requireProject = false,
}: ControlledProps) {
  const { data: projects = [] } = useProjects();
  const { data: modules = [] } = useProjectModules(projectId || undefined);
  const allowUnscoped = useAllowUnscopedProject() && !requireProject;

  const projectItems = {
    ...(allowUnscoped ? { [NONE]: "Select" } : {}),
    ...Object.fromEntries(projects.map((project) => [project.id, project.name])),
  } as Record<string, string>;
  const moduleItems = {
    [NONE]: "Select",
    ...Object.fromEntries(modules.map((mod) => [mod.id, mod.name])),
  } as Record<string, string>;

  return (
    <div className="space-y-1.5">
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>{allowUnscoped ? "Project (optional)" : "Project"}</Label>
        <Select
          items={projectItems}
          value={projectId || (allowUnscoped ? NONE : undefined)}
          onValueChange={(value) => {
            const next = value === NONE || !value ? "" : value;
            onProjectChange(next);
            onModuleChange("");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={allowUnscoped ? "Select" : "Select a project…"}
            >
              {(value: string | null) =>
                value && value in projectItems
                  ? projectItems[value]
                  : allowUnscoped
                    ? "Select"
                    : "Select a project…"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {allowUnscoped ? (
              <SelectItem value={NONE} label="Select">
                Select
              </SelectItem>
            ) : null}
            {projects.map((project) => (
              <SelectItem
                key={project.id}
                value={project.id}
                label={project.name}
              >
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Module (optional)</Label>
        <Select
          items={moduleItems}
          value={moduleId || NONE}
          onValueChange={(value) => {
            onModuleChange(value === NONE || !value ? "" : value);
          }}
          disabled={!projectId}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={projectId ? "Select" : "Select a project first"}
            >
              {(value: string | null) =>
                value && value in moduleItems
                  ? moduleItems[value]
                  : projectId
                    ? "Select"
                    : "Select a project first"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE} label="Select">
              Select
            </SelectItem>
            {modules.map((mod) => (
              <SelectItem key={mod.id} value={mod.id} label={mod.name}>
                {mod.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
      {requireProject ? (
        <p className="text-muted-foreground text-xs">
          Pick a project so its Manager can review this change request.
        </p>
      ) : null}
    </div>
  );
}
