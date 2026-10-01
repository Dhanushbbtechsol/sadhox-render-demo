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
import { useRejectServiceRequest } from "@/hooks/use-service-requests";

type RejectRequestDialogProps = {
  requestId: string | null;
  requestLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RejectRequestDialog({
  requestId,
  requestLabel,
  open,
  onOpenChange,
}: RejectRequestDialogProps) {
  const rejectRequest = useRejectServiceRequest();
  const [reason, setReason] = useState("");

  async function handleReject() {
    if (!requestId) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      await rejectRequest.mutateAsync({ id: requestId, reason: trimmed });
      toast.success("Request rejected");
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
          <DialogTitle>Reject service request</DialogTitle>
          <DialogDescription>
            {requestLabel
              ? `Provide a reason for rejecting “${requestLabel}”. The requester will see this note.`
              : "Provide a reason for rejecting this request. The requester will see this note."}
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
            disabled={rejectRequest.isPending || !reason.trim()}
            onClick={() => void handleReject()}
          >
            {rejectRequest.isPending ? "Rejecting…" : "Confirm reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
