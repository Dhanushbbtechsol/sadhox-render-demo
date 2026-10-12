import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
  const canLink =
    role === "Admin" || role === "Agent" || role === "Manager";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [problemId, setProblemId] = useState("");
  const [pending, setPending] = useState(false);
  const { data } = useProblems({ pageSize: 100 });
  const problems = data?.data ?? [];
  const problemItems = useMemo(
    () =>
      Object.fromEntries(
        problems.map((problem) => [problem.id, problem.title]),
      ) as Record<string, string>,
    [problems],
  );

  if (!canLink) return null;

  async function handleLink() {
    const selected = problems.find((p) => p.id === problemId);
    if (!selected) return;
    if (selected.linkedIncidentIds.includes(incidentId)) {
      toast.message("Already linked to this issue");
      setOpen(false);
      return;
    }
    setPending(true);
    try {
      // Additive endpoint — does not replace the full link set from a stale cache.
      await apiFetch<Problem>(
        `/problems/${selected.id}/incidents/${incidentId}`,
        { method: "POST" },
      );
      void queryClient.invalidateQueries({ queryKey: ["problems"] });
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Ticket linked to issue");
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
        Link to issue
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link to issue</DialogTitle>
          <DialogDescription>
            Attach this ticket to an existing issue for root-cause tracking.
          </DialogDescription>
        </DialogHeader>
        <Select
          items={
            problems.length === 0
              ? { __none: "No issues yet" }
              : problemItems
          }
          value={problemId || null}
          onValueChange={(v) => setProblemId(v ?? "")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select issue…">
              {(value: string | null) =>
                value && value in problemItems
                  ? problemItems[value]
                  : "Select issue…"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {problems.length === 0 ? (
              <SelectItem value="__none" disabled label="No issues yet">
                No issues yet
              </SelectItem>
            ) : (
              problems.map((problem) => (
                <SelectItem
                  key={problem.id}
                  value={problem.id}
                  label={problem.title}
                >
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
