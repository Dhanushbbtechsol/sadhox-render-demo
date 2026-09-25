import { RequestsTable } from "@/components/requests/requests-table";

export default function RequestsPage() {
  return (
    <main className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Service Requests</h1>
        <p className="text-muted-foreground text-sm">
          Track submitted requests and their approval status.
        </p>
      </div>
      <RequestsTable />
    </main>
  );
}
