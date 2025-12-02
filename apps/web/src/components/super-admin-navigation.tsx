import { useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  Calculator,
  ServerIcon,
  ShieldIcon,
  TestTube2,
} from "lucide-react";
import { SidebarUserButton } from "@/components/sidebar-user-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

const navigation = [
  {
    name: "Overview",
    href: "/super-admin",
    icon: BarChart3,
  },
  {
    name: "API Status",
    href: "/super-admin/api-status",
    icon: ServerIcon,
  },
  {
    name: "Counters",
    href: "/super-admin/counters",
    icon: Calculator,
  },
  {
    name: "Integration Test",
    href: "/super-admin/integration-test",
    icon: TestTube2,
  },
];

interface SuperAdminNavigationProps {
  children: React.ReactNode;
}

export function SuperAdminNavigation({ children }: SuperAdminNavigationProps) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Sidebar */}
        <Sidebar className="border-border border-r" variant="sidebar">
          <SidebarHeader className="border-border border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <ShieldIcon className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-sm">
                  Super Admin
                </span>
                <span className="text-muted-foreground text-xs">
                  SpectralNotify
                </span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Health Checks
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <a
                            className="flex items-center gap-3"
                            href={item.href}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-border border-t p-3">
            <SidebarUserButton />
          </SidebarFooter>
        </Sidebar>

        {/* Main content */}
        <SidebarInset className="flex-1">
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
