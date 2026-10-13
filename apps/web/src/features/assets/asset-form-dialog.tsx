import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
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
import { useDirectoryUsers } from "@/features/projects/hooks";

const TYPES = ["Hardware", "Software"] as const;
const STATUSES = ["Active", "InRepair", "Retired"] as const;
const NONE_OWNER = "__none__";

const assetSchema = z.object({
  assetTag: z.string().min(2).max(64),
  name: z.string().min(2).max(255),
  type: z.enum(TYPES),
  status: z.enum(STATUSES),
  serialNumber: z.string().max(128).optional(),
  location: z.string().max(128).optional(),
  ownerId: z.string().nullable(),
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
  const holders = useDirectoryUsers();
  const isEdit = Boolean(asset);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      assetTag: "",
      name: "",
      type: "Hardware",
      status: "Active",
      serialNumber: "",
      location: "",
      ownerId: null,
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
            serialNumber: asset.serialNumber ?? "",
            location: asset.location ?? "",
            ownerId: asset.ownerId,
            purchaseCost: asset.purchaseCost ?? "",
          }
        : {
            assetTag: "",
            name: "",
            type: "Hardware",
            status: "Active",
            serialNumber: "",
            location: "",
            ownerId: null,
            purchaseCost: "",
          },
    );
  }, [asset, form, open]);

  async function onSubmit(values: AssetFormValues) {
    const serialNumber = values.serialNumber?.trim() || null;
    const location = values.location?.trim() || null;
    try {
      if (isEdit && asset) {
        await updateAsset.mutateAsync({
          id: asset.id,
          input: {
            assetTag: values.assetTag,
            name: values.name,
            type: values.type as AssetType,
            status: values.status as AssetStatus,
            serialNumber,
            location,
            ownerId: values.ownerId,
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
          serialNumber,
          location,
          ownerId: values.ownerId ?? undefined,
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
  const ownerValue = form.watch("ownerId") ?? NONE_OWNER;

  const ownerItems = useMemo(
    () =>
      ({
        [NONE_OWNER]: "Unassigned",
        ...Object.fromEntries(
          (holders.data ?? []).map((holder) => [holder.id, holder.name]),
        ),
      }) as Record<string, string>,
    [holders.data],
  );

  const statusItems = useMemo(
    () =>
      Object.fromEntries(
        STATUSES.map((item) => [
          item,
          item === "InRepair" ? "In repair" : item,
        ]),
      ) as Record<string, string>,
    [],
  );

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
              <p className="text-destructive text-xs">
                {form.formState.errors.assetTag.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetName">Name</Label>
            <Input id="assetName" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={Object.fromEntries(TYPES.map((item) => [item, item]))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((item) => (
                        <SelectItem key={item} value={item} label={item}>
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
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={statusItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((item) => (
                        <SelectItem
                          key={item}
                          value={item}
                          label={statusItems[item]}
                        >
                          {statusItems[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial</Label>
              <Input
                id="serialNumber"
                maxLength={128}
                {...form.register("serialNumber")}
              />
              {form.formState.errors.serialNumber ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.serialNumber.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                maxLength={128}
                {...form.register("location")}
              />
              {form.formState.errors.location ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.location.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Owner</Label>
            <Select
              value={ownerValue}
              onValueChange={(value) =>
                form.setValue(
                  "ownerId",
                  value === NONE_OWNER ? null : value,
                )
              }
              items={ownerItems}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_OWNER} label="Unassigned">
                  Unassigned
                </SelectItem>
                {(holders.data ?? []).map((holder) => (
                  <SelectItem
                    key={holder.id}
                    value={holder.id}
                    label={holder.name}
                  >
                    {holder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
