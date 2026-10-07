import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  useAddProjectMember,
  useDirectoryUsers,
  useProjectMembers,
  useRemoveProjectMember,
} from "./hooks";

export default function ProjectMembersPage() {
  const { id } = useParams<{ id: string }>();
  const members = useProjectMembers(id);
  const agents = useDirectoryUsers("Agent");
  const addMember = useAddProjectMember(id ?? "");
  const removeMember = useRemoveProjectMember(id ?? "");
  const [selected, setSelected] = useState("");

  const available = useMemo(() => {
    const taken = new Set((members.data ?? []).map((m) => m.userId));
    return (agents.data ?? []).filter(
      (a) => a.role === "Agent" && !taken.has(a.id),
    );
  }, [agents.data, members.data]);

  if (!id) return null;

  async function onAdd() {
    if (!selected) return;
    try {
      await addMember.mutateAsync(selected);
      toast.success("Member added");
      setSelected("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Add failed");
    }
  }

  async function onRemove(userId: string) {
    try {
      await removeMember.mutateAsync(userId);
      toast.success("Member removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Remove failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Only Agents can be project members. Managers supervise via project
        ownership and cannot be added here.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={selected || undefined}
          onValueChange={(value) => setSelected(value ?? "")}
        >
          <SelectTrigger className="sm:max-w-xs">
            <SelectValue placeholder="Select Agent" />
          </SelectTrigger>
          <SelectContent>
            {available.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name} ({a.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={onAdd}
          disabled={!selected || addMember.isPending}
        >
          Add member
        </Button>
      </div>

      {members.isLoading ? <Skeleton className="h-40" /> : null}
      {members.isError ? (
        <p className="text-destructive text-sm">
          {members.error instanceof Error
            ? members.error.message
            : "Failed to load members"}
        </p>
      ) : null}

      {!members.isLoading && !members.isError ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(members.data ?? []).map((m) => (
              <TableRow key={m.userId}>
                <TableCell>{m.name}</TableCell>
                <TableCell>{m.email}</TableCell>
                <TableCell>{m.role}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(m.userId)}
                    disabled={removeMember.isPending}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(members.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No members yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
