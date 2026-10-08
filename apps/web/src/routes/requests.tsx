import { RequestsTable } from "@/components/requests/requests-table";

export default function RequestsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 animate-in-up">
        <h1 className="text-2xl font-semibold tracking-tight">Service Requests</h1>
        <p className="text-muted-foreground text-sm">
          Track submitted requests and their approval status.
        </p>
      </div>
      <RequestsTable />
    </div>
  );
}
