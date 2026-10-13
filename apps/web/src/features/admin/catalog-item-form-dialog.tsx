import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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

const formFieldSchema = z.object({
  name: z.string().min(1).max(64),
  label: z.string().min(1).max(128),
  type: z.enum(["text", "textarea", "select"]),
  required: z.boolean(),
  optionsText: z.string().optional(),
});

const catalogSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().min(1).max(4000),
  department: z.string().min(1).max(128),
  subcategory: z.string().max(128).optional(),
  isActive: z.boolean(),
  formFields: z.array(formFieldSchema).min(1),
});

type CatalogFormValues = z.infer<typeof catalogSchema>;

const DEFAULT_FIELDS: CatalogFormValues["formFields"] = [
  {
    name: "justification",
    label: "Justification",
    type: "textarea",
    required: true,
    optionsText: "",
  },
  {
    name: "urgency",
    label: "Urgency",
    type: "select",
    required: true,
    optionsText: "Low, Medium, High",
  },
];

function toFormValues(item?: ServiceCatalogItem | null): CatalogFormValues {
  if (!item) {
    return {
      name: "",
      description: "",
      department: "",
      subcategory: "",
      isActive: true,
      formFields: DEFAULT_FIELDS,
    };
  }
  return {
    name: item.name,
    description: item.description,
    department: item.department,
    subcategory: item.subcategory ?? "",
    isActive: item.isActive !== false,
    formFields: item.formFields.map((field) => ({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required !== false,
      optionsText: field.options?.join(", ") ?? "",
    })),
  };
}

function toPayload(values: CatalogFormValues) {
  const subcategory = values.subcategory?.trim() ?? "";
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    department: values.department.trim(),
    subcategory: subcategory.length > 0 ? subcategory : null,
    isActive: values.isActive,
    formFields: values.formFields.map((field) => ({
      name: field.name.trim(),
      label: field.label.trim(),
      type: field.type,
      required: field.required,
      ...(field.type === "select"
        ? {
            options: (field.optionsText ?? "")
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean),
          }
        : {}),
    })),
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

  const fields = useFieldArray({
    control: form.control,
    name: "formFields",
  });

  useEffect(() => {
    if (!open) return;
    form.reset(toFormValues(item));
  }, [form, item, open]);

  async function onSubmit(values: CatalogFormValues) {
    const payload = toPayload(values);
    try {
      if (isEdit && item) {
        await updateItem.mutateAsync({ id: item.id, input: payload });
        toast.success(`Updated ${payload.name}`);
      } else {
        await createItem.mutateAsync(payload);
        toast.success(`Created ${payload.name}`);
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
            Configure name, department (category), optional subcategory, active
            flag, and dynamic form fields.
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

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Form fields</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  fields.append({
                    name: `field${fields.fields.length + 1}`,
                    label: "New field",
                    type: "text",
                    required: true,
                    optionsText: "",
                  })
                }
              >
                Add field
              </Button>
            </div>

            {fields.fields.map((field, index) => (
              <div
                key={field.id}
                className="border-border/80 space-y-2 rounded-lg border p-3"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="name"
                    {...form.register(`formFields.${index}.name`)}
                  />
                  <Input
                    placeholder="label"
                    {...form.register(`formFields.${index}.label`)}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={form.watch(`formFields.${index}.type`)}
                    onValueChange={(value) =>
                      form.setValue(
                        `formFields.${index}.type`,
                        (value as "text" | "textarea" | "select") ?? "text",
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">text</SelectItem>
                      <SelectItem value="textarea">textarea</SelectItem>
                      <SelectItem value="select">select</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={
                      form.watch(`formFields.${index}.required`)
                        ? "true"
                        : "false"
                    }
                    onValueChange={(value) =>
                      form.setValue(
                        `formFields.${index}.required`,
                        value === "true",
                      )
                    }
                    items={{ true: "Required", false: "Optional" }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true" label="Required">
                        Required
                      </SelectItem>
                      <SelectItem value="false" label="Optional">
                        Optional
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.watch(`formFields.${index}.type`) === "select" ? (
                  <Input
                    placeholder="Options (comma-separated)"
                    {...form.register(`formFields.${index}.optionsText`)}
                  />
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={fields.fields.length <= 1}
                  onClick={() => fields.remove(index)}
                >
                  Remove field
                </Button>
              </div>
            ))}
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
