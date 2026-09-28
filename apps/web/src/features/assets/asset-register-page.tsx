import { useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
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
import { useAssets } from "@/features/admin/hooks";
import type { AssetCategory, AssetStatus } from "@/features/admin/types";

const categories: Array<AssetCategory | "all"> = ["all", "Hardware", "Software", "Network"];
const statuses: Array<AssetStatus | "all"> = [
  "all",
  "Procured",
  "Active",
  "Under Maintenance",
  "Retired",
];

function statusVariant(status: AssetStatus) {
  if (status === "Active") return "default" as const;
  if (status === "Retired") return "destructive" as const;
  if (status === "Under Maintenance") return "outline" as const;
  return "secondary" as const;
}

export default function AssetRegisterPage() {
  const assets = useAssets();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AssetCategory | "all">("all");
  const [status, setStatus] = useState<AssetStatus | "all">("all");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (assets.data ?? []).filter((asset) => {
      const matchesQuery =
        needle.length === 0 ||
        asset.assetTag.toLowerCase().includes(needle) ||
        asset.name.toLowerCase().includes(needle);
      const matchesCategory = category === "all" || asset.category === category;
      const matchesStatus = status === "all" || asset.status === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [assets.data, query, category, status]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Asset register</h1>
        <p className="text-sm text-muted-foreground">
          Hardware, software, and network inventory. Records are mocked for this phase.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tag or name"
          className="sm:max-w-xs"
        />
        <Select
          value={category}
          onValueChange={(value) => setCategory(value as AssetCategory | "all")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "all" ? "All categories" : item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as AssetStatus | "all")}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "all" ? "All statuses" : item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {assets.isLoading ? <Skeleton className="h-64" /> : null}

      {assets.data && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assets match these filters.</p>
      ) : null}

      {assets.data && rows.length > 0 ? (
        <div className="ring-foreground/10 overflow-x-auto bg-card ring-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Linked Tickets</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.assetTag}</TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.category}</TableCell>
                  <TableCell>{asset.ownerName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(asset.status)}>{asset.status}</Badge>
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
                          onClick={() => toast(`View ${asset.assetTag} arrives in Phase 2`)}
                        >
                          View
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
