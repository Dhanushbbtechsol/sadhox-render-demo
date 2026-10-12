import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useIncidents, useUpdateProblem } from "@/hooks/use-tickets";
import { recordReference } from "@/lib/record-reference";
import type { Problem } from "@/types/itsm";

export function LinkIncidentsModal({ problem }: { problem: Problem }) {
  const [open, setOpen] = useState(false);
  const { data } = useIncidents({ pageSize: 100 });
  const update = useUpdateProblem(problem.id);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(problem.linkedIncidentIds),
  );

  const incidents = data?.data ?? [];

  const sorted = useMemo(
    () =>
      [...incidents].sort((a, b) => a.title.localeCompare(b.title)),
    [incidents],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    try {
      await update.mutateAsync({
        linkedIncidentIds: [...selected],
      });
      toast.success("Linked incidents updated");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Link failed");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSelected(new Set(problem.linkedIncidentIds));
      }}
    >
      <DialogTrigger
        render={<Button size="sm" variant="outline" />}
      >
        Link incidents
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link related incidents</DialogTitle>
          <DialogDescription>
            Select incident tickets affected by this problem.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {sorted.length === 0 ? (
            <p className="text-muted-foreground text-sm">No incidents found.</p>
          ) : (
            sorted.map((incident) => {
              const checked = selected.has(incident.id);
              return (
                <label
                  key={incident.id}
                  className="border-border/80 hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(incident.id)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {incident.title}
                    </span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {recordReference(incident.referenceCode, incident.id)} · {incident.status} ·{" "}
                      {incident.priority}
                    </span>
                  </span>
                </label>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={update.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={update.isPending}
          >
            Save links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
