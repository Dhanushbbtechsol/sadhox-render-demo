import { useMemo, useState } from "react";

import { RelatedHelpArticles } from "@/components/catalog/related-help-articles";
import { RequestFormBody } from "@/components/catalog/request-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServiceCatalog } from "@/hooks/use-service-catalog";
import type { ServiceCatalogItem } from "@/types/api";

function catalogSubcategoryLabel(item: ServiceCatalogItem): string {
  const subcategory = item.subcategory?.trim();
  return subcategory || item.name;
}

export function RequestFromCatalogButton() {
  const { data, isLoading, isError } = useServiceCatalog();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");

  const categories = useMemo(() => {
    const departments = new Set((data ?? []).map((item) => item.department));
    return [...departments].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const subcategoryOptions = useMemo(() => {
    if (!category) return [];
    const labels = new Map<string, ServiceCatalogItem>();
    for (const item of data ?? []) {
      if (item.department !== category) continue;
      const label = catalogSubcategoryLabel(item);
      if (!labels.has(label)) labels.set(label, item);
    }
    return [...labels.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, item]) => ({ label, item }));
  }, [data, category]);

  const selectedItem = useMemo(() => {
    if (!category || !subcategory) return null;
    return (
      subcategoryOptions.find((option) => option.label === subcategory)?.item ??
      null
    );
  }, [category, subcategory, subcategoryOptions]);

  function resetSelection() {
    setCategory("");
    setSubcategory("");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetSelection();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" />}>Request</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {selectedItem
              ? `Request Service — ${selectedItem.name}`
              : "Request Service"}
          </DialogTitle>
          <DialogDescription>
            {selectedItem?.description ||
              "Choose a category and subcategory, then complete the request form."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading catalog…</p>
        ) : isError ? (
          <p className="text-destructive text-sm">Failed to load catalog.</p>
        ) : !data?.length ? (
          <p className="text-muted-foreground text-sm">
            No active catalog items are available to request.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-category">Category *</Label>
              <Select
                value={category || undefined}
                onValueChange={(value) => {
                  setCategory(value ?? "");
                  setSubcategory("");
                }}
              >
                <SelectTrigger id="request-category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-subcategory">Subcategory *</Label>
              <Select
                value={subcategory || undefined}
                onValueChange={(value) => setSubcategory(value ?? "")}
                disabled={!category}
              >
                <SelectTrigger id="request-subcategory" className="w-full">
                  <SelectValue
                    placeholder={
                      category ? "Select subcategory" : "Select a category first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {subcategoryOptions.map(({ label }) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedItem ? (
              <div className="space-y-4 border-t pt-4">
                <RelatedHelpArticles department={selectedItem.department} />
                <RequestFormBody
                  key={selectedItem.id}
                  item={selectedItem}
                  onOpenChange={handleOpenChange}
                />
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
