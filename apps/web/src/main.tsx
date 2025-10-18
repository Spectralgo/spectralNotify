import { AuthQueryProvider } from "@daveyplate/better-auth-tanstack";
import { AuthUIProviderTanstack } from "@daveyplate/better-auth-ui/tanstack";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createRouter,
  Link,
  RouterProvider,
  useRouter,
} from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import Loader from "./components/loader";
import { authClient } from "./lib/auth-client";
import { routeTree } from "./routeTree.gen";
import { orpc, queryClient } from "./utils/orpc";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <Loader />,
  context: { orpc, queryClient },
  Wrap({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthQueryProvider>
          <AuthProviderWrapper>{children}</AuthProviderWrapper>
        </AuthQueryProvider>
      </QueryClientProvider>
    );
  },
});

function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <AuthUIProviderTanstack
      authClient={authClient}
      Link={({ href, ...props }) => <Link to={href} {...props} />}
      navigate={(href) => router.navigate({ to: href })}
      replace={(href) => router.navigate({ to: href, replace: true })}
    >
      {children}
    </AuthUIProviderTanstack>
  );
}

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
