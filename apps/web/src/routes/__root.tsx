import { createORPCClient } from "@orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@spectralNotify/api/routers/index";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useState } from "react";
import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { type api, link } from "@/utils/orpc";
import "../index.css";

export interface RouterAppContext {
  orpc: typeof api;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "spectralNotify",
      },
      {
        name: "description",
        content: "spectralNotify is a web application",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  const isFetching = useRouterState({
    select: (s) => s.isLoading,
  });

  const showBuildId =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("__build");
  const buildId = (import.meta as any).env?.VITE_BUILD_ID as string | undefined;

  const [client] = useState<AppRouterClient>(() => createORPCClient(link));
  const [orpcUtils] = useState(() => createTanstackQueryUtils(client));

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        enableSystem
        storageKey="vite-ui-theme"
      >
        {isFetching ? <Loader /> : <Outlet />}
        <Toaster richColors />
        {showBuildId && buildId ? (
          <div className="pointer-events-none fixed bottom-2 left-2 z-50 font-mono text-[10px] text-muted-foreground/70">
            build {buildId}
          </div>
        ) : null}
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
    </>
  );
}
