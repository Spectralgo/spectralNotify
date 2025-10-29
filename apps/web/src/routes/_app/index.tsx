import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/utils/orpc";

export const Route = createFileRoute("/_app/")({
  component: HomeComponent,
});

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

function HomeComponent() {
  const healthCheck = useQuery(api.healthCheck.queryOptions());

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Welcome Home</h1>
          <p className="mt-1 text-muted-foreground">
            Better T-Stack - Your modern full-stack application
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <pre className="overflow-x-auto font-mono text-xs opacity-50">
          {TITLE_TEXT}
        </pre>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 font-semibold text-lg">API Status</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${healthCheck.data ? "bg-primary" : "bg-destructive"}`}
            />
            <span className="text-sm">
              {healthCheck.isLoading
                ? "Checking..."
                : healthCheck.data
                  ? "Connected"
                  : "Disconnected"}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
