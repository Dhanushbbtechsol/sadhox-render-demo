import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PriorityBadge } from "@/components/priority-badge";
import { ProjectModuleFields } from "@/components/projects/project-module-fields";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useIncidentCategoryTaxonomy } from "@/features/admin/hooks";
import { useAgents, useCreateIncident } from "@/hooks/use-tickets";
import { recordReference } from "@/lib/record-reference";
import { useAuthStore } from "@/stores/auth-store";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_MAP,
  calculatePriority,
  subcategoriesFor,
  type Impact,
  type Urgency,
} from "@/types/itsm";

const LEVELS = ["Low", "Medium", "High"] as const;
const NONE = "__none__";
const FALLBACK_CATEGORY = INCIDENT_CATEGORIES[0];
const FALLBACK_SUBCATEGORY = INCIDENT_CATEGORY_MAP[FALLBACK_CATEGORY][0];

function buildCreateIncidentSchema(
  requireProject: boolean,
  allowedByCategory: Record<string, string[]>,
) {
  return z
    .object({
      title: z.string().min(5, "Title must be at least 5 characters").max(120),
      description: z
        .string()
        .min(10, "Description must be at least 10 characters"),
      category: z.string().min(1, "Category is required"),
      subcategory: z.string().min(1, "Subcategory is required"),
      impact: z.enum(LEVELS),
      urgency: z.enum(LEVELS),
      projectId: z.string().uuid().optional(),
      moduleId: z.string().uuid().optional(),
      assignedTo: z.string().uuid().optional(),
    })
    .superRefine((values, ctx) => {
      const allowed = allowedByCategory[values.category] ?? [];
      if (!allowed.includes(values.subcategory)) {
        ctx.addIssue({
          code: "custom",
          path: ["subcategory"],
          message: "Subcategory must match the selected category",
        });
      }
      if (requireProject && !values.projectId) {
        ctx.addIssue({
          code: "custom",
          path: ["projectId"],
          message: "Select a project",
        });
      }
    });
}

type CreateIncidentForm = z.infer<ReturnType<typeof buildCreateIncidentSchema>>;

export function CreateIncidentDialog({
  triggerLabel = "New ticket",
}: {
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const createIncident = useCreateIncident();
  const taxonomy = useIncidentCategoryTaxonomy({ enabled: open });
  const role = useAuthStore((s) => s.user?.role);
  const requireProject = role === "Manager";

  const allowedByCategory = useMemo(() => {
    if (taxonomy.data && taxonomy.data.length > 0) {
      return Object.fromEntries(
        taxonomy.data.map((cat) => [
          cat.name,
          cat.subcategories.map((sub) => sub.name),
        ]),
      );
    }
    return Object.fromEntries(
      INCIDENT_CATEGORIES.map((cat) => [cat, [...subcategoriesFor(cat)]]),
    );
  }, [taxonomy.data]);

  const categoryOptions = useMemo(
    () => Object.keys(allowedByCategory),
    [allowedByCategory],
  );
  const defaultCategory = categoryOptions[0] ?? FALLBACK_CATEGORY;
  const defaultSubcategory =
    allowedByCategory[defaultCategory]?.[0] ?? FALLBACK_SUBCATEGORY;

  const minPriorityByPair = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const cat of taxonomy.data ?? []) {
      for (const sub of cat.subcategories) {
        map.set(`${cat.name}::${sub.name}`, sub.minPriority);
      }
    }
    return map;
  }, [taxonomy.data]);

  const schema = useMemo(
    () => buildCreateIncidentSchema(requireProject, allowedByCategory),
    [requireProject, allowedByCategory],
  );

  const form = useForm<CreateIncidentForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      category: defaultCategory,
      subcategory: defaultSubcategory,
      impact: "Medium",
      urgency: "Medium",
      projectId: undefined,
      moduleId: undefined,
      assignedTo: undefined,
    },
  });

  useEffect(() => {
    if (!open) return;
    const currentCategory = form.getValues("category");
    if (!categoryOptions.includes(currentCategory)) {
      form.setValue("category", defaultCategory);
      form.setValue("subcategory", defaultSubcategory);
    }
  }, [open, categoryOptions, defaultCategory, defaultSubcategory, form]);

  const impact = useWatch({ control: form.control, name: "impact" }) as Impact;
  const urgency = useWatch({ control: form.control, name: "urgency" }) as Urgency;
  const category = useWatch({
    control: form.control,
    name: "category",
  });
  const subcategory = useWatch({
    control: form.control,
    name: "subcategory",
  });
  const projectId = useWatch({ control: form.control, name: "projectId" });
  const canAssign =
    role === "Admin" ||
    ((role === "Agent" || role === "Manager") && !projectId);
  const { data: agents = [] } = useAgents(projectId, { enabled: canAssign });
  const agentItems = useMemo(
    () =>
      ({
        [NONE]: "Unassigned",
        ...Object.fromEntries(
          agents.map((agent) => [
            agent.id,
            `${agent.name} (${agent.openTicketCount} open)`,
          ]),
        ),
      }) as Record<string, string>,
    [agents],
  );
  const matrixPriority = calculatePriority(impact, urgency);
  const subcategoryFloor =
    minPriorityByPair.get(`${category}::${subcategory}`) ?? null;
  const priorityRank: Record<string, number> = {
    P1: 4,
    P2: 3,
    P3: 2,
    P4: 1,
  };
  const previewPriority =
    subcategoryFloor &&
    (priorityRank[subcategoryFloor] ?? 0) >
      (priorityRank[matrixPriority] ?? 0)
      ? (subcategoryFloor as typeof matrixPriority)
      : matrixPriority;
  const subcategoryOptions = allowedByCategory[category] ?? [];

  useEffect(() => {
    const current = form.getValues("subcategory");
    if (!subcategoryOptions.includes(current) && subcategoryOptions[0]) {
      form.setValue("subcategory", subcategoryOptions[0]);
    }
  }, [category, subcategoryOptions, form]);

  async function onSubmit(values: CreateIncidentForm) {
    try {
      const created = await createIncident.mutateAsync({
        title: values.title,
        description: values.description,
        category: values.category,
        subcategory: values.subcategory,
        impact: values.impact,
        urgency: values.urgency,
        projectId: values.projectId ?? null,
        moduleId: values.projectId ? (values.moduleId ?? null) : null,
        ...(canAssign && values.assignedTo
          ? { assignedTo: values.assignedTo }
          : {}),
      });
      toast.success(
        `Ticket ${recordReference(created.referenceCode)} created`,
        {
          description: `Priority ${created.priority} assigned automatically.`,
        },
      );
      form.reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create ticket");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {role === "EndUser" ? "Report a ticket" : "Create a ticket"}
          </DialogTitle>
          <DialogDescription>
            Priority is calculated from Impact × Urgency as you fill the form.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register("title")} placeholder="Short summary of the issue" />
            {form.formState.errors.title ? (
              <p className="text-destructive text-xs">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              {...form.register("description")}
              placeholder="What happened? Who is affected? Any workaround?"
            />
            {form.formState.errors.description ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>

          <ProjectModuleFields
            control={form.control}
            projectField="projectId"
            moduleField="moduleId"
            projectId={projectId}
            onProjectChange={() => {
              form.setValue("moduleId", undefined);
              if (canAssign) form.setValue("assignedTo", undefined);
            }}
          />
          {form.formState.errors.projectId ? (
            <p className="text-destructive text-xs">
              {form.formState.errors.projectId.message}
            </p>
          ) : null}

          {canAssign ? (
            <div className="space-y-2">
              <Label htmlFor="agents-select">Agents</Label>
              <Controller
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <Select
                    items={agentItems}
                    value={field.value ?? NONE}
                    onValueChange={(value) => {
                      field.onChange(
                        !value || value === NONE ? undefined : value,
                      );
                    }}
                  >
                    <SelectTrigger id="agents-select">
                      <SelectValue
                        placeholder={
                          agents.length === 0
                            ? projectId
                              ? "No project members"
                              : "No agents"
                            : "Unassigned"
                        }
                      >
                        {(value: string | null) =>
                          value && value in agentItems
                            ? agentItems[value]
                            : "Unassigned"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE} label="Unassigned">
                        Unassigned
                      </SelectItem>
                      {agents.map((agent) => (
                        <SelectItem
                          key={agent.id}
                          value={agent.id}
                          label={agentItems[agent.id]}
                        >
                          {agentItems[agent.id]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-muted-foreground text-xs">
                {projectId
                  ? "Pool is this project's Agent members."
                  : "Global Agent pool (no project)."}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) field.onChange(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Controller
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) field.onChange(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategoryOptions.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.subcategory ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.subcategory.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Impact</Label>
              <Controller
                control={form.control}
                name="impact"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) field.onChange(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Urgency</Label>
              <Controller
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) field.onChange(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="from-primary/10 via-accent/50 to-muted/40 space-y-1 rounded-xl border border-primary/10 bg-gradient-to-r px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">At least</span>
              <PriorityBadge priority={previewPriority} />
            </div>
            {subcategoryFloor && previewPriority === subcategoryFloor ? (
              <p className="text-muted-foreground text-xs">
                Subcategory floor {subcategoryFloor} — Response time follows that
                priority.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createIncident.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createIncident.isPending}>
              {createIncident.isPending
                ? "Submitting…"
                : role === "EndUser"
                  ? "Report a ticket"
                  : "Create a ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
