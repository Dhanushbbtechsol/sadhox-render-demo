import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ProjectModuleFields } from "@/components/projects/project-module-fields";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

type ScopePayload = {
  projectId: string | null;
  moduleId: string | null;
};

/**
 * Admin/Agent/Manager can move a ticket between accessible projects.
 * Manager must keep a project; Admin/Agent may clear project (shows under All projects).
 */
export function EditTicketProjectScope({
  projectId,
  moduleId,
  onSave,
  busy = false,
}: {
  projectId: string | null | undefined;
  moduleId: string | null | undefined;
  onSave: (next: ScopePayload) => Promise<unknown>;
  busy?: boolean;
}) {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit =
    role === "Admin" || role === "Agent" || role === "Manager";

  const [draftProjectId, setDraftProjectId] = useState(projectId ?? "");
  const [draftModuleId, setDraftModuleId] = useState(moduleId ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftProjectId(projectId ?? "");
    setDraftModuleId(moduleId ?? "");
  }, [projectId, moduleId]);

  if (!canEdit) return null;

  const dirty =
    (draftProjectId || null) !== (projectId ?? null) ||
    (draftModuleId || null) !== (moduleId ?? null);

  async function handleSave() {
    if (!dirty) return;
    setSaving(true);
    try {
      const nextProject = draftProjectId || null;
      await onSave({
        projectId: nextProject,
        moduleId: nextProject ? draftModuleId || null : null,
      });
      toast.success("Project scope updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update scope");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-border/80 bg-muted/30 space-y-3 rounded-xl border p-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">Project scope</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Link a project so the ticket appears in that project filter. Leave
          blank to keep it under All projects. Module is optional and must
          belong to the selected project.
        </p>
      </div>

      <ProjectModuleFields
        projectId={draftProjectId}
        moduleId={draftModuleId}
        onProjectChange={setDraftProjectId}
        onModuleChange={setDraftModuleId}
      />

      <Button
        size="sm"
        disabled={!dirty || busy || saving}
        onClick={() => void handleSave()}
      >
        {saving ? "Saving…" : "Save scope"}
      </Button>
    </div>
  );
}
