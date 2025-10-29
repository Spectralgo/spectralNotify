"use client";

import { Inbox, ListChecks, Network, OctagonX, RadioTower } from "lucide-react";
import type * as React from "react";

import { NavMain } from "@/components/nav-main";
import { SearchButton } from "@/components/search-button";
import { SidebarUserButton } from "@/components/sidebar-user-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useTaskStats } from "@/hooks/use-tasks";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { stats } = useTaskStats();

  const activeCount = stats.pending + stats.inProgress;
  const navItems = [
    {
      title: "All Tasks",
      url: "/tasks/all",
      icon: Inbox,
      badge: stats.all > 0 ? stats.all : undefined,
    },
    {
      title: "Live Tasks",
      url: "/tasks/live",
      icon: RadioTower,
      badge: activeCount > 0 ? activeCount : undefined,
    },
    {
      title: "Completed",
      url: "/tasks/completed",
      icon: ListChecks,
      badge: stats.success > 0 ? stats.success : undefined,
    },
    {
      title: "Failed",
      url: "/tasks/failed",
      icon: OctagonX,
      badge: stats.failed > 0 ? stats.failed : undefined,
    },
    {
      title: "All Workflows",
      url: "/workflows/all",
      icon: Network,
    },
    {
      title: "Live Workflows",
      url: "/workflows/live",
      icon: RadioTower,
    },
  ];

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="px-6 py-4">
        <div className="flex items-center justify-center">
          <h1 className="relative inline-flex items-baseline font-bold text-xl">
            <span className="tracking-tight">
              Spectral
              <span className="bg-gradient-to-tr from-emerald-400 to-teal-600 bg-clip-text text-transparent">
                Notify
              </span>
            </span>
          </h1>
        </div>
      </SidebarHeader>

      {/* Search Button - Elevated input-style button */}
      <div className="px-3 py-3">
        <SearchButton onClick={() => console.log("Open search modal")} />
      </div>

      <SidebarContent className="flex-1 overflow-y-auto px-3 py-4">
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        <SidebarUserButton />
      </SidebarFooter>
    </Sidebar>
  );
}
