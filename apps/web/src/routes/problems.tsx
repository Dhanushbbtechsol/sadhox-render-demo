import { useEffect, useState } from "react";
import { Link } from "react-router";

import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { LIST_PAGE_SIZE, ListPagination } from "@/components/list-pagination";
import { CreateProblemDialog } from "@/components/problems/create-problem-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/use-projects";
import { recordReference } from "@/lib/record-reference";
import { useProblems } from "@/hooks/use-tickets";
import { cn } from "@/lib/utils";
import { PROBLEM_STATUS_LABELS } from "@/types/itsm";

const PAGE_SIZE = LIST_PAGE_SIZE;

export default function ProblemsPage() {
  const [page, setPage] = useState(1);
  const [projectFilter, setProjectFilter] = useState("all");
  const { data: projects = [] } = useProjects();

  useEffect(() => {
    setPage(1);
  }, [projectFilter]);

  const { data, isLoading, isError, error } = useProblems({
    page,
    pageSize: PAGE_SIZE,
    projectId: projectFilter === "all" ? undefined : projectFilter,
  });
  const problems = data?.data;
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const projectName = (id: string | null | undefined) => {
    if (!id) return "Unscoped";
    return projects.find((p) => p.id === id)?.name ?? id.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 animate-in-up">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Issues</h1>
          <p className="text-muted-foreground text-sm">
            Root-cause records linked to recurring tickets.
          </p>
        </div>
        <CreateProblemDialog />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          items={{
            all: "All projects",
            ...Object.fromEntries(
              projects.map((project) => [project.id, project.name]),
            ),
          }}
          value={projectFilter}
          onValueChange={(v) => v && setProjectFilter(v)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Project">
              {(value: string | null) => {
                if (!value || value === "all") return "All projects";
                return (
                  projects.find((p) => p.id === value)?.name ?? "Project"
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" label="All projects">
              All projects
            </SelectItem>
            {projects.map((project) => (
              <SelectItem
                key={project.id}
                value={project.id}
                label={project.name}
              >
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <TicketListSkeleton /> : null}

      {isError ? (
        <EmptyState
          title="Could not load problems"
          description={error instanceof Error ? error.message : "Unknown error"}
        />
      ) : null}

      {!isLoading && !isError && problems?.length === 0 ? (
        <EmptyState
          title="No problems recorded"
          description="Problem records will appear here once agents link recurring incidents."
        />
      ) : null}

      {!isLoading && problems && problems.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-2">
            {problems.map((problem, index) => (
              <Link
                key={problem.id}
                to={`/problems/${problem.id}`}
                className={cn(
                  "border-border/80 bg-card block space-y-2.5 rounded-xl border px-4 py-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lift animate-in-up",
                  index === 1 && "stagger-1",
                  index === 2 && "stagger-2",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground bg-muted/80 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                    {recordReference(problem.referenceCode)}
                  </span>
                  <Badge variant="outline">
                    {PROBLEM_STATUS_LABELS[problem.status]}
                  </Badge>
                  {problem.knownError ? (
                    <Badge variant="warning">Known error</Badge>
                  ) : null}
                  <Badge variant="secondary">
                    {projectName(problem.projectId)}
                  </Badge>
                </div>
                <p className="text-sm font-semibold tracking-tight">
                  {problem.title}
                </p>
                <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                  {problem.description}
                </p>
                <p className="text-muted-foreground text-xs">
                  Linked issues:{" "}
                  {problem.linkedIncidents?.length
                    ? problem.linkedIncidents
                        .map((item) => recordReference(item.referenceCode))
                        .join(", ")
                    : "None"}
                </p>
              </Link>
            ))}
          </div>

          <ListPagination
            page={page}
            totalPages={totalPages}
            total={meta?.total ?? problems.length}
            onPageChange={setPage}
            label="problems"
          />
        </div>
      ) : null}
    </div>
  );
}
