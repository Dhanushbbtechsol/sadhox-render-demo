import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { useCreateAsset, useUpdateAsset } from "@/features/admin/hooks";
import type { Asset, AssetStatus, AssetType } from "@/features/admin/types";

const TYPES = ["Hardware", "Software"] as const;
const STATUSES = ["Active", "InRepair", "Retired"] as const;

const assetSchema = z.object({
  assetTag: z.string().min(2).max(64),
  name: z.string().min(2).max(255),
  type: z.enum(TYPES),
  status: z.enum(STATUSES),
  purchaseCost: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+(\.\d{1,2})?$/.test(v), "Use a decimal amount"),
});

type AssetFormValues = z.infer<typeof assetSchema>;

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Asset | null;
}) {
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const isEdit = Boolean(asset);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      assetTag: "",
      name: "",
      type: "Hardware",
      status: "Active",
      purchaseCost: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      asset
        ? {
            assetTag: asset.assetTag,
            name: asset.name,
            type: asset.type,
            status: asset.status,
            purchaseCost: asset.purchaseCost ?? "",
          }
        : {
            assetTag: "",
            name: "",
            type: "Hardware",
            status: "Active",
            purchaseCost: "",
          },
    );
  }, [asset, form, open]);

  async function onSubmit(values: AssetFormValues) {
    try {
      if (isEdit && asset) {
        await updateAsset.mutateAsync({
          id: asset.id,
          input: {
            assetTag: values.assetTag,
            name: values.name,
            type: values.type as AssetType,
            status: values.status as AssetStatus,
            purchaseCost: values.purchaseCost?.trim() || undefined,
          },
        });
        toast.success(`Updated ${values.assetTag}`);
      } else {
        await createAsset.mutateAsync({
          assetTag: values.assetTag,
          name: values.name,
          type: values.type as AssetType,
          status: values.status as AssetStatus,
          purchaseCost: values.purchaseCost?.trim() || undefined,
        });
        toast.success(`Created ${values.assetTag}`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  }

  const pending = createAsset.isPending || updateAsset.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit asset" : "Create asset"}</DialogTitle>
          <DialogDescription>
            Hardware and software inventory records for the asset register.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="assetTag">Asset tag</Label>
            <Input id="assetTag" {...form.register("assetTag")} />
            {form.formState.errors.assetTag ? (
              <p className="text-destructive text-xs">{form.formState.errors.assetTag.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetName">Name</Label>
            <Input id="assetName" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item === "InRepair" ? "In repair" : item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseCost">Purchase cost (Admin)</Label>
            <Input
              id="purchaseCost"
              inputMode="decimal"
              placeholder="1299.00"
              {...form.register("purchaseCost")}
            />
            {form.formState.errors.purchaseCost ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.purchaseCost.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
