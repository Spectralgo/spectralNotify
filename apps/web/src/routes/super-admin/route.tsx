import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SuperAdminNavigation } from "@/components/super-admin-navigation";

export const Route = createFileRoute("/super-admin")({
  component: SuperAdminLayoutComponent,
});

function SuperAdminLayoutComponent() {
  // TODO: Add super-admin authorization check
  // const { user } = useAuth();
  // if (!user?.isSuperAdmin) redirect to home

  return (
    <div className="min-h-screen bg-background">
      <SuperAdminNavigation>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-10">
            <Outlet />
          </div>
        </div>
      </SuperAdminNavigation>
    </div>
  );
}
