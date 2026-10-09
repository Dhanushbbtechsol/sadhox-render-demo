import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useAgents,
  useAssignIncident,
  useUpdateIncident,
} from "@/hooks/use-tickets";
import { useAuthStore } from "@/stores/auth-store";
import {
  INCIDENT_STATUS_LABELS,
  type Incident,
  type IncidentStatus,
} from "@/types/itsm";

const NEXT_STATUS: Partial<Record<IncidentStatus, IncidentStatus>> = {
  Assigned: "InProgress",
  InProgress: "Resolved",
  Resolved: "Closed",
};

export function IncidentActions({ incident }: { incident: Incident }) {
  const user = useAuthStore((s) => s.user);
  const canManage =
    user?.role === "Admin" ||
    user?.role === "Agent" ||
    user?.role === "Manager";
  const projectScoped = Boolean(incident.projectId);
  const { data: agents = [] } = useAgents(incident.projectId);
  const agentItems = useMemo(
    () =>
      Object.fromEntries(
        agents.map((agent) => [
          agent.id,
          `${agent.name} (${agent.openTicketCount} open)`,
        ]),
      ) as Record<string, string>,
    [agents],
  );
  const assign = useAssignIncident(incident.id);
  const update = useUpdateIncident(incident.id);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [resolutionNotes, setResolutionNotes] = useState(
    incident.resolutionNotes ?? "",
  );

  const next = NEXT_STATUS[incident.status];
  const busy = assign.isPending || update.isPending;

  async function handleAssignToMe() {
    if (!user?.id) return;
    try {
      await assign.mutateAsync(user.id);
      toast.success("Assigned to you");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assign failed");
    }
  }

  async function handleAssignSelected() {
    if (!selectedAgent) return;
    try {
      await assign.mutateAsync(selectedAgent);
      toast.success("Agent assigned");
      setSelectedAgent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assign failed");
    }
  }

  async function handleAdvance() {
    if (!next) return;
    try {
      if (next === "Resolved") {
        const notes = resolutionNotes.trim();
        if (notes.length < 5) {
          toast.error("Resolution notes are required (min 5 characters)");
          return;
        }
        await update.mutateAsync({ status: next, resolutionNotes: notes });
      } else {
        await update.mutateAsync({ status: next });
      }
      toast.success(`Status → ${INCIDENT_STATUS_LABELS[next]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  // Keyboard: Ctrl/Cmd+Shift+] advances status when not typing in an input.
  useEffect(() => {
    if (!canManage || !next) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable;
      if (typing) return;
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return;
      if (event.key !== "]" && event.key !== "}") return;
      event.preventDefault();
      if (!busy) void handleAdvance();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // handleAdvance closes over latest notes/status
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, next, busy, resolutionNotes, incident.status]);

  if (!canManage) return null;

  const canAssign =
    incident.status === "New" ||
    incident.status === "Assigned" ||
    incident.status === "InProgress";

  return (
    <div className="border-border/80 bg-muted/30 space-y-4 rounded-xl border p-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">Workflow</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Assign agents and advance through the ITIL lifecycle.
          {projectScoped
            ? " Assignee pool is this project's members."
            : " Unscoped ticket — global Agent pool (Admin)."}
          {next ? (
            <>
              {" "}
              Shortcut:{" "}
              <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">
                ⌘/Ctrl+Shift+]
              </kbd>{" "}
              → {INCIDENT_STATUS_LABELS[next]}
            </>
          ) : null}
        </p>
      </div>

      {canAssign && user?.role === "Agent" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void handleAssignToMe()}
          >
            Assign to Me
          </Button>
        </div>
      ) : null}

      {canAssign ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="agent-select">
              {projectScoped ? "Assign project member" : "Assign agent"}
            </Label>
            <Select
              items={agentItems}
              value={selectedAgent || null}
              onValueChange={(v) => setSelectedAgent(v ?? "")}
            >
              <SelectTrigger id="agent-select">
                <SelectValue
                  placeholder={
                    agents.length === 0
                      ? projectScoped
                        ? "No project members"
                        : "No agents"
                      : "Select agent…"
                  }
                >
                  {(value: string | null) =>
                    value && value in agentItems
                      ? agentItems[value]
                      : "Select agent…"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem
                    key={agent.id}
                    value={agent.id}
                    label={agentItems[agent.id]}
                  >
                    {agentItems[agent.id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            disabled={busy || !selectedAgent}
            onClick={() => void handleAssignSelected()}
          >
            Assign
          </Button>
        </div>
      ) : null}

      {next === "Resolved" || incident.status === "InProgress" ? (
        <div className="space-y-1.5">
          <Label htmlFor="resolution-notes">Resolution notes</Label>
          <Textarea
            id="resolution-notes"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Describe the fix (required to resolve)…"
            rows={3}
          />
        </div>
      ) : null}

      {next ? (
        <Button size="sm" disabled={busy} onClick={() => void handleAdvance()}>
          Mark as {INCIDENT_STATUS_LABELS[next]}
        </Button>
      ) : null}

      {incident.resolutionNotes ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          <span className="font-medium text-foreground">Resolution: </span>
          {incident.resolutionNotes}
        </p>
      ) : null}
    </div>
  );
}
