import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/super-admin/")({
  component: SuperAdminOverviewPage,
});

function SuperAdminOverviewPage() {
  return (
    <div className="space-y-12">
      {/* System Overview Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-border border-b pb-12 md:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground text-lg">
            System Overview
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Monitor key system metrics and health status.
          </p>
        </div>

        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Application</span>
                  <span className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-800 text-xs dark:bg-green-900/20 dark:text-green-400">
                    Running
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Environment</span>
                  <span className="text-foreground">
                    {import.meta.env.MODE}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Framework</span>
                  <span className="text-foreground">
                    Vite + TanStack Router
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-border border-b pb-12 md:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground text-lg">
            Quick Actions
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Access administrative tools and health checks.
          </p>
        </div>

        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Health Checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a href="/super-admin/api-status">
                <Button className="w-full justify-start" variant="ghost">
                  Check API Status →
                </Button>
              </a>
              <a href="/super-admin/counters">
                <Button className="w-full justify-start" variant="ghost">
                  Manage Counters →
                </Button>
              </a>
              <a href="/super-admin/tasks">
                <Button className="w-full justify-start" variant="ghost">
                  Manage Tasks →
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
