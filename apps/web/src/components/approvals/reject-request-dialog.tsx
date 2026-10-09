import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRejectChange } from "@/hooks/use-changes";
import { useRejectServiceRequest } from "@/hooks/use-service-requests";

type RejectRequestDialogProps = {
  targetId: string | null;
  kind?: "request" | "change";
  label?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RejectRequestDialog({
  targetId,
  kind = "request",
  label,
  open,
  onOpenChange,
}: RejectRequestDialogProps) {
  const rejectRequest = useRejectServiceRequest();
  const rejectChange = useRejectChange();
  const [reason, setReason] = useState("");
  const pending = rejectRequest.isPending || rejectChange.isPending;

  async function handleReject() {
    if (!targetId) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      if (kind === "change") {
        await rejectChange.mutateAsync({ id: targetId, reason: trimmed });
        toast.success("Change rejected");
      } else {
        await rejectRequest.mutateAsync({ id: targetId, reason: trimmed });
        toast.success("Request rejected");
      }
      setReason("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reject failed");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setReason("");
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === "change" ? "Reject change" : "Reject service request"}
          </DialogTitle>
          <DialogDescription>
            {label
              ? `Provide a reason for rejecting “${label}”.`
              : "Provide a reason for rejecting this item."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reject-reason">Reason</Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Mandatory rejection reason"
            required
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !reason.trim()}
            onClick={() => void handleReject()}
          >
            {pending ? "Rejecting…" : "Confirm reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
