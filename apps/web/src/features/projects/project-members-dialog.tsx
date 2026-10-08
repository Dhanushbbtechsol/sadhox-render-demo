import { PlusIcon, UserMinusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Project } from "./types";

type ProjectMembersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
};

function memberLabel(user: { name: string; role: string }) {
  return `${user.name} · ${user.role}`;
}

export function ProjectMembersDialog({
  open,
  onOpenChange,
  project,
}: ProjectMembersDialogProps) {
  const projectId = open ? project?.id : undefined;
  const members = useProjectMembers(projectId);
  const directory = useDirectoryUsers();
  const addMember = useAddProjectMember(projectId ?? "");
  const removeMember = useRemoveProjectMember(projectId ?? "");
  const [selected, setSelected] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const available = useMemo(() => {
    const taken = new Set((members.data ?? []).map((m) => m.userId));
    return (directory.data ?? [])
      .filter((u) => !taken.has(u.id))
      .slice()
      .sort((a, b) => {
        const roleCmp = a.role.localeCompare(b.role);
        return roleCmp !== 0 ? roleCmp : a.name.localeCompare(b.name);
      });
  }, [directory.data, members.data]);

  const memberSelectItems = useMemo(
    () =>
      Object.fromEntries(
        available.map((u) => [u.id, memberLabel(u)]),
      ) as Record<string, string>,
    [available],
  );

  function resetPicker() {
    setSelected("");
    setPickerOpen(false);
  }

  async function onAdd() {
    if (!selected || !projectId) return;
    try {
      await addMember.mutateAsync(selected);
      toast.success("Member added");
      resetPicker();
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
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) resetPicker();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Members{project ? ` · ${project.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Add people to this project from any role (Admin, Agent, EndUser,
              or Manager).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-1">
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setPickerOpen(true)}
                disabled={available.length === 0 && !directory.isLoading}
              >
                <PlusIcon />
                Add member
              </Button>
            </div>

            {members.isLoading ? <Skeleton className="h-32" /> : null}
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
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(members.data ?? []).map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-sm">{m.role}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {m.email}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void onRemove(m.userId)}
                          disabled={removeMember.isPending}
                          aria-label={`Remove ${m.name}`}
                        >
                          <UserMinusIcon />
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(members.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground text-sm"
                      >
                        No members yet. Click Add member to invite someone.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pickerOpen}
        onOpenChange={(next) => {
          setPickerOpen(next);
          if (!next) setSelected("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              Choose a member to add to {project?.name ?? "this project"}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <Select
              value={selected || null}
              onValueChange={(value) => setSelected(value ?? "")}
              items={memberSelectItems}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Member" />
              </SelectTrigger>
              <SelectContent>
                {available.map((u) => (
                  <SelectItem
                    key={u.id}
                    value={u.id}
                    label={memberLabel(u)}
                  >
                    {u.name}{" "}
                    <span className="text-muted-foreground">· {u.role}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {directory.isLoading ? (
              <p className="text-muted-foreground text-xs">Loading users…</p>
            ) : null}
            {!directory.isLoading && available.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No users left to add — everyone is already a member, or none are
                seeded yet.
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onAdd()}
              disabled={!selected || addMember.isPending}
            >
              {addMember.isPending ? "Adding…" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
