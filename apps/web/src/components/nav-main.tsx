"use client";

import { useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    badge?: number;
  }[];
}) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = pathname === item.url;
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={isActive}>
              <a href={item.url}>
                <item.icon />
                <span>{item.title}</span>
                {item.badge !== undefined && (
                  <Badge className="ml-auto" size="sm" variant="count">
                    {item.badge}
                  </Badge>
                )}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
