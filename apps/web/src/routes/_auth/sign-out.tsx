import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/sign-out")({
  component: SignOutComponent,
});

function SignOutComponent() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSignedOut, setIsSignedOut] = useState(false);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session && !isSigningOut && !isSignedOut) {
      // User is signed in, automatically sign them out
      handleSignOut();
    }
  }, [session, isSigningOut, isSignedOut]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      setIsSignedOut(true);
      // Redirect immediately after sign out
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
    }
  };

  // Show loading screen while signing out
  if (isSigningOut) {
    return <LoadingScreen message="Signing you out..." />;
  }

  // Show success message after sign out
  if (isSignedOut || !session) {
    return (
      <div className="relative isolate flex min-h-screen items-center justify-center overflow-y-auto overflow-x-hidden bg-background">
        {/* Background pattern */}
        <svg
          aria-hidden="true"
          className="-z-10 absolute inset-0 h-full w-full stroke-white/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
        >
          <defs>
            <pattern
              height={200}
              id="signout-grid-pattern"
              patternUnits="userSpaceOnUse"
              width={200}
              x="50%"
              y={-1}
            >
              <path d="M.5 200V.5H200" fill="none" />
            </pattern>
          </defs>
          <svg className="overflow-visible fill-gray-800/20" x="50%" y={-1}>
            <title>Background grid pattern decoration</title>
            <path
              d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
              strokeWidth={0}
            />
          </svg>
          <rect
            fill="url(#signout-grid-pattern)"
            height="100%"
            strokeWidth={0}
            width="100%"
          />
        </svg>

        {/* Gradient orb */}
        <div
          aria-hidden="true"
          className="-z-10 -translate-x-1/2 absolute top-0 left-[calc(50%-30rem)] transform-gpu blur-3xl"
        >
          <div
            className="aspect-[1108/632] w-[69.25rem] bg-primary opacity-20"
            style={{
              clipPath:
                "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
            }}
          />
        </div>

        {/* Content */}
        <div className="w-full px-6 py-8">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-md"
            initial={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Logo at top */}
            <div className="mb-8 block text-center">
              <h1 className="relative inline-flex items-baseline font-bold text-3xl">
                <span className="text-foreground tracking-tight">
                  Spectral
                  <span className="bg-primary bg-clip-text text-transparent">
                    Notify
                  </span>
                </span>
              </h1>
            </div>

            <Card className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-2xl backdrop-blur-xl">
              <CardContent className="p-8">
                <div className="flex flex-col gap-6">
                  {/* Header */}
                  <div className="text-center">
                    <h2 className="font-bold text-2xl text-foreground tracking-tight">
                      Signed Out Successfully
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                      You have been signed out of your account.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <Button
                      asChild
                      className="min-h-[44px] w-full"
                      type="button"
                    >
                      <Link to="/login">Sign In Again</Link>
                    </Button>
                    <Button
                      asChild
                      className="min-h-[44px] w-full"
                      type="button"
                      variant="outline"
                    >
                      <Link to="/">Go Home</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
