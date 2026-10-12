import { useEffect, useMemo, useState } from "react";
import { ArrowUpRightIcon } from "lucide-react";
import { useSearchParams } from "react-router";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ListPagination, paginateItems } from "@/components/list-pagination";
import { RequestFormDialog } from "@/components/catalog/request-form-dialog";
import { useServiceCatalog } from "@/hooks/use-service-catalog";
import type { ServiceCatalogItem } from "@/types/api";

export function CatalogGrid() {
  const { data, isLoading, isError } = useServiceCatalog();
  const [searchParams] = useSearchParams();
  const departmentFilter = searchParams.get("department")?.trim() ?? "";
  const [selected, setSelected] = useState<ServiceCatalogItem | null>(null);
  const [page, setPage] = useState(1);

  const filteredItems = useMemo(() => {
    const items = data ?? [];
    return departmentFilter
      ? items.filter(
          (item) =>
            item.department.toLowerCase() === departmentFilter.toLowerCase(),
        )
      : items;
  }, [data, departmentFilter]);

  useEffect(() => {
    setPage(1);
  }, [departmentFilter]);

  const paged = paginateItems(filteredItems, page);

  const grouped = useMemo(() => {
    return paged.items.reduce<Record<string, ServiceCatalogItem[]>>(
      (acc, item) => {
        acc[item.department] ??= [];
        acc[item.department].push(item);
        return acc;
      },
      {},
    );
  }, [paged.items]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive text-sm">Failed to load the catalog.</p>
    );
  }

  if (!data?.length) {
    return (
      <EmptyState
        title="No active catalog items"
        description="There are no active catalog items to request right now. Check back later or contact an administrator."
      />
    );
  }

  if (filteredItems.length === 0) {
    return (
      <EmptyState
        title="No items in this department"
        description={
          departmentFilter
            ? `No active catalog items match “${departmentFilter}”. Browse the full catalog or try another department.`
            : "No active catalog items to show."
        }
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="space-y-8">
          {Object.entries(grouped).map(([department, items]) => (
            <section key={department} className="space-y-3 animate-in-up">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">
                  {department}
                </h2>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="group text-left"
                    onClick={() => setSelected(item)}
                  >
                    <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/25 group-hover:shadow-lift">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="group-hover:text-primary transition-colors">
                            {item.name}
                          </CardTitle>
                          <ArrowUpRightIcon className="text-muted-foreground size-4 shrink-0 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                        </div>
                        <CardDescription>{item.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{item.department}</Badge>
                        {item.subcategory ? (
                          <Badge variant="secondary">{item.subcategory}</Badge>
                        ) : null}
                        <span className="text-primary ml-auto text-xs font-medium">
                          Request Service
                        </span>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <ListPagination
          page={paged.page}
          totalPages={paged.totalPages}
          total={paged.total}
          onPageChange={setPage}
          label="items"
        />
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
