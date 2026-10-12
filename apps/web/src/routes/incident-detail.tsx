import { ArrowLeftIcon, UserIcon } from "lucide-react";
import { Link, useParams } from "react-router";

import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { IncidentActions, ReopenTicketButton } from "@/components/incidents/incident-actions";
import { TicketComments } from "@/components/comments/ticket-comments";
import { LinkToProblem } from "@/components/incidents/link-to-problem";
import { CreateProblemDialog } from "@/components/problems/create-problem-dialog";
import { SlaCountdown } from "@/components/incidents/sla-countdown";
import { RelatedArticles } from "@/components/knowledge/related-articles";
import { PriorityBadge } from "@/components/priority-badge";
import { EditTicketProjectScope } from "@/components/projects/edit-ticket-project-scope";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIncidentLinkedAssets } from "@/features/admin/hooks";
import { useProjectModules, useProjects } from "@/hooks/use-projects";
import { useIncident, useUpdateIncident } from "@/hooks/use-tickets";
import { recordReference } from "@/lib/record-reference";
import { useAuthStore } from "@/stores/auth-store";
import { INCIDENT_STATUS_LABELS } from "@/types/itsm";

function statusVariant(status: string) {
  if (status === "Resolved" || status === "Closed") return "success" as const;
  if (status === "InProgress") return "default" as const;
  return "outline" as const;
}

export default function IncidentDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useIncident(id);
  const update = useUpdateIncident(id ?? "");
  const role = useAuthStore((s) => s.user?.role);
  const canSeeLinkedAssets =
    role === "Admin" || role === "Agent" || role === "Manager";
  const linkedAssets = useIncidentLinkedAssets(canSeeLinkedAssets ? id : undefined);
  const { data: projects = [] } = useProjects();
  const { data: modules = [] } = useProjectModules(data?.projectId);

  if (isLoading) return <TicketListSkeleton rows={3} />;

  if (isError || !data) {
    return (
      <EmptyState
        title="Ticket not found"
        description={error instanceof Error ? error.message : "This ticket does not exist."}
        action={
          <Button render={<Link to="/incidents" />}>Back to queue</Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-1 sm:px-0 animate-in-up">
      <Button variant="ghost" size="sm" render={<Link to="/incidents" />} className="-ml-2">
        <ArrowLeftIcon />
        Back to queue
      </Button>

      <Card className="overflow-hidden">
        <div className="from-primary/12 via-accent/40 to-transparent h-1.5 bg-gradient-to-r" />
        <CardHeader className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 font-mono text-[11px]">
              {recordReference(data.referenceCode)}
            </span>
            <PriorityBadge priority={data.priority} />
            <Badge variant={statusVariant(data.status)}>
              {INCIDENT_STATUS_LABELS[data.status]}
            </Badge>
            <Badge variant="secondary">{data.category}</Badge>
            {data.subcategory ? (
              <Badge variant="outline">{data.subcategory}</Badge>
            ) : null}
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight">{data.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {data.description}
          </p>

          <SlaCountdown
            slaDueAt={data.slaDueAt}
            slaTargetMinutes={data.slaTargetMinutes}
            slaBreached={data.slaBreached}
          />

          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Impact", value: data.impact },
              { label: "Urgency", value: data.urgency },
              {
                label: "Project",
                value: data.projectId
                  ? (projects.find((p) => p.id === data.projectId)?.name ??
                    data.projectId.slice(0, 8))
                  : "—",
              },
              {
                label: "Module",
                value: data.moduleId
                  ? (modules.find((m) => m.id === data.moduleId)?.name ??
                    data.moduleId.slice(0, 8))
                  : "—",
              },
              {
                label: "Reporter",
                value: data.reporter?.name ?? data.reporterName ?? "—",
                icon: UserIcon,
              },
              {
                label: "Assignee",
                value: data.assignee?.name ?? data.assigneeName ?? "Unassigned",
                icon: UserIcon,
              },
              {
                label: "Response time",
                value:
                  data.slaTargetMinutes != null
                    ? `${Math.round(data.slaTargetMinutes / 60)}h resolve`
                    : "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="border-border/80 bg-muted/40 hover:bg-muted/70 rounded-xl border p-3.5 transition-colors"
              >
                <dt className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  {item.icon ? <item.icon className="size-3.5" /> : null}
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>

          {canSeeLinkedAssets ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">
                Related issue
              </h2>
              {data.linkedProblem ? (
                <Link
                  to={`/problems/${data.linkedProblem.id}`}
                  className="border-border/80 bg-muted/40 hover:bg-muted/70 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{data.linkedProblem.title}</p>
                    <p className="text-muted-foreground font-mono text-[11px]">
                      {recordReference(data.linkedProblem.referenceCode)}{" "}
                      ·{" "}
                      {data.linkedProblem.status}
                      {data.linkedProblem.knownError ? " · Known error" : ""}
                    </p>
                  </div>
                  <Badge variant="outline">{data.linkedProblem.status}</Badge>
                </Link>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">
                    No issue linked to this ticket yet.
                  </p>
                  <CreateProblemDialog
                    defaultIncidentId={data.id}
                    triggerLabel="Create issue"
                    triggerSize="sm"
                    triggerVariant="outline"
                  />
                </>
              )}
              <LinkToProblem incidentId={data.id} />
            </section>
          ) : null}

          <EditTicketProjectScope
            projectId={data.projectId}
            moduleId={data.moduleId}
            busy={update.isPending}
            onSave={async (next) => {
              await update.mutateAsync(next);
            }}
          />

          <ReopenTicketButton incident={data} />
          <IncidentActions incident={data} />

          <RelatedArticles ticketType="incident" ticketId={data.id} />

          {canSeeLinkedAssets ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">Linked assets</h2>
              {linkedAssets.isLoading ? <Skeleton className="h-16" /> : null}
              {linkedAssets.isError ? (
                <p className="text-muted-foreground text-sm">
                  Unable to load linked assets.
                </p>
              ) : null}
              {linkedAssets.data && linkedAssets.data.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No assets linked to this ticket.
                </p>
              ) : null}
              {linkedAssets.data && linkedAssets.data.length > 0 ? (
                <ul className="space-y-2">
                  {linkedAssets.data.map((asset) => (
                    <li
                      key={asset.id}
                      className="border-border/80 bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {asset.assetTag}{" "}
                          <span className="text-muted-foreground font-normal">
                            · {asset.name}
                          </span>
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {asset.type} · {asset.status}
                          {asset.ownerName ? ` · ${asset.ownerName}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline">{asset.status}</Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-muted-foreground text-[11px]">
                Purchase cost is Admin-only and is never shown here.
              </p>
            </section>
          ) : null}

          <TicketComments ticketType="incident" ticketId={data.id} />
        </CardContent>
      </Card>
    </div>
  );
}
