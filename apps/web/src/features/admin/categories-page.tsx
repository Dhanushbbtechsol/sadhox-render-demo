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

type DraftSub = {
  key: string;
  name: string;
  minPriority: TicketPriority | "none";
};

function emptyDraftSub(): DraftSub {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    minPriority: "none",
  };
}

function filledDrafts(rows: DraftSub[]) {
  return rows
    .map((row) => ({
      name: row.name.trim(),
      minPriority: row.minPriority === "none" ? null : row.minPriority,
    }))
    .filter((row) => row.name.length > 0);
}

export default function CategoriesPage() {
  const taxonomy = useIncidentCategoryTaxonomyAdmin();
  const createCategory = useCreateIncidentCategory();
  const updateCategory = useUpdateIncidentCategory();
  const createSubcategory = useCreateIncidentSubcategory();
  const updateSubcategory = useUpdateIncidentSubcategory();

  const [newCategory, setNewCategory] = useState("");
  const [draftSubs, setDraftSubs] = useState<DraftSub[]>([emptyDraftSub()]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState("");
  const [addingUnderCategoryId, setAddingUnderCategoryId] = useState<
    string | null
  >(null);
  const [inlineDrafts, setInlineDrafts] = useState<DraftSub[]>([
    emptyDraftSub(),
  ]);

  const categories = taxonomy.data ?? [];
  const prioritySelectItems = useMemo(
    () =>
      Object.fromEntries(
        PRIORITIES.map((p) => [p, p === "none" ? "None" : p]),
      ) as Record<string, string>,
    [],
  );
  const saving =
    createCategory.isPending || createSubcategory.isPending;

  async function createCategoryFlow() {
    const categoryName = newCategory.trim();
    if (!categoryName) {
      toast.error("Category name is required");
      return;
    }
    const subs = filledDrafts(draftSubs);
    const names = subs.map((s) => s.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      toast.error("Subcategory names must be unique");
      return;
    }
    try {
      const created = (await createCategory.mutateAsync(categoryName)) as {
        id: string;
        name: string;
      };
      for (const sub of subs) {
        await createSubcategory.mutateAsync({
          categoryId: created.id,
          name: sub.name,
          minPriority: sub.minPriority,
        });
      }
      toast.success(
        subs.length === 0
          ? `Category "${categoryName}" created`
          : `Created ${categoryName} with ${subs.length} subcategory${subs.length === 1 ? "" : "ies"}`,
      );
      setNewCategory("");
      setDraftSubs([emptyDraftSub()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    }
  }

  async function saveCategoryName(id: string) {
    const name = editingCategoryName.trim();
    if (!name) {
      toast.error("Category name is required");
      return;
    }
    try {
      await updateCategory.mutateAsync({ id, name });
      setEditingCategoryId(null);
      toast.success(`Category renamed to "${name}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rename failed");
    }
  }

  async function saveSubcategoryName(id: string) {
    const name = editingSubName.trim();
    if (!name) {
      toast.error("Subcategory name is required");
      return;
    }
    try {
      await updateSubcategory.mutateAsync({ id, name });
      setEditingSubId(null);
      toast.success(`Subcategory renamed to "${name}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rename failed");
    }
  }

  async function addSubcategoriesUnder(categoryId: string) {
    const subs = filledDrafts(inlineDrafts);
    if (subs.length === 0) {
      toast.error("Enter at least one subcategory name");
      return;
    }
    const names = subs.map((s) => s.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      toast.error("Subcategory names must be unique");
      return;
    }
    try {
      for (const sub of subs) {
        await createSubcategory.mutateAsync({
          categoryId,
          name: sub.name,
          minPriority: sub.minPriority,
        });
      }
      setInlineDrafts([emptyDraftSub()]);
      setAddingUnderCategoryId(null);
      toast.success(
        `Added ${subs.length} subcategory${subs.length === 1 ? "" : "ies"}`,
      );
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
          Create a category and as many subcategories as you need in one go.
          Each subcategory can have its own Response time floor.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Create</h2>
        <div className="space-y-1">
          <Label htmlFor="new-category">Category</Label>
          <Input
            id="new-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="e.g. Critical infrastructure"
            className="max-w-md"
          />
        </div>

        <div className="space-y-2">
          <Label>Subcategories</Label>
          {draftSubs.map((row, index) => (
            <div
              key={row.key}
              className="flex flex-wrap items-end gap-2"
            >
              <Input
                className="min-w-[12rem] flex-1"
                value={row.name}
                onChange={(e) =>
                  setDraftSubs((prev) =>
                    prev.map((r) =>
                      r.key === row.key ? { ...r, name: e.target.value } : r,
                    ),
                  )
                }
                placeholder={
                  index === 0
                    ? "e.g. Primary data center"
                    : "Another subcategory"
                }
              />
              <Select
                value={row.minPriority}
                items={prioritySelectItems}
                onValueChange={(v) =>
                  setDraftSubs((prev) =>
                    prev.map((r) =>
                      r.key === row.key
                        ? {
                            ...r,
                            minPriority:
                              (v as TicketPriority | "none") ?? "none",
                          }
                        : r,
                    ),
                  )
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Min priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem
                      key={p}
                      value={p}
                      label={p === "none" ? "None" : p}
                    >
                      {p === "none" ? "None" : p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {draftSubs.length > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDraftSubs((prev) =>
                      prev.filter((r) => r.key !== row.key),
                    )
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDraftSubs((prev) => [...prev, emptyDraftSub()])}
          >
            <PlusIcon />
            Add another subcategory
          </Button>
        </div>

        <Button
          type="button"
          onClick={() => void createCategoryFlow()}
          disabled={saving}
        >
          <PlusIcon />
          Create
        </Button>
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
            {editingCategoryId === cat.id ? (
              <>
                <Input
                  className="max-w-xs"
                  value={editingCategoryName}
                  onChange={(e) => setEditingCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void saveCategoryName(cat.id);
                    }
                    if (e.key === "Escape") setEditingCategoryId(null);
                  }}
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={updateCategory.isPending}
                  onClick={() => void saveCategoryName(cat.id)}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingCategoryId(null)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold">{cat.name}</h2>
                <Badge variant={cat.isActive ? "default" : "secondary"}>
                  {cat.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingCategoryId(cat.id);
                    setEditingCategoryName(cat.name);
                    setEditingSubId(null);
                  }}
                >
                  Edit
                </Button>
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
                          error instanceof Error
                            ? error.message
                            : "Update failed",
                        ),
                      );
                  }}
                >
                  {cat.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddingUnderCategoryId(cat.id);
                    setInlineDrafts([emptyDraftSub()]);
                    setEditingCategoryId(null);
                    setEditingSubId(null);
                  }}
                >
                  <PlusIcon />
                  Add subcategory
                </Button>
              </>
            )}
          </div>

          {addingUnderCategoryId === cat.id ? (
            <div className="space-y-2 rounded-lg border p-3">
              {inlineDrafts.map((row, index) => (
                <div
                  key={row.key}
                  className="flex flex-wrap items-end gap-2"
                >
                  <Input
                    className="min-w-[12rem] flex-1"
                    value={row.name}
                    onChange={(e) =>
                      setInlineDrafts((prev) =>
                        prev.map((r) =>
                          r.key === row.key
                            ? { ...r, name: e.target.value }
                            : r,
                        ),
                      )
                    }
                    placeholder={
                      index === 0
                        ? "e.g. Primary data center"
                        : "Another subcategory"
                    }
                    autoFocus={index === 0}
                  />
                  <Select
                    value={row.minPriority}
                    items={prioritySelectItems}
                    onValueChange={(v) =>
                      setInlineDrafts((prev) =>
                        prev.map((r) =>
                          r.key === row.key
                            ? {
                                ...r,
                                minPriority:
                                  (v as TicketPriority | "none") ?? "none",
                              }
                            : r,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem
                          key={p}
                          value={p}
                          label={p === "none" ? "None" : p}
                        >
                          {p === "none" ? "None" : p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {inlineDrafts.length > 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setInlineDrafts((prev) =>
                          prev.filter((r) => r.key !== row.key),
                        )
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setInlineDrafts((prev) => [...prev, emptyDraftSub()])
                  }
                >
                  <PlusIcon />
                  Add another
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => void addSubcategoriesUnder(cat.id)}
                >
                  Save all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAddingUnderCategoryId(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

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
                    <TableCell className="font-medium">
                      {editingSubId === sub.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            className="max-w-xs"
                            value={editingSubName}
                            onChange={(e) => setEditingSubName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void saveSubcategoryName(sub.id);
                              }
                              if (e.key === "Escape") setEditingSubId(null);
                            }}
                            autoFocus
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={updateSubcategory.isPending}
                            onClick={() => void saveSubcategoryName(sub.id)}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingSubId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        sub.name
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={sub.minPriority ?? "none"}
                        items={prioritySelectItems}
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
                            <SelectItem
                              key={p}
                              value={p}
                              label={p === "none" ? "None" : p}
                            >
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
                      <div className="flex gap-1">
                        {editingSubId !== sub.id ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingSubId(sub.id);
                              setEditingSubName(sub.name);
                              setEditingCategoryId(null);
                            }}
                          >
                            Edit
                          </Button>
                        ) : null}
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
                      </div>
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
