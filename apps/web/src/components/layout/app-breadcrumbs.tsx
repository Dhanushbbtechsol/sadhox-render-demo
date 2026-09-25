import { Fragment } from "react";
import { useMatches } from "react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface CrumbHandle {
  breadcrumb?: string | ((data: unknown) => string);
}

export function AppBreadcrumbs() {
  const matches = useMatches();

  const crumbs = matches
    .filter((match) => Boolean((match.handle as CrumbHandle | undefined)?.breadcrumb))
    .map((match) => {
      const handle = match.handle as CrumbHandle;
      const label =
        typeof handle.breadcrumb === "function"
          ? handle.breadcrumb(match.pathname)
          : handle.breadcrumb!;
      return { pathname: match.pathname, label };
    });

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.pathname}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink to={crumb.pathname}>{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
