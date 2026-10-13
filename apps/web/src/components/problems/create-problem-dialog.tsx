import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProjects } from "@/hooks/use-projects";
import { useCreateProblem, useIncidents } from "@/hooks/use-tickets";
import { recordReference } from "@/lib/record-reference";

const createProblemSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(120),
  description: z.string().min(10, "Description must be at least 10 characters"),
  incidentIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one related ticket"),
});

type CreateProblemForm = z.infer<typeof createProblemSchema>;

function defaultIncidentIds(defaultIncidentId?: string) {
  return defaultIncidentId ? [defaultIncidentId] : [];
}

export function CreateProblemDialog({
  triggerLabel = "New issue",
  defaultIncidentId,
  triggerSize,
  triggerVariant,
}: {
  triggerLabel?: string;
  /** Pre-select when opened from an incident context. */
  defaultIncidentId?: string;
  triggerSize?: "default" | "sm";
  triggerVariant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const createProblem = useCreateProblem();
  const { data: incidentPage, isLoading: loadingIncidents } = useIncidents({
    pageSize: 100,
  });
  const { data: projects = [] } = useProjects();

  const form = useForm<CreateProblemForm>({
    resolver: zodResolver(createProblemSchema),
    defaultValues: {
      title: "",
      description: "",
      incidentIds: defaultIncidentIds(defaultIncidentId),
    },
  });

  const incidentIds = form.watch("incidentIds");

  const incidentOptions = useMemo(() => {
    const rows = incidentPage?.data ?? [];
    return [...rows].sort((a, b) => a.title.localeCompare(b.title));
  }, [incidentPage?.data]);

  const selectedIncidents = useMemo(
    () => incidentOptions.filter((row) => incidentIds.includes(row.id)),
    [incidentIds, incidentOptions],
  );

  const scopeConflict = useMemo(() => {
    if (selectedIncidents.length < 2) return false;
    const first = selectedIncidents[0]!;
    return selectedIncidents.some(
      (row) =>
        row.projectId !== first.projectId || row.moduleId !== first.moduleId,
    );
  }, [selectedIncidents]);

  const projectLabel = useMemo(() => {
    const first = selectedIncidents[0];
    if (!first?.projectId) return null;
    const project = projects.find((p) => p.id === first.projectId);
    return project?.name ?? first.projectId.slice(0, 8);
  }, [projects, selectedIncidents]);

  async function onSubmit(values: CreateProblemForm) {
    if (scopeConflict) {
      toast.error(
        "Selected tickets must share the same project and module",
      );
      return;
    }
    try {
      const created = await createProblem.mutateAsync({
        title: values.title,
        description: values.description,
        linkedIncidentIds: values.incidentIds,
      });
      toast.success(
        `Issue ${recordReference(created.referenceCode)} created`,
      );
      form.reset({
        title: "",
        description: "",
        incidentIds: defaultIncidentIds(defaultIncidentId),
      });
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create issue",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          form.setValue("incidentIds", defaultIncidentIds(defaultIncidentId));
        }
      }}
    >
      <DialogTrigger
        render={
          <Button size={triggerSize} variant={triggerVariant} />
        }
      >
        <PlusIcon />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create issue</DialogTitle>
          <DialogDescription>
            Link one or more related tickets. The issue inherits their
            shared project when set; unscoped tickets stay in the global Agent
            pool.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="problem-title">Title</Label>
            <Input
              id="problem-title"
              {...form.register("title")}
              placeholder="Root-cause summary"
            />
            {form.formState.errors.title ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="problem-description">Description</Label>
            <Textarea
              id="problem-description"
              rows={4}
              {...form.register("description")}
              placeholder="What keeps happening? Why is it a problem now?"
            />
            {form.formState.errors.description ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label id="problem-incidents-label">Related tickets</Label>
            <Controller
              control={form.control}
              name="incidentIds"
              render={({ field }) => (
                <div
                  role="group"
                  aria-labelledby="problem-incidents-label"
                  className="border-border/80 max-h-56 space-y-2 overflow-y-auto rounded-xl border p-2"
                >
                  {loadingIncidents ? (
                    <p className="text-muted-foreground px-1 py-2 text-sm">
                      Loading tickets…
                    </p>
                  ) : incidentOptions.length === 0 ? (
                    <p className="text-muted-foreground px-1 py-2 text-sm">
                      No tickets available to link. Report a ticket first.
                    </p>
                  ) : (
                    incidentOptions.map((incident) => {
                      const checked = field.value.includes(incident.id);
                      const label = `${incident.title} · ${incident.status} · ${incident.priority}`;
                      return (
                        <label
                          key={incident.id}
                          className="border-border/80 hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              const on = next === true;
                              if (on) {
                                field.onChange([...field.value, incident.id]);
                              } else {
                                field.onChange(
                                  field.value.filter((id) => id !== incident.id),
                                );
                              }
                            }}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 text-sm leading-snug">
                            {label}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            />
            {form.formState.errors.incidentIds ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.incidentIds.message}
              </p>
            ) : null}
            {scopeConflict ? (
              <p className="text-destructive text-xs">
                Selected tickets must belong to the same project and module.
              </p>
            ) : selectedIncidents.length > 0 && projectLabel ? (
              <p className="text-muted-foreground text-xs">
                Project scope: {projectLabel}
                {selectedIncidents[0]?.moduleId
                  ? " (module from ticket)"
                  : null}
                {selectedIncidents.length > 1
                  ? ` · ${selectedIncidents.length} tickets selected`
                  : null}
              </p>
            ) : selectedIncidents.length > 0 &&
              !selectedIncidents[0]?.projectId ? (
              <p className="text-muted-foreground text-xs">
                No project on selection — the issue will stay in the global
                (unscoped) Agent pool
                {selectedIncidents.length > 1
                  ? ` · ${selectedIncidents.length} tickets selected`
                  : null}
                .
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createProblem.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProblem.isPending || scopeConflict}
            >
              {createProblem.isPending ? "Creating…" : "Create issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
