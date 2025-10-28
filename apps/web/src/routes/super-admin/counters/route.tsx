import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/super-admin/counters")({
  component: CountersLayoutComponent,
});

function CountersLayoutComponent() {
  return <Outlet />;
}
