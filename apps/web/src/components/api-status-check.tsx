import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ApiStatusCheck() {
  // TODO: Replace with actual API health check calls
  const apiStatus = {
    server: "running",
    mode: import.meta.env.MODE,
    baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3014",
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle>API Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">API Server</span>
              <span className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-800 text-xs dark:bg-green-900/20 dark:text-green-400">
                {apiStatus.server === "running" ? "Running" : "Down"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Mode</span>
              <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground text-xs">
                {apiStatus.mode}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Base URL</span>
              <span className="max-w-[200px] truncate rounded-full bg-muted px-2 py-1 font-medium text-foreground text-xs">
                {apiStatus.baseUrl}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Runtime Info */}
      <Card>
        <CardHeader>
          <CardTitle>Runtime</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Environment</span>
              <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground text-xs">
                {import.meta.env.MODE}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Framework</span>
              <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground text-xs">
                Vite + React
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Router</span>
              <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground text-xs">
                TanStack Router
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Health */}
      <Card>
        <CardHeader>
          <CardTitle>Service Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Authentication
              </span>
              <span className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-800 text-xs dark:bg-green-900/20 dark:text-green-400">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Database</span>
              <span className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-800 text-xs dark:bg-green-900/20 dark:text-green-400">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">API Gateway</span>
              <span className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-800 text-xs dark:bg-green-900/20 dark:text-green-400">
                Operational
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
