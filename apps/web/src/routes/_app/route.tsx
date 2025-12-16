import { RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui";
import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { generateBreadcrumbs, getPageTitleFromMatches } from "@/utils/breadcrumb";

export const Route = createFileRoute("/_app")({
  component: AppLayoutComponent,
});

function AppLayoutComponent() {
  const matches = useMatches();
  const breadcrumbs = generateBreadcrumbs(matches);
  const pageTitle = getPageTitleFromMatches(matches);

  // Find parent route for mobile back button
  const parentPath = breadcrumbs.length > 1
    ? breadcrumbs[breadcrumbs.length - 2].path
    : "/";

  return (
    <>
      <RedirectToSignIn />
      <SignedIn>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex h-[calc(100svh-20px)] max-h-[calc(100svh-20px)] flex-col overflow-hidden">
            <header className="flex h-14 shrink-0 items-center gap-2">
              <div className="flex flex-1 items-center gap-2 px-3">
                <SidebarTrigger />
                <Separator
                  className="mr-2 data-[orientation=vertical]:h-4"
                  orientation="vertical"
                />

                {/* Mobile Back Button */}
                <nav aria-label="Back" className="sm:hidden">
                  <Link
                    className="flex items-center font-medium text-muted-foreground text-sm hover:text-foreground"
                    to={parentPath}
                  >
                    <ChevronLeft
                      aria-hidden="true"
                      className="-ml-1 mr-1 size-5 shrink-0"
                    />
                    Back
                  </Link>
                </nav>

                {/* Desktop Breadcrumb */}
                <Breadcrumb className="hidden sm:flex">
                  <BreadcrumbList>
                    {breadcrumbs.map((breadcrumb, index) => (
                      <BreadcrumbItem key={breadcrumb.path}>
                        {index > 0 && (
                          <BreadcrumbSeparator>
                            <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
                          </BreadcrumbSeparator>
                        )}
                        {breadcrumb.isCurrent ? (
                          <BreadcrumbPage aria-current="page">
                            {breadcrumb.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link to={breadcrumb.path}>{breadcrumb.label}</Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>

            {/* Page Title */}
            <div className="shrink-0 px-3 pb-3 pt-3">
              <h2 className="font-bold text-2xl text-foreground tracking-tight sm:text-3xl sm:truncate">
                {pageTitle}
              </h2>
            </div>

            {/* Main Content Area - constrain to viewport */}
            <div className="min-h-0 flex-1 overflow-auto">
              <Outlet />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </SignedIn>
    </>
  );
}
