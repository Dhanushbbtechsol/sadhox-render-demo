import { useForm } from "@tanstack/react-form";
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
import { useCreateServiceRequest } from "@/hooks/use-service-requests";
import type { ServiceCatalogItem, Urgency } from "@/types/api";

function buildSchema(item: ServiceCatalogItem) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of item.formFields) {
    const base = z.string().trim();
    shape[field.name] =
      field.required === false ? base.optional() : base.min(1, `${field.label} is required`);
  }
  return z.object(shape);
}

function RequestFormBody({
  item,
  onOpenChange,
}: {
  item: ServiceCatalogItem;
  onOpenChange: (open: boolean) => void;
}) {
  const createRequest = useCreateServiceRequest();
  const defaultValues = Object.fromEntries(item.formFields.map((field) => [field.name, ""]));

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const schema = buildSchema(item);
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
        return;
      }

      const data = parsed.data as Record<string, string>;
      const justification = String(data.justification ?? "");
      const urgency = String(data.urgency ?? "Medium") as Urgency;
      const { justification: _j, urgency: _u, ...fields } = data;

      try {
        await createRequest.mutateAsync({
          catalogId: item.id,
          catalogName: item.name,
          justification,
          urgency,
          fields,
        });
        toast.success("Service request submitted");
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to submit request");
      }
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {item.formFields.map((field) => (
        <form.Field
          key={field.name}
          name={field.name}
          children={(fieldApi) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required === false ? "" : " *"}
              </Label>
              {field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  className="border-input bg-background ring-foreground/10 placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-24 w-full rounded-none border px-3 py-2 text-sm outline-none focus-visible:ring-1"
                  value={fieldApi.state.value}
                  onChange={(event) => fieldApi.handleChange(event.target.value)}
                />
              ) : field.type === "select" ? (
                <Select
                  value={fieldApi.state.value || undefined}
                  onValueChange={(value) => fieldApi.handleChange(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={field.name}
                  value={fieldApi.state.value}
                  onChange={(event) => fieldApi.handleChange(event.target.value)}
                />
              )}
            </div>
          )}
        />
      ))}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={createRequest.isPending}>
          {createRequest.isPending ? "Submitting..." : "Submit request"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RequestFormDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ServiceCatalogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item?.name ?? "Request service"}</DialogTitle>
          <DialogDescription>
            {item?.description ?? "Complete the form to submit a service request."}
          </DialogDescription>
        </DialogHeader>
        {item ? <RequestFormBody key={item.id} item={item} onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  );
}
