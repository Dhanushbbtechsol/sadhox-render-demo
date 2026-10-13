import { PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ListPagination, paginateItems } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
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

import { recordReference } from "@/lib/record-reference";

import { UserFormDialog } from "./user-form-dialog";
import { useAdminUsers, type AdminUser } from "./use-admin-users";

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = users.data ?? [];
    if (!needle) return rows;
    return rows.filter(
      (user) =>
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        user.role.toLowerCase().includes(needle),
    );
  }, [query, users.data]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const paged = paginateItems(filtered, page);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Create accounts and update name, email, role, or password. Only
            Admins can manage users.
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
          New user
        </Button>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name, email, or role"
        className="md:max-w-xs"
      />

      {users.isLoading ? <Skeleton className="h-64" /> : null}

      {users.isError ? (
        <p className="text-destructive text-sm">
          {users.error instanceof Error
            ? users.error.message
            : "Failed to load users"}
        </p>
      ) : null}

      {users.data && filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {query.trim()
            ? "No users match this search."
            : "No users yet. Create one to get started."}
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="ring-foreground/10 -mx-1 overflow-x-auto bg-card ring-1 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {recordReference(user.referenceCode)}
                    </TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(user);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ListPagination
            page={paged.page}
            totalPages={paged.totalPages}
            total={paged.total}
            onPageChange={setPage}
            label="users"
          />
        </div>
      ) : null}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
      />
    </div>
  );
}
