import { ApprovalInboxTable } from "@/components/approvals/approval-inbox-table";

export default function ApprovalsPage() {
  return (
    <main className="container mx-auto max-w-6xl space-y-4 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Approval inbox</h1>
        <p className="text-muted-foreground text-sm">
          Manager reviews Submitted tickets on owned projects; Admin reviews
          Pending approval and tickets with no project.
        </p>
      </div>
      <ApprovalInboxTable />
    </main>
  );
}
