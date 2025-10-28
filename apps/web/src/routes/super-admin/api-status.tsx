import { createFileRoute } from "@tanstack/react-router";
import { ApiStatusCheck } from "@/components/api-status-check";

export const Route = createFileRoute("/super-admin/api-status")({
  component: ApiStatusPage,
});

function ApiStatusPage() {
  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl text-foreground">API Status</h1>
          <p className="mt-1 text-muted-foreground">
            Monitor API health, server status, and runtime metrics
          </p>
        </div>
      </div>

      {/* API status overview */}
      <div className="space-y-6">
        <ApiStatusCheck />

        {/* Additional monitoring can be added here */}
      </div>
    </div>
  );
}
