import { env } from "cloudflare:workers";
import { expo } from "@better-auth/expo";
import { db } from "@spectralNotify/db";
import * as schema from "@spectralNotify/db/schema/auth";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

const parseOrigins = (value?: string): string[] =>
  value?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];

const trustedOrigins = Array.from(
  new Set([
    ...parseOrigins(env.CORS_ORIGIN),
    // Dev origins
    "http://localhost:3014",
    "http://localhost:8094",
    // Production origins
    "https://notify.spectralgo.com",
    "https://notify-api.spectralgo.com",
    // Expo/React Native deep link schemes - use wildcard pattern
    "mybettertapp://*",
    "exp://*",
  ]),
).filter((origin) => origin.length > 0);

const isSecureOrigin = env.BETTER_AUTH_URL?.startsWith("https://") ?? false;
const cookieDomain = env.BETTER_AUTH_COOKIE_DOMAIN?.trim();

// Cross-subdomain session cookies (for sharing sessions across subdomains)
const crossSubDomainConfig =
  cookieDomain && isSecureOrigin
    ? {
        crossSubDomainCookies: {
          enabled: true,
          domain: cookieDomain,
        },
      }
    : {};

// Explicit state cookie config for OAuth flows
// This is critical: crossSubDomainCookies only affects session cookies,
// but the OAuth state cookie needs SameSite=None for cross-origin OAuth
// NOTE: Don't set domain here - let the browser use the request origin domain
// maxAge: 300 (5 min) ensures stale cookies expire quickly if cleanup hook fails
const stateCookieConfig = isSecureOrigin
  ? {
      cookies: {
        state: {
          attributes: {
            sameSite: "none" as const,
            secure: true,
            maxAge: 300, // 5 minutes - OAuth should complete well within this
          },
        },
      },
    }
  : {};

// Helper function to check if email is in whitelist
const isEmailWhitelisted = (email: string, whitelist?: string): boolean => {
  // If whitelist is empty or not set, allow all users
  if (!whitelist || whitelist.trim() === "") {
    return true;
  }
  
  // Parse comma-separated emails and check if email is in the list
  const allowedEmails = whitelist
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  
  return allowedEmails.includes(email.toLowerCase());
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",

    schema,
  }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
  // uncomment cookieCache setting when ready to deploy to Cloudflare using *.workers.dev domains
  // session: {
  //   cookieCache: {
  //     enabled: true,
  //     maxAge: 60,
  //   },
  // },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    // Force secure cookies in production
    useSecureCookies: isSecureOrigin,
    // In development (HTTP), use lax + insecure cookies
    // In production (HTTPS), use none + secure for cross-origin requests
    defaultCookieAttributes: {
      sameSite: isSecureOrigin ? "none" : "lax",
      secure: isSecureOrigin,
      httpOnly: true,
    },
    // Explicit state cookie config for OAuth (critical for cross-subdomain)
    ...stateCookieConfig,
    // Enable cross-subdomain cookies when an explicit domain is configured.
    ...crossSubDomainConfig,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email;
          const whitelist = env.ALLOWED_EMAIL;
          
          if (!isEmailWhitelisted(email, whitelist)) {
            throw new APIError("BAD_REQUEST", {
              message: "Your email is not authorized to sign up",
            });
          }
          
          return { data: user };
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          // Get user email from the session's userId
          // Create a properly configured drizzle instance with schema
          const database = drizzle(env.DB, {
            schema,
          });
          
          const user = await database
            .select()
            .from(schema.user)
            .where(eq(schema.user.id, session.userId))
            .get();
          
          if (user) {
            const whitelist = env.ALLOWED_EMAIL;
            
            if (!isEmailWhitelisted(user.email, whitelist)) {
              throw new APIError("FORBIDDEN", {
                message: "Your email is not authorized to access this resource",
              });
            }
          }
          
          return { data: session };
        },
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Only clear state cookies in production - the setHeader call overwrites
      // the session cookie in dev mode, breaking authentication
      if (!isSecureOrigin) return;

      // Clear state cookies after OAuth callback to prevent stale cookie accumulation
      // This fixes the state_mismatch error caused by multiple state cookies
      // See: https://github.com/better-auth/better-auth/issues/5292
      if (ctx.path.startsWith("/callback/")) {
        const expiredDate = new Date(0).toUTCString();
        const secureCookies = [
          "__Secure-better-auth.state",
          "better-auth.state",
        ];
        for (const cookieName of secureCookies) {
          if (cookieDomain) {
            ctx.setHeader(
              "Set-Cookie",
              `${cookieName}=; Expires=${expiredDate}; Max-Age=0; Path=/; Domain=${cookieDomain}; Secure; SameSite=None`,
            );
          }
          ctx.setHeader(
            "Set-Cookie",
            `${cookieName}=; Expires=${expiredDate}; Max-Age=0; Path=/; Secure; SameSite=None`,
          );
        }
      }
    }),
  },
  plugins: [expo()],
});
