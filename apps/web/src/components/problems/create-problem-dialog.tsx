import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { useCreateProblem } from "@/hooks/use-tickets";

const createProblemSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(120),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

type CreateProblemForm = z.infer<typeof createProblemSchema>;

export function CreateProblemDialog({
  triggerLabel = "New Problem",
}: {
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const createProblem = useCreateProblem();

  const form = useForm<CreateProblemForm>({
    resolver: zodResolver(createProblemSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  async function onSubmit(values: CreateProblemForm) {
    try {
      const created = await createProblem.mutateAsync({
        title: values.title,
        description: values.description,
      });
      toast.success(`Problem ${created.id.slice(0, 8)} created`);
      form.reset();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create problem",
      );
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
          <DialogTitle>Create problem</DialogTitle>
          <DialogDescription>
            Capture a recurring root cause for linked incidents.
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
              placeholder="What is recurring? Suspected cause?"
            />
            {form.formState.errors.description ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.description.message}
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
            <Button type="submit" disabled={createProblem.isPending}>
              {createProblem.isPending ? "Creating…" : "Create problem"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
