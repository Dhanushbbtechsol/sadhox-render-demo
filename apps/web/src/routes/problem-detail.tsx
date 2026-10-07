import { ArrowLeftIcon } from "lucide-react";
import { Link, useParams } from "react-router";

import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { RelatedArticles } from "@/components/knowledge/related-articles";
import { PriorityBadge } from "@/components/priority-badge";
import { LinkIncidentsModal } from "@/components/problems/link-incidents-modal";
import { EditTicketProjectScope } from "@/components/projects/edit-ticket-project-scope";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectModules, useProjects } from "@/hooks/use-projects";
import { useProblem, useUpdateProblem } from "@/hooks/use-tickets";
import { PROBLEM_STATUS_LABELS, type Priority } from "@/types/itsm";

export default function ProblemDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useProblem(id);
  const update = useUpdateProblem(id ?? "");
  const { data: projects = [] } = useProjects();
  const { data: modules = [] } = useProjectModules(data?.projectId);

  if (isLoading) return <TicketListSkeleton rows={3} />;

  if (isError || !data) {
    return (
      <EmptyState
        title="Problem not found"
        description={
          error instanceof Error ? error.message : "This problem does not exist."
        }
        action={
          <Button render={<Link to="/problems" />}>Back to problems</Button>
        }
      />
    );
  }

  const linked =
    data.linkedIncidents ??
    data.linkedIncidentIds.map((lid) => ({
      id: lid,
      title: lid.slice(0, 8),
      status: "—",
      priority: "P4",
    }));

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in-up">
      <Button
        variant="ghost"
        size="sm"
        render={<Link to="/problems" />}
        className="-ml-2"
      >
        <ArrowLeftIcon />
        Back to problems
      </Button>

      <Card className="overflow-hidden">
        <div className="from-primary/12 via-accent/40 to-transparent h-1.5 bg-gradient-to-r" />
        <CardHeader className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 font-mono text-[11px]">
              {data.id.slice(0, 8)}
            </span>
            <Badge variant="outline">{PROBLEM_STATUS_LABELS[data.status]}</Badge>
            {data.knownError ? (
              <Badge variant="warning">Known error</Badge>
            ) : null}
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight">
            {data.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {data.description}
          </p>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="border-border/80 bg-muted/40 rounded-xl border p-3.5">
              <dt className="text-muted-foreground text-xs font-medium">
                Project
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {data.projectId
                  ? (projects.find((p) => p.id === data.projectId)?.name ??
                    data.projectId.slice(0, 8))
                  : "Unscoped"}
              </dd>
            </div>
            <div className="border-border/80 bg-muted/40 rounded-xl border p-3.5">
              <dt className="text-muted-foreground text-xs font-medium">
                Module
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {data.moduleId
                  ? (modules.find((m) => m.id === data.moduleId)?.name ??
                    data.moduleId.slice(0, 8))
                  : "—"}
              </dd>
            </div>
          </dl>

          {data.rootCause ? (
            <div className="border-border/80 bg-muted/40 rounded-xl border p-3.5">
              <p className="text-muted-foreground text-xs font-medium">
                Root cause
              </p>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                {data.rootCause}
              </p>
            </div>
          ) : null}

          <EditTicketProjectScope
            projectId={data.projectId}
            moduleId={data.moduleId}
            busy={update.isPending}
            onSave={async (next) => {
              await update.mutateAsync(next);
            }}
          />

          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">
                Affected incidents
              </h3>
              <p className="text-muted-foreground text-xs">
                {linked.length} linked ticket{linked.length === 1 ? "" : "s"}
              </p>
            </div>
            <LinkIncidentsModal problem={data} />
          </div>

          {linked.length === 0 ? (
            <EmptyState
              title="No linked incidents"
              description="Use Link incidents to attach related tickets."
            />
          ) : (
            <ul className="space-y-2">
              {linked.map((incident) => (
                <li key={incident.id}>
                  <Link
                    to={`/incidents/${incident.id}`}
                    className="border-border/80 bg-card hover:border-primary/25 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {incident.title}
                      </span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {incident.id.slice(0, 8)} · {incident.status}
                      </span>
                    </span>
                    {["P1", "P2", "P3", "P4"].includes(incident.priority) ? (
                      <PriorityBadge priority={incident.priority as Priority} />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <RelatedArticles ticketType="problem" ticketId={data.id} />
        </CardContent>
      </Card>
    </div>
  );
}
