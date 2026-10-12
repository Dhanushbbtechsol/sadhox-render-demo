import { useEffect, useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useServiceCatalog } from "@/hooks/use-service-catalog";
import type { ServiceCatalogItem } from "@/types/api";

function groupByDepartment(items: ServiceCatalogItem[]) {
  return items.reduce<Record<string, ServiceCatalogItem[]>>((acc, item) => {
    acc[item.department] ??= [];
    acc[item.department].push(item);
    return acc;
  }, {});
}

export function CatalogDescriptionsSection() {
  const { data, isLoading, isError } = useServiceCatalog();
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => groupByDepartment(data ?? []), [data]);

  const departments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return Object.keys(grouped)
      .filter((department) => {
        if (!needle) return true;
        if (department.toLowerCase().includes(needle)) return true;
        return grouped[department].some(
          (item) =>
            item.name.toLowerCase().includes(needle) ||
            item.description.toLowerCase().includes(needle) ||
            (item.subcategory ?? "").toLowerCase().includes(needle),
        );
      })
      .sort((a, b) => a.localeCompare(b));
  }, [grouped, query]);

  useEffect(() => {
    if (departments.length === 0) {
      setSelectedDepartment("");
      return;
    }
    if (!departments.includes(selectedDepartment)) {
      setSelectedDepartment(departments[0]);
    }
  }, [departments, selectedDepartment]);

  const selectedItems = useMemo(() => {
    if (!selectedDepartment) return [];
    const needle = query.trim().toLowerCase();
    const items = grouped[selectedDepartment] ?? [];
    if (!needle) return items;
    if (selectedDepartment.toLowerCase().includes(needle)) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle) ||
        (item.subcategory ?? "").toLowerCase().includes(needle),
    );
  }, [grouped, selectedDepartment, query]);

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-[14rem_1fr]">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive text-sm">
        Failed to load catalog descriptions.
      </p>
    );
  }

  if (!data?.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No active catalog services to show yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter categories or services"
          className="pl-9"
          aria-label="Filter catalog descriptions"
        />
      </div>

      {departments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No categories match this filter.
        </p>
      ) : (
        <div className="border-border/80 grid overflow-hidden rounded-xl border md:grid-cols-[15rem_1fr]">
          <nav
            className="border-border/80 max-h-80 overflow-y-auto border-b md:max-h-[28rem] md:border-r md:border-b-0"
            aria-label="Catalog categories"
          >
            <ul className="divide-border/60 divide-y">
              {departments.map((department) => {
                const count = grouped[department]?.length ?? 0;
                const active = department === selectedDepartment;
                return (
                  <li key={department}>
                    <button
                      type="button"
                      className={cn(
                        "hover:bg-muted/60 flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                        active && "bg-muted text-foreground font-medium",
                      )}
                      onClick={() => setSelectedDepartment(department)}
                      aria-current={active ? "true" : undefined}
                    >
                      <span className="truncate">{department}</span>
                      <Badge variant="secondary" className="shrink-0">
                        {count}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="max-h-80 overflow-y-auto md:max-h-[28rem]">
            <div className="border-border/60 bg-muted/30 sticky top-0 border-b px-4 py-2.5">
              <p className="text-sm font-semibold tracking-tight">
                {selectedDepartment}
              </p>
            </div>
            {selectedItems.length === 0 ? (
              <p className="text-muted-foreground px-4 py-6 text-sm">
                No services in this category match the filter.
              </p>
            ) : (
              <ul className="divide-border/60 divide-y">
                {selectedItems.map((item) => (
                  <li key={item.id} className="space-y-1.5 px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.subcategory?.trim() ? (
                        <Badge variant="outline">{item.subcategory}</Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
