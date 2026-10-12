import { ArrowLeftIcon, UserIcon } from "lucide-react";
import { Link, useParams } from "react-router";

import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { TicketComments } from "@/components/comments/ticket-comments";
import { SlaCountdown } from "@/components/incidents/sla-countdown";
import { RelatedArticles } from "@/components/knowledge/related-articles";
import { PriorityBadge } from "@/components/priority-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIncident } from "@/hooks/use-tickets";
import { recordReference } from "@/lib/record-reference";
import { INCIDENT_STATUS_LABELS } from "@/types/itsm";

function statusVariant(status: string) {
  if (status === "Resolved" || status === "Closed") return "success" as const;
  if (status === "InProgress") return "default" as const;
  return "outline" as const;
}

/** End User portal incident detail — read-only agent controls omitted. */
export default function PortalIncidentDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useIncident(id);

  if (isLoading) return <TicketListSkeleton rows={3} />;

  if (isError || !data) {
    return (
      <EmptyState
        title="Incident not found"
        description={
          error instanceof Error ? error.message : "This ticket does not exist."
        }
        action={
          <Button render={<Link to="/incidents" />}>Back to incidents</Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-1 sm:px-0 animate-in-up">
      <Button
        variant="ghost"
        size="sm"
        render={<Link to="/incidents" />}
        className="-ml-2"
      >
        <ArrowLeftIcon />
        Back to incidents
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
          <CardTitle className="text-xl font-semibold tracking-tight">
            {data.title}
          </CardTitle>
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
                label: "Assignee",
                value: data.assignee?.name ?? data.assigneeName ?? "Unassigned",
                icon: UserIcon,
              },
              {
                label: "Opened",
                value: new Date(data.createdAt).toLocaleString(),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="border-border/80 bg-muted/40 rounded-xl border p-3.5"
              >
                <dt className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  {item.icon ? <item.icon className="size-3.5" /> : null}
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>

          <RelatedArticles
            ticketType="incident"
            ticketId={data.id}
            readOnly
          />

          <TicketComments ticketType="incident" ticketId={data.id} />
        </CardContent>
      </Card>
    </div>
  );
}
