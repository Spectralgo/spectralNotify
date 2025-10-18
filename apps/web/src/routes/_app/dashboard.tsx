import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/dashboard")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        to: "/login",
        throw: true,
      });
    }
    return { session };
  },
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  const privateData = useQuery(orpc.privateData.queryOptions());

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back, {session.data?.user.name}
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-medium text-muted-foreground text-sm">
            API Status
          </h3>
          <p className="mt-2 font-bold text-2xl">
            {privateData.isLoading ? "Loading..." : privateData.data?.message}
          </p>
        </div>
      </div>
    </div>
  );
}
