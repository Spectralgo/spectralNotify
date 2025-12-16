import { AuthQueryProvider } from "@daveyplate/better-auth-tanstack";
import { AuthUIProviderTanstack } from "@daveyplate/better-auth-ui/tanstack";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, Link, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import Loader from "./components/loader";
import { authClient } from "./lib/auth-client";
import { routeTree } from "./routeTree.gen";
import { api, queryClient } from "./utils/orpc";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <Loader />,
  context: { orpc: api, queryClient },
  Wrap({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthQueryProvider>
          <AuthUIProviderTanstack
            authClient={authClient}
            basePath=""
            viewPaths={{ SIGN_IN: "login" }}
            Link={({ href, ...props }) => <Link to={href} {...props} />}
            navigate={(href) => router.navigate({ to: href })}
            replace={(href) => router.navigate({ to: href, replace: true })}
          >
            {children}
            <Toaster />
          </AuthUIProviderTanstack>
        </AuthQueryProvider>
      </QueryClientProvider>
    );
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<RouterProvider router={router} />);
}
