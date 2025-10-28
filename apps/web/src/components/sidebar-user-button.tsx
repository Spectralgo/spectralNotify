"use client";

import {
  BellIcon,
  CheckIcon,
  ChevronUp,
  CreditCardIcon,
  LaptopIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function SidebarUserButton() {
  const { theme, setTheme } = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  if (isPending || !user) return null;

  // Get user initials for avatar fallback
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "?";

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            // Layout
            "h-auto w-full justify-start gap-3 px-3 py-2",

            // Cursor
            "cursor-pointer",

            // Hover state - subtle background
            "hover:bg-sidebar-accent",

            // Focus state - REQUIRED 3px ring
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",

            // Transition
            "transition-colors duration-200",

            // Active/open state
            "data-[state=open]:bg-sidebar-accent"
          )}
          variant="ghost"
        >
          {/* Avatar */}
          <Avatar className="h-8 w-8 border border-border/50">
            <AvatarImage
              alt={user.name ?? "User"}
              src={user.image ?? undefined}
            />
            <AvatarFallback className="bg-primary/10 font-medium text-primary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex min-w-0 flex-1 flex-col items-start overflow-hidden text-left">
            <span className="block w-full truncate font-medium text-sidebar-foreground text-sm">
              {user.name ?? "Unknown User"}
            </span>
            <span className="block w-full truncate text-muted-foreground text-xs">
              {user.email}
            </span>
          </div>

          {/* Chevron indicator */}
          <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-56"
        onCloseAutoFocus={(e) => e.preventDefault()}
        side="top"
        sideOffset={8}
      >
        {/* User Info Header */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-10 shrink-0 border border-border/50">
              <AvatarImage
                alt={user.name ?? "User"}
                src={user.image ?? undefined}
              />
              <AvatarFallback className="bg-primary/10 font-medium text-primary text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="truncate font-medium text-sm">
                {user.name || user.email || "User"}
              </div>
              {user.email && user.name && (
                <div className="truncate text-muted-foreground text-xs">
                  {user.email}
                </div>
              )}
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Core Menu Items */}
        <DropdownMenuItem className="cursor-pointer gap-3 py-2.5">
          <UserIcon className="h-4 w-4" />
          <span>Account</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer gap-3 py-2.5">
          <CreditCardIcon className="h-4 w-4" />
          <span>Billing</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer gap-3 py-2.5">
          <BellIcon className="h-4 w-4" />
          <span>Notifications</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Theme Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer gap-3 py-2.5">
            {theme === "dark" ? (
              <MoonIcon className="h-4 w-4" />
            ) : theme === "light" ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <LaptopIcon className="h-4 w-4" />
            )}
            <span>Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              className="cursor-pointer gap-3"
              onClick={() => setTheme("light")}
            >
              <SunIcon className="h-4 w-4" />
              <span>Light</span>
              {theme === "light" && <CheckIcon className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-3"
              onClick={() => setTheme("dark")}
            >
              <MoonIcon className="h-4 w-4" />
              <span>Dark</span>
              {theme === "dark" && <CheckIcon className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-3"
              onClick={() => setTheme("system")}
            >
              <LaptopIcon className="h-4 w-4" />
              <span>System</span>
              {theme === "system" && <CheckIcon className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem
          className="cursor-pointer gap-3 py-2.5 text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOutIcon className="h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
