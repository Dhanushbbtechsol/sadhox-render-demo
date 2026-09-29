import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
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
import { useCreateIncident } from "@/hooks/use-tickets";
import {
  INCIDENT_CATEGORIES,
  calculatePriority,
  type Impact,
  type Urgency,
} from "@/types/itsm";

const LEVELS = ["Low", "Medium", "High"] as const;

const createIncidentSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(120),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(INCIDENT_CATEGORIES),
  impact: z.enum(LEVELS),
  urgency: z.enum(LEVELS),
});

type CreateIncidentForm = z.infer<typeof createIncidentSchema>;

export function CreateIncidentDialog({
  triggerLabel = "New Incident",
}: {
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const createIncident = useCreateIncident();

  const form = useForm<CreateIncidentForm>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "Software",
      impact: "Medium",
      urgency: "Medium",
    },
  });

  const impact = useWatch({ control: form.control, name: "impact" }) as Impact;
  const urgency = useWatch({ control: form.control, name: "urgency" }) as Urgency;
  const previewPriority = calculatePriority(impact, urgency);

  async function onSubmit(values: CreateIncidentForm) {
    try {
      const created = await createIncident.mutateAsync(values);
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
          <DialogTitle>Create incident</DialogTitle>
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

          <div className="grid gap-4 sm:grid-cols-3">
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
                      {INCIDENT_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

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
              {createIncident.isPending ? "Creating…" : "Create incident"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
