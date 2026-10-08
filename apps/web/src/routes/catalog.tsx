import { CatalogGrid } from "@/components/catalog/catalog-grid";

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 animate-in-up">
        <h1 className="text-2xl font-semibold tracking-tight">Service Catalog</h1>
        <p className="text-muted-foreground text-sm">
          Browse available IT services by department and submit a service request.
        </p>
      </div>
      <CatalogGrid />
    </div>
  );
}
