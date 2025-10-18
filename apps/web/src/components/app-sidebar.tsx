"use client"

import * as React from "react"
import {
  Inbox,
  ListChecks,
  OctagonX,
  RadioTower,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { SearchButton } from "@/components/search-button"
import { SidebarUserButton } from "@/components/sidebar-user-button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "All Tasks",
      url: "/tasks/all",
      icon: Inbox,
    },
    {
      title: "Live Tasks",
      url: "/tasks/live",
      icon: RadioTower,
      isActive: true,
    },
    {
      title: "Completed",
      url: "/tasks/completed",
      icon: ListChecks,
    },
    {
      title: "Failed",
      url: "/tasks/failed",
      icon: OctagonX,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="border-b px-6 py-4">
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
      <div className="border-b px-3 py-3">
        <SearchButton onClick={() => console.log("Open search modal")} />
      </div>

      <SidebarContent className="flex-1 overflow-y-auto px-3 py-4">
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        <SidebarUserButton />
      </SidebarFooter>
    </Sidebar>
  )
}
