import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PriorityBadge } from "@/components/priority-badge";
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
import { useAgents, useCreateIncident } from "@/hooks/use-tickets";
import { useAuthStore } from "@/stores/auth-store";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_MAP,
  calculatePriority,
  subcategoriesFor,
  type Impact,
  type IncidentCategory,
  type Urgency,
} from "@/types/itsm";

const LEVELS = ["Low", "Medium", "High"] as const;
const NONE = "__none__";
const DEFAULT_CATEGORY = INCIDENT_CATEGORIES[0] as IncidentCategory;
const DEFAULT_SUBCATEGORY = INCIDENT_CATEGORY_MAP[DEFAULT_CATEGORY][0];

const createIncidentSchema = z
  .object({
    title: z.string().min(5, "Title must be at least 5 characters").max(120),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters"),
    category: z.enum(
      INCIDENT_CATEGORIES as [IncidentCategory, ...IncidentCategory[]],
    ),
    subcategory: z.string().min(1, "Subcategory is required"),
    impact: z.enum(LEVELS),
    urgency: z.enum(LEVELS),
    assignedTo: z.string().uuid().optional(),
  })
  .superRefine((values, ctx) => {
    const allowed = subcategoriesFor(values.category);
    if (!allowed.includes(values.subcategory)) {
      ctx.addIssue({
        code: "custom",
        path: ["subcategory"],
        message: "Subcategory must match the selected category",
      });
    }
  });

type CreateIncidentForm = z.infer<typeof createIncidentSchema>;

export function CreateIncidentDialog({
  triggerLabel = "New Incident",
}: {
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const createIncident = useCreateIncident();
  const role = useAuthStore((s) => s.user?.role);
  const canAssign =
    role === "Admin" || role === "Agent" || role === "Manager";

  const form = useForm<CreateIncidentForm>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      title: "",
      description: "",
      category: DEFAULT_CATEGORY,
      subcategory: DEFAULT_SUBCATEGORY,
      impact: "Medium",
      urgency: "Medium",
      assignedTo: undefined,
    },
  });

  const impact = useWatch({ control: form.control, name: "impact" }) as Impact;
  const urgency = useWatch({ control: form.control, name: "urgency" }) as Urgency;
  const category = useWatch({
    control: form.control,
    name: "category",
  }) as IncidentCategory;
  const { data: agents = [] } = useAgents(undefined, { enabled: canAssign });
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
  const previewPriority = calculatePriority(impact, urgency);
  const subcategoryOptions = subcategoriesFor(category);

  useEffect(() => {
    const current = form.getValues("subcategory");
    if (!subcategoryOptions.includes(current)) {
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
        ...(canAssign && values.assignedTo
          ? { assignedTo: values.assignedTo }
          : {}),
      });
      toast.success(`Incident ${created.id} created`, {
        description: `Priority ${created.priority} assigned automatically.`,
      });
      form.reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create incident");
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
            {role === "EndUser" ? "Report incident" : "Create incident"}
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
                          agents.length === 0 ? "No agents" : "Unassigned"
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
                Global Agent pool.
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
                      {INCIDENT_CATEGORIES.map((cat) => (
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

          <div className="from-primary/10 via-accent/50 to-muted/40 flex items-center justify-between rounded-xl border border-primary/10 bg-gradient-to-r px-4 py-3">
            <span className="text-muted-foreground text-sm">Priority preview</span>
            <PriorityBadge priority={previewPriority} />
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
                  ? "Report incident"
                  : "Create incident"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
