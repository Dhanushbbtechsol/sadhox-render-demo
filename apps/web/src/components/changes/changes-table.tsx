import { Link } from "react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Can } from "@/components/auth/protected-route";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useApproveChange,
  useChanges,
  useCreateChange,
  useUpdateChangeStatus,
} from "@/hooks/use-changes";
import type { ChangeType } from "@/types/api";

export function ChangesTable() {
  const { data, isLoading, isError } = useChanges();
  const updateStatus = useUpdateChangeStatus();
  const approveChange = useApproveChange();
  const createChange = useCreateChange();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ChangeType>("Normal");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [rollbackPlan, setRollbackPlan] = useState("");

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const needsRollback = type === "Normal" || type === "Emergency";
    if (needsRollback && !rollbackPlan.trim()) {
      toast.error("Rollback plan is required for Normal and Emergency changes");
      return;
    }
    if (!scheduledStart || !scheduledEnd) {
      toast.error("Scheduled start and end are required");
      return;
    }
    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);
    if (!(start < end)) {
      toast.error("Scheduled end must be after scheduled start");
      return;
    }
    try {
      await createChange.mutateAsync({
        title,
        description,
        type,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        rollbackPlan: rollbackPlan.trim(),
      });
      toast.success("Change created");
      setOpen(false);
      setTitle("");
      setDescription("");
      setRollbackPlan("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    }
  }

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (isError) {
    return <p className="text-destructive text-sm">Failed to load changes.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            New change
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create change</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={handleCreate}>
              <div className="space-y-1.5">
                <Label htmlFor="chg-title">Title</Label>
                <Input
                  id="chg-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chg-desc">Description</Label>
                <textarea
                  id="chg-desc"
                  className="border-input bg-background flex min-h-20 w-full rounded-none border px-3 py-2 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType((value as ChangeType) ?? "Normal")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="chg-start">Scheduled start</Label>
                  <Input
                    id="chg-start"
                    type="datetime-local"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="chg-end">Scheduled end</Label>
                  <Input
                    id="chg-end"
                    type="datetime-local"
                    value={scheduledEnd}
                    onChange={(e) => setScheduledEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chg-rollback">
                  Rollback plan
                  {type === "Standard" ? " (optional)" : " (required)"}
                </Label>
                <textarea
                  id="chg-rollback"
                  className="border-input bg-background flex min-h-20 w-full rounded-none border px-3 py-2 text-sm"
                  value={rollbackPlan}
                  onChange={(e) => setRollbackPlan(e.target.value)}
                  required={type === "Normal" || type === "Emergency"}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createChange.isPending}>
                  {createChange.isPending ? "Saving..." : "Submit"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!data?.length ? (
        <EmptyState
          title="No changes yet"
          description="Create a Normal or Emergency change with a rollback plan and maintenance window to get started."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((change) => (
              <TableRow key={change.id}>
                <TableCell>
                  <div className="space-y-1">
                    <Link
                      to={`/changes/${change.id}`}
                      className="font-medium hover:underline"
                    >
                      {change.title}
                    </Link>
                    <p className="text-muted-foreground line-clamp-1 text-xs">
                      {change.description}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{change.type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{change.status}</Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {change.scheduledStart
                    ? new Date(change.scheduledStart).toLocaleString()
                    : "—"}
                  <br />
                  {change.scheduledEnd
                    ? new Date(change.scheduledEnd).toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell>{change.createdByName}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Can roles={["Admin"]}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        approveChange.isPending || change.status === "Approved"
                      }
                      onClick={async () => {
                        try {
                          await approveChange.mutateAsync(change.id);
                          toast.success("Change approved");
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Approve failed",
                          );
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={
                        updateStatus.isPending ||
                        change.status === "Rolled Back"
                      }
                      onClick={async () => {
                        try {
                          await updateStatus.mutateAsync({
                            id: change.id,
                            status: "Rolled Back",
                          });
                          toast.message("Change rolled back");
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Reject failed",
                          );
                        }
                      }}
                    >
                      Reject
                    </Button>
                  </Can>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
