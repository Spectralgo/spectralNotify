import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "../ui/button";

interface GoogleSignInButtonProps {
  redirectTo?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function GoogleSignInButton({
  redirectTo,
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Build full callback URL - must be absolute URL, not just a path
      const callbackURL = redirectTo
        ? new URL(redirectTo, window.location.origin).toString()
        : window.location.origin;

      // Use One Tap for inline Google sign-in (no redirect to Google)
      await authClient.oneTap({
        callbackURL,
        fetchOptions: {
          onSuccess: () => {
            setIsLoading(false);
            onSuccess?.();
          },
          onError: (ctx) => {
            setIsLoading(false);
            onError?.(new Error(ctx.error.message));
          },
        },
      });
    } catch (error) {
      onError?.(error as Error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      className="min-h-[44px] w-full border-white/10 bg-white font-semibold text-gray-900 shadow-sm hover:bg-gray-50 active:scale-[0.98] dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      disabled={isLoading}
      onClick={handleGoogleSignIn}
      type="button"
      variant="outline"
    >
      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
        <title>Google</title>
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      {isLoading ? "Connecting..." : "Continue with Google"}
    </Button>
  );
}
