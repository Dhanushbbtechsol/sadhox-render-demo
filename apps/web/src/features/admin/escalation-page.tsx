import { BellRingIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  useEscalationRules,
  useUpdateEscalationRule,
} from "@/features/admin/hooks";
import type { EscalationRule, TicketPriority } from "@/features/admin/types";

type DraftRow = {
  priority: TicketPriority;
  notifyManager: boolean;
  notifyAdmin: boolean;
};

function toDraft(rules: EscalationRule[]): DraftRow[] {
  return rules.map((rule) => ({
    priority: rule.priority,
    notifyManager: rule.notifyManager,
    notifyAdmin: rule.notifyAdmin,
  }));
}

export default function EscalationPage() {
  const rules = useEscalationRules();
  const updateRule = useUpdateEscalationRule();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [savingPriority, setSavingPriority] = useState<TicketPriority | null>(
    null,
  );

  useEffect(() => {
    if (rules.data) {
      setDrafts(toDraft(rules.data));
    }
  }, [rules.data]);

  function updateDraft(
    priority: TicketPriority,
    field: "notifyManager" | "notifyAdmin",
    value: boolean,
  ) {
    setDrafts((prev) =>
      prev.map((row) =>
        row.priority === priority ? { ...row, [field]: value } : row,
      ),
    );
  }

  async function saveRow(row: DraftRow) {
    setSavingPriority(row.priority);
    try {
      await updateRule.mutateAsync({
        priority: row.priority,
        notifyManager: row.notifyManager,
        notifyAdmin: row.notifyAdmin,
      });
      toast.success(`${row.priority} escalation rule saved`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSavingPriority(null);
    }
  }

  async function saveAll() {
    for (const row of drafts) {
      await saveRow(row);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <BellRingIcon className="size-5" />
            Escalation
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose who gets notified when each priority hits a response-time warning or
            breach.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void saveAll()}
          disabled={updateRule.isPending}
        >
          Save all
        </Button>
      </div>

      {rules.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : null}

      {rules.isError ? (
        <p className="text-destructive text-sm">
          {rules.error instanceof Error
            ? rules.error.message
            : "Failed to load escalation rules"}
        </p>
      ) : null}

      {drafts.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Notify manager</TableHead>
                <TableHead>Notify admin</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.map((row) => (
                <TableRow key={row.priority}>
                  <TableCell className="font-medium">{row.priority}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={row.notifyManager}
                      onCheckedChange={(checked) =>
                        updateDraft(
                          row.priority,
                          "notifyManager",
                          Boolean(checked),
                        )
                      }
                      aria-label={`${row.priority} notify manager`}
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={row.notifyAdmin}
                      onCheckedChange={(checked) =>
                        updateDraft(
                          row.priority,
                          "notifyAdmin",
                          Boolean(checked),
                        )
                      }
                      aria-label={`${row.priority} notify admin`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingPriority === row.priority}
                      onClick={() => void saveRow(row)}
                    >
                      {savingPriority === row.priority ? "Saving…" : "Save"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
