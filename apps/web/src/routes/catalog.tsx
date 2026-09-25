import { CatalogGrid } from "@/components/catalog/catalog-grid";

export default function CatalogPage() {
  return (
    <main className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Service Catalog</h1>
        <p className="text-muted-foreground text-sm">
          Browse available IT services by department and submit a request.
        </p>
      </div>
      <CatalogGrid />
    </main>
  );
}
