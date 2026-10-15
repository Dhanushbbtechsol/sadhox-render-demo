import { ApprovalInboxTable } from "@/components/approvals/approval-inbox-table";

export default function ApprovalsPage() {
  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Approval inbox</h1>
        <p className="text-muted-foreground text-sm">
          Manager can send Submitted tickets from direct reports to admin.
          Admin can approve or reject any pending request or change directly,
          without waiting on a manager.
        </p>
      </div>
      <ApprovalInboxTable />
    </main>
  );
}
