import { zodResolver } from "@hookform/resolvers/zod";
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
import { useLinkAssetTicket, useUnlinkAssetTicket } from "@/features/admin/hooks";
import type { Asset } from "@/features/admin/types";

const linkSchema = z.object({
  ticketId: z.string().uuid("Enter a valid incident UUID"),
  ticketType: z.enum(["incident", "service_request"]),
});

type LinkFormValues = z.infer<typeof linkSchema>;

export function AssetLinkTicketDialog({
  open,
  onOpenChange,
  asset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
}) {
  const linkTicket = useLinkAssetTicket();
  const unlinkTicket = useUnlinkAssetTicket();
  const [busy, setBusy] = useState(false);

  const form = useForm<LinkFormValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      ticketId: asset?.linkedTicketId ?? "",
      ticketType: "incident",
    },
    values: {
      ticketId: asset?.linkedTicketId ?? "",
      ticketType: "incident",
    },
  });

  async function onSubmit(values: LinkFormValues) {
    if (!asset) return;
    setBusy(true);
    try {
      await linkTicket.mutateAsync({
        assetId: asset.id,
        ticketId: values.ticketId,
        ticketType: values.ticketType,
      });
      toast.success(`Linked ${asset.assetTag} to ticket`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Link failed");
    } finally {
      setBusy(false);
    }
  }

  async function onUnlink() {
    if (!asset) return;
    setBusy(true);
    try {
      await unlinkTicket.mutateAsync(asset.id);
      toast.success(`Unlinked ${asset.assetTag}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unlink failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link ticket</DialogTitle>
          <DialogDescription>
            Associate {asset?.assetTag ?? "asset"} with an active ticket or request.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="ticketId">Ticket ID (UUID)</Label>
            <Input id="ticketId" placeholder="Incident UUID" {...form.register("ticketId")} />
            {form.formState.errors.ticketId ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.ticketId.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Ticket type</Label>
            <Select
              value={form.watch("ticketType")}
              onValueChange={(value) =>
                form.setValue("ticketType", value as "incident" | "service_request")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="incident">Incident</SelectItem>
                <SelectItem value="service_request">Service request</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {asset?.linkedTicketId ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void onUnlink()}
              >
                Unlink current
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Link ticket"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
