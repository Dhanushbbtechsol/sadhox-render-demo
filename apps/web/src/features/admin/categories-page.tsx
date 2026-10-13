import { FolderTreeIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useCreateIncidentCategory,
  useCreateIncidentSubcategory,
  useIncidentCategoryTaxonomyAdmin,
  useUpdateIncidentCategory,
  useUpdateIncidentSubcategory,
} from "@/features/admin/hooks";
import type { TicketPriority } from "@/features/admin/types";

const PRIORITIES: Array<TicketPriority | "none"> = [
  "none",
  "P1",
  "P2",
  "P3",
  "P4",
];

export default function CategoriesPage() {
  const taxonomy = useIncidentCategoryTaxonomyAdmin();
  const createCategory = useCreateIncidentCategory();
  const updateCategory = useUpdateIncidentCategory();
  const createSubcategory = useCreateIncidentSubcategory();
  const updateSubcategory = useUpdateIncidentSubcategory();

  const [newCategory, setNewCategory] = useState("");
  const [subName, setSubName] = useState("");
  const [subCategoryId, setSubCategoryId] = useState<string>("");
  const [subMin, setSubMin] = useState<TicketPriority | "none">("none");

  const categories = taxonomy.data ?? [];
  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories],
  );

  async function addCategory() {
    const name = newCategory.trim();
    if (!name) {
      toast.error("Category name is required");
      return;
    }
    try {
      await createCategory.mutateAsync(name);
      setNewCategory("");
      toast.success(`Category "${name}" created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    }
  }

  async function addSubcategory() {
    const name = subName.trim();
    if (!subCategoryId) {
      toast.error("Pick a category first");
      return;
    }
    if (!name) {
      toast.error("Subcategory name is required");
      return;
    }
    try {
      await createSubcategory.mutateAsync({
        categoryId: subCategoryId,
        name,
        minPriority: subMin === "none" ? null : subMin,
      });
      setSubName("");
      setSubMin("none");
      toast.success(`Subcategory "${name}" created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <FolderTreeIcon className="size-5" />
          Categories
        </h1>
        <p className="text-sm text-muted-foreground">
          Ticket category and subcategory used when raising a ticket. Set a
          minimum priority on a subcategory so Response time follows that floor
          (P1–P4 rules).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-4">
          <h2 className="text-sm font-medium">New category</h2>
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. Critical infrastructure"
            />
            <Button
              type="button"
              onClick={() => void addCategory()}
              disabled={createCategory.isPending}
            >
              <PlusIcon />
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <h2 className="text-sm font-medium">New subcategory</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                value={subCategoryId || undefined}
                onValueChange={(v) => setSubCategoryId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {activeCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Min priority (SLA floor)</Label>
              <Select
                value={subMin}
                onValueChange={(v) =>
                  setSubMin((v as TicketPriority | "none") ?? "none")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === "none" ? "None" : p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="e.g. Core switch / DC-1"
            />
            <Button
              type="button"
              onClick={() => void addSubcategory()}
              disabled={createSubcategory.isPending}
            >
              <PlusIcon />
              Add
            </Button>
          </div>
        </div>
      </div>

      {taxonomy.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : null}

      {taxonomy.isError ? (
        <p className="text-sm text-destructive">
          {taxonomy.error instanceof Error
            ? taxonomy.error.message
            : "Failed to load categories"}
        </p>
      ) : null}

      {categories.map((cat) => (
        <div key={cat.id} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{cat.name}</h2>
            <Badge variant={cat.isActive ? "default" : "secondary"}>
              {cat.isActive ? "Active" : "Inactive"}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={updateCategory.isPending}
              onClick={() => {
                void updateCategory
                  .mutateAsync({ id: cat.id, isActive: !cat.isActive })
                  .then(() =>
                    toast.success(
                      cat.isActive
                        ? `${cat.name} deactivated`
                        : `${cat.name} activated`,
                    ),
                  )
                  .catch((error: unknown) =>
                    toast.error(
                      error instanceof Error ? error.message : "Update failed",
                    ),
                  );
              }}
            >
              {cat.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subcategory</TableHead>
                <TableHead>Min priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cat.subcategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No subcategories yet
                  </TableCell>
                </TableRow>
              ) : (
                cat.subcategories.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.name}</TableCell>
                    <TableCell>
                      <Select
                        value={sub.minPriority ?? "none"}
                        onValueChange={(v) => {
                          const minPriority =
                            !v || v === "none"
                              ? null
                              : (v as TicketPriority);
                          void updateSubcategory
                            .mutateAsync({ id: sub.id, minPriority })
                            .then(() =>
                              toast.success(
                                `${sub.name}: min priority ${minPriority ?? "none"}`,
                              ),
                            )
                            .catch((error: unknown) =>
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Update failed",
                              ),
                            );
                        }}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p === "none" ? "None" : p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.isActive ? "default" : "secondary"}>
                        {sub.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={updateSubcategory.isPending}
                        onClick={() => {
                          void updateSubcategory
                            .mutateAsync({
                              id: sub.id,
                              isActive: !sub.isActive,
                            })
                            .then(() =>
                              toast.success(
                                sub.isActive
                                  ? `${sub.name} deactivated`
                                  : `${sub.name} activated`,
                              ),
                            )
                            .catch((error: unknown) =>
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Update failed",
                              ),
                            );
                        }}
                      >
                        {sub.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
