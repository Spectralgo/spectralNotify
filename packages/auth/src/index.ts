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
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
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
      // Validate email for sign-up requests
      if (ctx.path === "/sign-up/email") {
        const email = ctx.body?.email;
        if (!email) {
          throw new APIError("BAD_REQUEST", {
            message: "Email is required",
          });
        }

        const allowedEmails = env.ALLOWED_EMAIL.split(",").map((e) =>
          e.trim().toLowerCase()
        );

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

        const allowedEmails = env.ALLOWED_EMAIL.split(",").map((e) =>
          e.trim().toLowerCase()
        );

        if (!allowedEmails.includes(email.toLowerCase())) {
          throw new APIError("FORBIDDEN", {
            message: "Access restricted. Only authorized users can sign in.",
          });
        }
      }
    }),
  },
  plugins: [expo()],
});
