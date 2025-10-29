import type { AnyRouteMatch } from "@tanstack/react-router";

export interface BreadcrumbSegment {
  label: string;
  path: string;
  isCurrent: boolean;
}

/**
 * Generates breadcrumb segments from TanStack Router matches
 * Automatically extracts labels from route staticData or formats from pathname
 */
export function generateBreadcrumbs(matches: AnyRouteMatch[]): BreadcrumbSegment[] {
  const breadcrumbs: BreadcrumbSegment[] = [];

  // Filter out only the root route; keep other matches even if their ids include "/_"
  const visibleMatches = matches.filter((match) => match.routeId !== "__root__");

  if (visibleMatches.length === 0) return breadcrumbs;

  // Build breadcrumb trail
  for (let i = 0; i < visibleMatches.length; i++) {
    const match = visibleMatches[i];
    const isCurrent = i === visibleMatches.length - 1;

    // Skip root route if it's not the current page
    if (match.pathname === "/" && !isCurrent) {
      continue;
    }

    // Try to get label from staticData (breadcrumb or title), otherwise format pathname
    const label =
      match.staticData?.breadcrumb ||
      match.staticData?.title ||
      formatPathSegment(match.pathname);

    breadcrumbs.push({
      label,
      path: match.pathname,
      isCurrent,
    });
  }

  return breadcrumbs;
}

/**
 * Returns the best page title using the current route match.
 * Prefers `staticData.title` from the deepest match; falls back to breadcrumb label.
 */
export function getPageTitleFromMatches(matches: AnyRouteMatch[]): string {
  const visibleMatches = matches.filter((match) => match.routeId !== "__root__");
  const current = visibleMatches.at(-1);
  const staticTitle = current && (current.staticData as any)?.title;
  if (typeof staticTitle === "string" && staticTitle.trim().length > 0) {
    return staticTitle;
  }
  // Fallback to title derived from breadcrumbs
  return getPageTitle(generateBreadcrumbs(matches));
}

/**
 * Formats a path segment into a readable label
 */
function formatPathSegment(path: string): string {
  const segments = path.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "home";

  // Convert kebab-case to Title Case
  return lastSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Gets the current page title from breadcrumbs
 */
export function getPageTitle(breadcrumbs: BreadcrumbSegment[]): string {
  const current = breadcrumbs.find((b) => b.isCurrent);
  return current?.label || "Home";
}
