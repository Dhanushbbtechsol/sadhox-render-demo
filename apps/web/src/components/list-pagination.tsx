import { Button } from "@/components/ui/button";

/** Default page size for list tables across the app. */
export const LIST_PAGE_SIZE = 10;

export function ListPagination({
  page,
  totalPages,
  total,
  onPageChange,
  label = "items",
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-xs">
        Page {page} of {totalPages} · {total} {label}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/** Slice a client-loaded list into a page (1-based). */
export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number = LIST_PAGE_SIZE,
): {
  page: number;
  totalPages: number;
  total: number;
  items: T[];
} {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    total,
    items: items.slice(start, start + pageSize),
  };
}
