import { TimerIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSlaRules, useUpdateSlaRule } from "@/features/admin/hooks";
import type { SlaRule, TicketPriority } from "@/features/admin/types";

type DraftRow = {
  priority: TicketPriority;
  responseMinutes: string;
  resolveMinutes: string;
};

function toDraft(rules: SlaRule[]): DraftRow[] {
  return rules.map((rule) => ({
    priority: rule.priority,
    responseMinutes: String(rule.responseMinutes),
    resolveMinutes: String(rule.resolveMinutes),
  }));
}

export default function SlaRulesPage() {
  const slaRules = useSlaRules();
  const updateRule = useUpdateSlaRule();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [savingPriority, setSavingPriority] = useState<TicketPriority | null>(null);

  useEffect(() => {
    if (slaRules.data) {
      setDrafts(toDraft(slaRules.data));
    }
  }, [slaRules.data]);

  function updateDraft(
    priority: TicketPriority,
    field: "responseMinutes" | "resolveMinutes",
    value: string,
  ) {
    setDrafts((prev) =>
      prev.map((row) => (row.priority === priority ? { ...row, [field]: value } : row)),
    );
  }

  async function saveRow(row: DraftRow) {
    const responseMinutes = Number(row.responseMinutes);
    const resolveMinutes = Number(row.resolveMinutes);
    if (
      !Number.isFinite(responseMinutes) ||
      !Number.isFinite(resolveMinutes) ||
      responseMinutes < 1 ||
      resolveMinutes < 1 ||
      !Number.isInteger(responseMinutes) ||
      !Number.isInteger(resolveMinutes)
    ) {
      toast.error("Minutes must be positive whole numbers");
      return;
    }
    if (resolveMinutes < responseMinutes) {
      toast.error("Resolve target must be ≥ response target");
      return;
    }

    setSavingPriority(row.priority);
    try {
      await updateRule.mutateAsync({
        priority: row.priority,
        responseMinutes,
        resolveMinutes,
      });
      toast.success(`${row.priority} SLA rule saved`);
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
            <TimerIcon className="size-5" />
            SLA rules
          </h1>
          <p className="text-sm text-muted-foreground">
            Per-priority response and resolve targets. Not a drag-and-drop policy builder.
          </p>
        </div>
        <Button type="button" onClick={() => void saveAll()} disabled={updateRule.isPending}>
          Save all
        </Button>
      </div>

      {slaRules.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : null}

      {slaRules.isError ? (
        <p className="text-destructive text-sm">
          {slaRules.error instanceof Error ? slaRules.error.message : "Failed to load SLA rules"}
        </p>
      ) : null}

      {drafts.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Response (minutes)</TableHead>
                <TableHead>Resolve (minutes)</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.map((row) => (
                <TableRow key={row.priority}>
                  <TableCell className="font-medium">{row.priority}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      className="max-w-36"
                      value={row.responseMinutes}
                      onChange={(event) =>
                        updateDraft(row.priority, "responseMinutes", event.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      className="max-w-36"
                      value={row.resolveMinutes}
                      onChange={(event) =>
                        updateDraft(row.priority, "resolveMinutes", event.target.value)
                      }
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
