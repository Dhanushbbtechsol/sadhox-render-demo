import { PlusIcon, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { useAssets, useRetireAsset } from "@/features/admin/hooks";
import type { Asset, AssetStatus, AssetType } from "@/features/admin/types";

import { AssetFormDialog } from "./asset-form-dialog";

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

export default function AssetRegisterPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<AssetType | "all">("all");
  const [status, setStatus] = useState<AssetStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);

  const assets = useAssets({ search: query, type, status });
  const retireAsset = useRetireAsset();

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
        <div>
          <h1 className="text-xl font-semibold">Asset register</h1>
          <p className="text-sm text-muted-foreground">
            Hardware and software inventory backed by the Nest assets API.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <PlusIcon />
          New asset
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tag or name"
          className="sm:max-w-xs"
        />
        <Select value={type} onValueChange={(value) => setType(value as AssetType | "all")}>
          <SelectTrigger className="w-full sm:w-44">
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
          <SelectTrigger className="w-full sm:w-52">
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

      {assets.data && assets.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assets match these filters.</p>
      ) : null}

      {assets.data && assets.data.length > 0 ? (
        <div className="ring-foreground/10 overflow-x-auto bg-card ring-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Assigned Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Linked Tickets</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.data.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.assetTag}</TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.type}</TableCell>
                  <TableCell>{asset.ownerName ?? "Unassigned"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(asset.status)}>
                      {statusLabel(asset.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{asset.linkedTicketCount}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" aria-label="Asset actions" />
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
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <AssetFormDialog open={formOpen} onOpenChange={setFormOpen} asset={editing} />
    </div>
  );
}
