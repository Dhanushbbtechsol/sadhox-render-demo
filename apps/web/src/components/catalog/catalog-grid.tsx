import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestFormDialog } from "@/components/catalog/request-form-dialog";
import { useServiceCatalog } from "@/hooks/use-service-catalog";
import type { ServiceCatalogItem } from "@/types/api";

export function CatalogGrid() {
  const { data, isLoading, isError } = useServiceCatalog();
  const [selected, setSelected] = useState<ServiceCatalogItem | null>(null);

  const grouped = useMemo(() => {
    const items = data ?? [];
    return items.reduce<Record<string, ServiceCatalogItem[]>>((acc, item) => {
      acc[item.department] ??= [];
      acc[item.department].push(item);
      return acc;
    }, {});
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-destructive text-sm">Failed to load service catalog.</p>;
  }

  if (!data?.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No catalog items available yet. Check back soon.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {Object.entries(grouped).map(([department, items]) => (
          <section key={department} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">{department}</h2>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="text-left"
                  onClick={() => setSelected(item)}
                >
                  <Card className="h-full transition-colors hover:bg-muted/40">
                    <CardHeader>
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline">{item.department}</Badge>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <RequestFormDialog
        item={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
