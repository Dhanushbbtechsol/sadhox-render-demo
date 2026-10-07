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

export function ProjectMembersDialog({
  open,
  onOpenChange,
  project,
}: ProjectMembersDialogProps) {
  const projectId = open ? project?.id : undefined;
  const members = useProjectMembers(projectId);
  const agents = useDirectoryUsers("Agent");
  const addMember = useAddProjectMember(projectId ?? "");
  const removeMember = useRemoveProjectMember(projectId ?? "");
  const [selected, setSelected] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const available = useMemo(() => {
    const taken = new Set((members.data ?? []).map((m) => m.userId));
    return (agents.data ?? []).filter(
      (a) => a.role === "Agent" && !taken.has(a.id),
    );
  }, [agents.data, members.data]);

  const agentSelectItems = useMemo(
    () =>
      Object.fromEntries(
        available.map((a) => [a.id, `${a.name} (${a.email})`]),
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
              Add Agents who can work tickets in this project. Managers
              supervise via ownership and cannot be members.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-1">
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setPickerOpen(true)}
                disabled={available.length === 0 && !agents.isLoading}
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
                    <TableHead>Email</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(members.data ?? []).map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell className="font-medium">{m.name}</TableCell>
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
                        colSpan={3}
                        className="text-muted-foreground text-sm"
                      >
                        No Agents assigned yet. Click Add member to invite one.
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
              Choose an Agent to add to {project?.name ?? "this project"}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <Select
              value={selected || null}
              onValueChange={(value) => setSelected(value ?? "")}
              items={agentSelectItems}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an Agent" />
              </SelectTrigger>
              <SelectContent>
                {available.map((a) => (
                  <SelectItem
                    key={a.id}
                    value={a.id}
                    label={`${a.name} (${a.email})`}
                  >
                    {a.name} ({a.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {available.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No Agents available to add. They may already be members, or none
                are seeded yet.
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
