import { Button } from "@/components/ui/button";

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
