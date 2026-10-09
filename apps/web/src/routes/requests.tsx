import { RequestFromCatalogButton } from "@/components/requests/request-from-catalog-button";
import { RequestsTable } from "@/components/requests/requests-table";

export default function RequestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-in-up">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Service Requests</h1>
          <p className="text-muted-foreground text-sm">
            Track submitted requests and their approval status.
          </p>
        </div>
        <RequestFromCatalogButton />
      </div>
      <RequestsTable />
    </div>
  );
}
