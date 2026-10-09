import { ApprovalInboxTable } from "@/components/approvals/approval-inbox-table";

export default function ApprovalsPage() {
  return (
    <main className="container mx-auto max-w-6xl space-y-4 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Approval inbox</h1>
        <p className="text-muted-foreground text-sm">
          Manager reviews Submitted tickets from direct reports (Send to admin).
          Admin reviews Pending approval and Submitted tickets with no manager
          (Approve).
        </p>
      </div>
      <ApprovalInboxTable />
    </main>
  );
}
