import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronRightIcon, MoreHorizontal, PlusIcon } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";

import { LIST_PAGE_SIZE, ListPagination } from "@/components/list-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useAssetAssignments, useAssets, useRetireAsset } from "@/features/admin/hooks";
import type { Asset, AssetStatus, AssetType } from "@/features/admin/types";
import { useDirectoryUsers } from "@/features/projects/hooks";
import { apiFetch } from "@/lib/api";
import { recordReference } from "@/lib/record-reference";

import { AssetFormDialog } from "./asset-form-dialog";
import { AssetLinkTicketDialog } from "./asset-link-ticket-dialog";

/** An asset row as returned by the API — includes the AST reference (R2) not yet in the shared Asset type. */
type AssetWithReference = Asset & { referenceCode?: string | null };

/** A single holding window for one asset in a person report (R3, KTD5). */
type PersonReportRow = {
  assetId: string;
  assetTag: string;
  referenceCode: string | null;
  name: string;
  from: string;
  to: string | null;
};

const types: Array<AssetType | "all"> = ["all", "Hardware", "Software"];
const statuses: Array<AssetStatus | "all"> = ["all", "Active", "InRepair", "Retired"];

function statusVariant(status: AssetStatus) {
  if (status === "Active") return "success" as const;
  if (status === "Retired") return "destructive" as const;
  if (status === "InRepair") return "warning" as const;
  return "outline" as const;
}

function statusLabel(status: AssetStatus) {
  return status === "InRepair" ? "In repair" : status;
}

function AssetAssignmentHistory({ assetId }: { assetId: string }) {
  const assignments = useAssetAssignments(assetId);

  if (assignments.isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (assignments.isError) {
    return (
      <p className="text-destructive text-xs">
        {assignments.error instanceof Error
          ? assignments.error.message
          : "Failed to load assignment history"}
      </p>
    );
  }

  if (!assignments.data || assignments.data.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">No assignment history.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.data.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.fromOwnerName ?? "—"}</TableCell>
              <TableCell>{row.toOwnerName ?? "—"}</TableCell>
              <TableCell className="max-w-[16rem] truncate">
                {row.note ?? "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs">
                {new Date(row.createdAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Admin person holding report (R3, KTD5): an interval-overlap view, not just the current owner. */
function AssetPersonReportSection() {
  const holders = useDirectoryUsers();
  const [personId, setPersonId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [submitted, setSubmitted] = useState<{
    personId: string;
    from: string;
    to: string;
  } | null>(null);

  const fieldError =
    fromDate && toDate && fromDate > toDate
      ? "From date must be on or before the to date."
      : null;

  const report = useQuery({
    queryKey: ["assets", "report", "person", submitted],
    queryFn: async () => {
      const params = new URLSearchParams({
        personId: submitted!.personId,
        from: new Date(`${submitted!.from}T00:00:00.000Z`).toISOString(),
        to: new Date(`${submitted!.to}T23:59:59.999Z`).toISOString(),
      });
      return apiFetch<{ data: PersonReportRow[] }>(
        `/assets/report/person?${params.toString()}`,
      );
    },
    enabled: Boolean(submitted),
  });

  const rows = report.data?.data ?? [];

  return (
    <div className="ring-foreground/10 rounded-md bg-card p-4 ring-1">
      <h2 className="text-lg font-semibold">Person holding report</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Every asset a person held at any moment in the selected date range.
      </p>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!personId || !fromDate || !toDate || fieldError) return;
          setSubmitted({ personId, from: fromDate, to: toDate });
        }}
      >
        <div className="space-y-1">
          <Label>Person</Label>
          <Select
            value={personId}
            onValueChange={(value) => setPersonId(value ?? "")}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select a person" />
            </SelectTrigger>
            <SelectContent>
              {(holders.data ?? []).map((holder) => (
                <SelectItem key={holder.id} value={holder.id}>
                  {holder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="person-report-from">From</Label>
          <Input
            id="person-report-from"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="person-report-to">To</Label>
          <Input
            id="person-report-to"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={!personId || !fromDate || !toDate || Boolean(fieldError)}
        >
          Run report
        </Button>
      </form>

      {fieldError ? (
        <p className="mt-2 text-xs text-destructive">{fieldError}</p>
      ) : null}

      {report.isFetching ? <Skeleton className="mt-3 h-16 w-full" /> : null}

      {report.isError ? (
        <p className="mt-3 text-sm text-destructive">
          {report.error instanceof Error
            ? report.error.message
            : "Failed to load report"}
        </p>
      ) : null}

      {submitted && report.isSuccess && rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No holding windows in this range.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.assetId}-${row.from}`}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {recordReference(row.referenceCode, row.assetId)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(row.from).toLocaleString()}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {row.to ? new Date(row.to).toLocaleString() : "Current"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}

export default function AssetRegisterPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<AssetType | "all">("all");
  const [status, setStatus] = useState<AssetStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [linking, setLinking] = useState<Asset | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [query, type, status]);

  const assets = useAssets({
    search: query,
    type,
    status,
    page,
    pageSize: LIST_PAGE_SIZE,
  });
  const retireAsset = useRetireAsset();
  const rows = assets.data?.data ?? [];
  const total = assets.data?.total ?? 0;
  const totalPages = assets.data?.totalPages ?? 1;

  async function handleRetire(asset: Asset) {
    try {
      await retireAsset.mutateAsync(asset.id);
      toast.success(`${asset.assetTag} retired`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retire failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Asset register</h1>
          <p className="text-sm text-muted-foreground">
            Hardware and software in your inventory.
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
          New asset
        </Button>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tag or name"
          className="md:max-w-xs"
        />
        <Select value={type} onValueChange={(value) => setType(value as AssetType | "all")}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {types.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "all" ? "All types" : item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as AssetStatus | "all")}
        >
          <SelectTrigger className="w-full md:w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "all" ? "All statuses" : statusLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {assets.isLoading ? <Skeleton className="h-64" /> : null}

      {assets.isError ? (
        <p className="text-destructive text-sm">
          {assets.error instanceof Error ? assets.error.message : "Failed to load assets"}
        </p>
      ) : null}

      {assets.data && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assets match these filters.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3">
        <div className="ring-foreground/10 -mx-1 overflow-x-auto bg-card ring-1 md:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Reference</TableHead>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Linked</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((asset: AssetWithReference) => {
                const expanded = expandedId === asset.id;
                return (
                  <Fragment key={asset.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={
                            expanded
                              ? "Collapse assignment history"
                              : "Expand assignment history"
                          }
                          onClick={() =>
                            setExpandedId(expanded ? null : asset.id)
                          }
                        >
                          {expanded ? (
                            <ChevronDownIcon className="size-4" />
                          ) : (
                            <ChevronRightIcon className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {recordReference(asset.referenceCode, asset.id)}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {asset.assetTag}
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate md:max-w-none">
                        {asset.name}
                      </TableCell>
                      <TableCell>{asset.type}</TableCell>
                      <TableCell>{asset.ownerName ?? "Unassigned"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(asset.status)}>
                          {statusLabel(asset.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {asset.purchaseCost != null && asset.purchaseCost !== ""
                          ? `$${asset.purchaseCost}`
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {asset.linkedTicketId
                          ? asset.linkedTicketId.slice(0, 8)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Asset actions"
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(asset);
                                setFormOpen(true);
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setLinking(asset);
                                setLinkOpen(true);
                              }}
                            >
                              Link / unlink ticket
                            </DropdownMenuItem>
                            {asset.status !== "Retired" ? (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => void handleRetire(asset)}
                              >
                                Retire
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {expanded ? (
                      <TableRow>
                        <TableCell colSpan={10} className="bg-muted/30 p-4">
                          <p className="mb-2 text-sm font-medium">
                            Assignment history
                          </p>
                          <AssetAssignmentHistory assetId={asset.id} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <ListPagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          label="assets"
        />
        </div>
      ) : null}

      <AssetPersonReportSection />

      <AssetFormDialog open={formOpen} onOpenChange={setFormOpen} asset={editing} />
      <AssetLinkTicketDialog open={linkOpen} onOpenChange={setLinkOpen} asset={linking} />
    </div>
  );
}
