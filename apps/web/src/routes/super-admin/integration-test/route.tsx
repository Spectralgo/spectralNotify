import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/super-admin/integration-test")({
  component: IntegrationTestLayoutComponent,
});

function IntegrationTestLayoutComponent() {
  return <Outlet />;
}
