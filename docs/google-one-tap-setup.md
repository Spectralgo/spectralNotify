# Google One Tap Authentication Setup

This guide explains how to add Google One Tap sign-in to Spectral apps using Better Auth.

> **⚠️ Important:** All examples use placeholder values. Adapt ports, URLs, and paths to match your specific project structure.

## Overview

One Tap provides a streamlined Google sign-in experience:
- No redirect to Google's OAuth page
- Popup appears directly on your page
- User selects account and signs in with one click

## Prerequisites

- Better Auth configured in your app
- Google OAuth Client ID from GCP Console
- Google social provider already set up in Better Auth

## Values to Adapt

| Placeholder | Example | Your Value |
|-------------|---------|------------|
| `localhost:3014` | Web app dev port | Your web app port |
| `localhost:8094` | Server dev port | Your server port |
| `your-app.spectralgo.com` | Production web URL | Your production domain |
| `your-api.spectralgo.com` | Production API URL | Your production API domain |
| `packages/auth/src/index.ts` | Auth config path | Your auth config location |
| `src/lib/auth-client.ts` | Client config path | Your client config location |

---

## Step 1: Server-Side Setup

### Add the One Tap Plugin

In your auth configuration file (e.g., `packages/auth/src/index.ts`):

```typescript
import { betterAuth } from "better-auth";
import { oneTap } from "better-auth/plugins";

export const auth = betterAuth({
  // ... your existing config

  plugins: [
    // ... other plugins
    oneTap(),
  ],
});
```

### Server Options (Optional)

```typescript
oneTap({
  // Only allow existing users to sign in (disable sign-up)
  disableSignUp: false,
  // Client ID if not in social provider config
  clientId: "YOUR_CLIENT_ID",
})
```

---

## Step 2: Client-Side Setup

### Add the One Tap Client Plugin

In your auth client file (e.g., `src/lib/auth-client.ts`):

```typescript
import { createAuthClient } from "better-auth/react";
import { oneTapClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_SERVER_URL,
  plugins: [
    oneTapClient({
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      // IMPORTANT: Disable FedCM to avoid CORS issues
      // FedCM becomes mandatory in August 2025
      fedCM: false,
      // Don't auto-select account
      autoSelect: false,
      // Cancel if user clicks outside
      cancelOnTapOutside: true,
    }),
  ],
});
```

### Client Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clientId` | string | required | Google OAuth Client ID |
| `fedCM` | boolean | `true` | Enable FedCM (set to `false` for dev) |
| `autoSelect` | boolean | `false` | Auto-select if only one account |
| `cancelOnTapOutside` | boolean | `true` | Close popup on outside click |
| `context` | string | `"signin"` | Context for the prompt |

---

## Step 3: Environment Variables

> **⚠️ Adapt these values** to your project's ports and your own Google credentials from GCP Console.

### Web App (.env)

```env
# ⚠️ Change port 8094 to match YOUR server's dev port
VITE_SERVER_URL=http://localhost:8094

# ⚠️ Replace with YOUR Google OAuth Client ID from GCP Console
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Server (.env)

```env
# ⚠️ Replace with YOUR Google OAuth credentials from GCP Console
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# ⚠️ Change port 8094 to match YOUR server's dev port
# In production, use your actual API URL (e.g., https://api.yourapp.com)
BETTER_AUTH_URL=http://localhost:8094
```

---

## Step 4: Create the Sign-In Button Component

```typescript
// src/components/auth/google-sign-in-button.tsx
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
      // Build full callback URL - must be absolute URL
      const callbackURL = redirectTo
        ? new URL(redirectTo, window.location.origin).toString()
        : window.location.origin;

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
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      type="button"
      variant="outline"
    >
      {isLoading ? "Connecting..." : "Continue with Google"}
    </Button>
  );
}
```

---

## Step 5: Use in Sign-In Form

```typescript
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { GoogleSignInButton } from "./auth/google-sign-in-button";

function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  return (
    <form>
      {/* Email/password fields... */}

      <GoogleSignInButton
        redirectTo={redirectTo || "/"}
        onSuccess={() => {
          navigate({ to: redirectTo || "/" });
          toast.success("Sign in successful");
        }}
        onError={(err) => setError(err.message)}
      />
    </form>
  );
}
```

---

## Step 6: GCP Console Configuration

> **⚠️ Replace all placeholder URLs** with your actual development ports and production domains.

Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) and edit your OAuth 2.0 Client ID.

### Authorized JavaScript Origins

Add these to your OAuth Client ID configuration:

**Development (⚠️ adapt ports to your setup):**
- `http://localhost` (required - without port)
- `http://localhost:3014` (⚠️ your web app dev port)

**Production (⚠️ use your actual domains):**
- `https://your-app.example.com` (your web app domain)
- `https://your-api.example.com` (your API domain)

### Authorized Redirect URIs

For standard OAuth fallback (⚠️ adapt to your setup):

**Development:**
- `http://localhost:8094/api/auth/callback/google` (⚠️ your server dev port)

**Production:**
- `https://your-api.example.com/api/auth/callback/google` (⚠️ your API domain)

---

## Troubleshooting

### FedCM CORS Errors

**Symptom:**
```
Server did not send the correct CORS headers
FedCM get() rejects with IdentityCredentialError
```

**Solution:**
1. Set `fedCM: false` in oneTapClient config
2. Test in incognito mode (clear cached errors)
3. Check `chrome://settings/content/federatedIdentityApi` isn't blocking localhost

### "Invalid URL string" Error

**Symptom:**
```
TypeError: Invalid URL string
```

**Solution:**
The `callbackURL` must be an absolute URL, not a path:
```typescript
// ❌ Wrong
callbackURL: "/dashboard"

// ✅ Correct
callbackURL: new URL("/dashboard", window.location.origin).toString()
// Results in: "http://localhost:YOUR_PORT/dashboard"
```

### One Tap Popup Not Appearing

**Possible causes:**
1. Your `http://localhost:YOUR_PORT` not in GCP Authorized JavaScript origins
2. Browser blocking third-party sign-in (check Chrome settings)
3. Client ID mismatch between client and server
4. Missing `http://localhost` (without port) in GCP origins

### "Third-party sign in was disabled"

**Solution:**
1. Go to `chrome://settings/content/federatedIdentityApi`
2. Remove localhost from blocked sites
3. Or test in incognito mode

---

## Production Checklist

- [ ] Add production domain to GCP Authorized JavaScript origins
- [ ] Add production API domain to GCP Authorized redirect URIs
- [ ] Set `VITE_GOOGLE_CLIENT_ID` in production environment
- [ ] Verify `trustedOrigins` in server auth config includes production domain
- [ ] Test in production with real Google accounts

---

## References

- [Better Auth One Tap Plugin](https://www.better-auth.com/docs/plugins/one-tap)
- [Google One Tap Documentation](https://developers.google.com/identity/gsi/web/guides/display-google-one-tap)
- [FedCM Migration Guide](https://developers.google.com/identity/gsi/web/guides/fedcm-migration)
