import { MoreHorizontal, PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ListPagination, paginateItems } from "@/components/list-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useServiceCatalog,
  useUpdateCatalogItem,
} from "@/hooks/use-service-catalog";
import type { ServiceCatalogItem } from "@/types/api";

import { CatalogItemFormDialog } from "./catalog-item-form-dialog";

export default function AdminCatalogPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalogItem | null>(null);

  const catalog = useServiceCatalog({ includeInactive: true });
  const updateItem = useUpdateCatalogItem();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = catalog.data ?? [];
    if (!needle) return rows;
    return rows.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.department.toLowerCase().includes(needle) ||
        (item.subcategory ?? "").toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle),
    );
  }, [catalog.data, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const paged = paginateItems(filtered, page);

  async function toggleActive(item: ServiceCatalogItem) {
    const next = item.isActive === false;
    try {
      await updateItem.mutateAsync({
        id: item.id,
        input: { isActive: next },
      });
      toast.success(
        next ? `${item.name} reactivated` : `${item.name} deactivated`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Catalog admin</h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, and deactivate catalog items. Inactive items stay
            hidden from End User browse.
          </p>
        </div>
        <Button
          className="shrink-0"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <PlusIcon />
          New item
        </Button>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name, department, or subcategory"
        className="md:max-w-xs"
      />

      {catalog.isLoading ? <Skeleton className="h-64" /> : null}

      {catalog.isError ? (
        <p className="text-destructive text-sm">
          {catalog.error instanceof Error
            ? catalog.error.message
            : "Failed to load catalog"}
        </p>
      ) : null}

      {catalog.data && filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {query.trim()
            ? "No catalog items match this search."
            : "No catalog items yet. Create one to get started."}
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="ring-foreground/10 -mx-1 overflow-x-auto bg-card ring-1 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.items.map((item) => {
                  const active = item.isActive !== false;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground line-clamp-1 text-xs">
                            {item.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{item.department}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.subcategory?.trim() || "—"}
                      </TableCell>
                      <TableCell>{item.formFields.length}</TableCell>
                      <TableCell>
                        <Badge variant={active ? "success" : "outline"}>
                          {active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(item);
                                setFormOpen(true);
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void toggleActive(item)}>
                              {active ? "Deactivate" : "Reactivate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <ListPagination
            page={paged.page}
            totalPages={paged.totalPages}
            total={paged.total}
            onPageChange={setPage}
            label="items"
          />
        </div>
      ) : null}

      <CatalogItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
      />
    </div>
  );
}
