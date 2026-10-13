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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateCatalogItem,
  useUpdateCatalogItem,
} from "@/hooks/use-service-catalog";
import type { ServiceCatalogItem } from "@/types/api";

const catalogSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().min(1).max(4000),
  department: z.string().min(1).max(128),
  subcategory: z.string().max(128).optional(),
  isActive: z.boolean(),
});

type CatalogFormValues = z.infer<typeof catalogSchema>;

function toFormValues(item?: ServiceCatalogItem | null): CatalogFormValues {
  if (!item) {
    return {
      name: "",
      description: "",
      department: "",
      subcategory: "",
      isActive: true,
    };
  }
  return {
    name: item.name,
    description: item.description,
    department: item.department,
    subcategory: item.subcategory ?? "",
    isActive: item.isActive !== false,
  };
}

export function CatalogItemFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ServiceCatalogItem | null;
}) {
  const createItem = useCreateCatalogItem();
  const updateItem = useUpdateCatalogItem();
  const isEdit = Boolean(item);

  const form = useForm<CatalogFormValues>({
    resolver: zodResolver(catalogSchema),
    defaultValues: toFormValues(item),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(toFormValues(item));
  }, [form, item, open]);

  async function onSubmit(values: CatalogFormValues) {
    const subcategory = values.subcategory?.trim() ?? "";
    const base = {
      name: values.name.trim(),
      description: values.description.trim(),
      department: values.department.trim(),
      subcategory: subcategory.length > 0 ? subcategory : null,
      isActive: values.isActive,
    };
    try {
      if (isEdit && item) {
        await updateItem.mutateAsync({ id: item.id, input: base });
        toast.success(`Updated ${base.name}`);
      } else {
        await createItem.mutateAsync({ ...base, formFields: [] });
        toast.success(`Created ${base.name}`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  }

  const pending = createItem.isPending || updateItem.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit catalog item" : "New catalog item"}
          </DialogTitle>
          <DialogDescription>
            Configure name, department (category), optional subcategory, and
            active flag.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="space-y-2">
            <Label htmlFor="catalog-name">Name</Label>
            <Input id="catalog-name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="catalog-department">Department (category)</Label>
            <Input id="catalog-department" {...form.register("department")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="catalog-subcategory">Subcategory (optional)</Label>
            <Input
              id="catalog-subcategory"
              placeholder="e.g. Laptop request"
              {...form.register("subcategory")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="catalog-description">Description</Label>
            <Textarea
              id="catalog-description"
              rows={3}
              {...form.register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label>Active</Label>
            <Select
              value={form.watch("isActive") ? "true" : "false"}
              onValueChange={(value) =>
                form.setValue("isActive", value === "true")
              }
              items={{
                true: "Active (visible in catalog)",
                false: "Inactive (hidden from browse)",
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true" label="Active (visible in catalog)">
                  Active (visible in catalog)
                </SelectItem>
                <SelectItem value="false" label="Inactive (hidden from browse)">
                  Inactive (hidden from browse)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Create item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
