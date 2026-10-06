import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  slugifyTitle,
  useCreateKnowledgeCategory,
  useUpdateKnowledgeCategory,
} from "@/features/admin/hooks";
import type { KnowledgeCategory } from "@/features/admin/types";

const schema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

export function KnowledgeCategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: KnowledgeCategory | null;
}) {
  const createCategory = useCreateKnowledgeCategory();
  const updateCategory = useUpdateKnowledgeCategory();
  const isEdit = Boolean(category);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", description: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      category
        ? {
            name: category.name,
            slug: category.slug,
            description: category.description ?? "",
          }
        : { name: "", slug: "", description: "" },
    );
  }, [open, category, form]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({
          id: category.id,
          input: {
            name: values.name,
            slug: values.slug?.trim() || slugifyTitle(values.name),
            description: values.description?.trim() || undefined,
          },
        });
        toast.success("Category updated");
      } else {
        await createCategory.mutateAsync({
          name: values.name,
          slug: values.slug?.trim() || undefined,
          description: values.description?.trim() || undefined,
        });
        toast.success("Category created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  }

  const pending = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Categories group knowledge articles for Admin authoring and portal browse.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="kc-name">Name</Label>
            <Input
              id="kc-name"
              {...form.register("name")}
              onBlur={() => {
                const name = form.getValues("name");
                if (!form.getValues("slug")?.trim() && name) {
                  form.setValue("slug", slugifyTitle(name));
                }
              }}
            />
            {form.formState.errors.name ? (
              <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="kc-slug">Slug</Label>
            <Input id="kc-slug" {...form.register("slug")} placeholder="auto-from-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kc-desc">Description</Label>
            <Textarea id="kc-desc" rows={3} {...form.register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
