import { env } from "cloudflare:workers";
import { expo } from "@better-auth/expo";
import { db } from "@spectralNotify/db";
import * as schema from "@spectralNotify/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",

    schema,
  }),
  trustedOrigins: [
    env.CORS_ORIGIN,
    "http://localhost:3014", // Local development frontend
    "mybettertapp://",
    "exp://",
  ],
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
    // In development (HTTP), use lax + insecure cookies
    // In production (HTTPS), use none + secure for cross-origin requests
    defaultCookieAttributes: {
      sameSite: env.BETTER_AUTH_URL?.startsWith("https://") ? "none" : "lax",
      secure: env.BETTER_AUTH_URL?.startsWith("https://"),
      httpOnly: true,
    },
    // uncomment crossSubDomainCookies setting when ready to deploy and replace <your-workers-subdomain> with your actual workers subdomain
    // https://developers.cloudflare.com/workers/wrangler/configuration/#workersdev
    // crossSubDomainCookies: {
    //   enabled: true,
    //   domain: "<your-workers-subdomain>",
    // },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const allowedEmails = env.ALLOWED_EMAIL.split(",").map((e) =>
        e.trim().toLowerCase()
      );

      // Validate email for sign-up requests
      if (ctx.path === "/sign-up/email") {
        const email = ctx.body?.email;
        if (!email) {
          throw new APIError("BAD_REQUEST", {
            message: "Email is required",
          });
        }

        if (!allowedEmails.includes(email.toLowerCase())) {
          throw new APIError("FORBIDDEN", {
            message: "Access restricted. Only authorized users can sign up.",
          });
        }
      }

      // Validate email for sign-in requests
      if (ctx.path === "/sign-in/email") {
        const email = ctx.body?.email;
        if (!email) {
          throw new APIError("BAD_REQUEST", {
            message: "Email is required",
          });
        }

        if (!allowedEmails.includes(email.toLowerCase())) {
          throw new APIError("FORBIDDEN", {
            message: "Access restricted. Only authorized users can sign in.",
          });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      // Validate email after social sign-in callback
      if (ctx.path.startsWith("/callback/")) {
        const newSession = ctx.context.newSession;
        if (newSession) {
          const email = newSession.user.email;
          const allowedEmailsRaw = env.ALLOWED_EMAIL || "";
          const allowedEmails = allowedEmailsRaw
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter((e) => e.length > 0);

          const isAllowed = allowedEmails.includes(email.toLowerCase());
          console.log("[Auth] Email validation:", {
            userEmail: email.toLowerCase(),
            allowedEmails,
            isAllowed,
          });

          if (allowedEmails.length > 0 && !isAllowed) {
            // Delete the session if email not allowed
            const sessionId = newSession.session?.id ?? newSession.token;
            console.log("[Auth] Rejecting email, deleting session:", sessionId);
            if (sessionId) {
              await ctx.context.internalAdapter.deleteSession(sessionId);
            }
            throw new APIError("FORBIDDEN", {
              message: "Access restricted. Only authorized users can sign in.",
            });
          }
        }
      }
    }),
  },
  plugins: [expo()],
});
