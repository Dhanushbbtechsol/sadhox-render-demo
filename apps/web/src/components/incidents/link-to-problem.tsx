import { useQueryClient } from "@tanstack/react-query";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProblems } from "@/hooks/use-tickets";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { Problem } from "@/types/itsm";

export function LinkToProblem({ incidentId }: { incidentId: string }) {
  const role = useAuthStore((s) => s.user?.role);
  const canLink = role === "Admin" || role === "Agent";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [problemId, setProblemId] = useState("");
  const [pending, setPending] = useState(false);
  const { data } = useProblems({ pageSize: 100 });
  const problems = data?.data ?? [];

  if (!canLink) return null;

  async function handleLink() {
    const selected = problems.find((p) => p.id === problemId);
    if (!selected) return;
    if (selected.linkedIncidentIds.includes(incidentId)) {
      toast.message("Already linked to this problem");
      setOpen(false);
      return;
    }
    setPending(true);
    try {
      await apiFetch<Problem>(`/problems/${selected.id}`, {
        method: "PATCH",
        body: {
          linkedIncidentIds: [...selected.linkedIncidentIds, incidentId],
        },
      });
      void queryClient.invalidateQueries({ queryKey: ["problems"] });
      toast.success("Incident linked to problem");
      setOpen(false);
      setProblemId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Link failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setProblemId("");
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Link to problem
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link to problem</DialogTitle>
          <DialogDescription>
            Attach this incident to an existing problem record for root-cause tracking.
          </DialogDescription>
        </DialogHeader>
        <Select value={problemId} onValueChange={(v) => setProblemId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select problem…" />
          </SelectTrigger>
          <SelectContent>
            {problems.length === 0 ? (
              <SelectItem value="__none" disabled>
                No problems yet
              </SelectItem>
            ) : (
              problems.map((problem) => (
                <SelectItem key={problem.id} value={problem.id}>
                  {problem.title}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button
            size="sm"
            disabled={!problemId || pending}
            onClick={() => void handleLink()}
          >
            {pending ? "Linking…" : "Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
