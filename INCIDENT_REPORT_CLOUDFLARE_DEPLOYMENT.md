# Incident Report: Cloudflare Workers Deployment Issues

**Date:** October 17, 2025
**Project:** spectralNotify
**Tech Stack:** Alchemy IaC, Cloudflare Workers, Vite, React, Better Auth
**Status:** RESOLVED

---

## Executive Summary

During the deployment of redesigned authentication forms, the production Cloudflare Workers deployment broke, returning 404 errors for all routes. The root cause was introducing incompatible configuration changes to the Vite resource in Alchemy without understanding the dependency between Vite builds, environment variable injection, and resource creation order.

**Impact:**
- Production frontend completely down (404 errors)
- Backend API unreachable from frontend
- Deployment time increased from ~2 minutes to ~2 hours due to troubleshooting

**Resolution:**
- Removed conflicting Vite plugin configuration
- Fixed resource creation order in `alchemy.run.ts`
- Restored original Alchemy Vite resource configuration

---

## Timeline of Events

### Initial State (Commit 35ba291)
✅ **Working deployment** with basic authentication forms

```typescript
// alchemy.run.ts - WORKING CONFIGURATION
const app = await alchemy("spectralNotify");

export const web = await Vite("web", {
	cwd: "apps/web",
	assets: "dist",
	bindings: {
		VITE_SERVER_URL: process.env.VITE_SERVER_URL || "",
	},
	dev: {
		command: "pnpm run dev",
	},
});

export const server = await Worker("server", {
	cwd: "apps/server",
	entrypoint: "src/index.ts",
	compatibility: "node",
	bindings: {
		DB: db,
		CORS_ORIGIN: process.env.CORS_ORIGIN || "",
		BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET),
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "",
	},
	dev: {
		port: 8094,
	},
});
```

### Breaking Change #1 (Commit 056f93e)
🔴 **Introduced dynamic URL bindings** - Changed from hardcoded env vars to dynamic URL references

```diff
// alchemy.run.ts
+ // Create web first to get its URL
export const web = await Vite("web", {
	cwd: "apps/web",
	assets: "dist",
	bindings: {
-		VITE_SERVER_URL: process.env.VITE_SERVER_URL || "",
+		VITE_SERVER_URL: "",  // ❌ Empty during build!
	},
});

export const server = await Worker("server", {
	bindings: {
		DB: db,
-		CORS_ORIGIN: process.env.CORS_ORIGIN || "",
+		CORS_ORIGIN: web.url,  // ✅ Good for server
		BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET),
-		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "",
+		BETTER_AUTH_URL: "",
	},
});

+ // Update web binding with server URL after server is created
+ web.bindings.VITE_SERVER_URL = server.url;  // ❌ TOO LATE - build already happened!
+ server.bindings.BETTER_AUTH_URL = server.url;
```

**Problem:** Vite environment variables must be available **at build time**. Setting `web.bindings.VITE_SERVER_URL` after the Vite resource is created happens too late - the build has already completed with an empty value.

### Breaking Change #2 (Commit 2f26f02)
🔴 **Added CORS configuration issues** - Server couldn't properly access environment bindings

```typescript
// apps/server/src/index.ts - BROKEN
import { env } from "cloudflare:workers";  // ❌ Doesn't work in Hono context

app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN || "",  // ❌ env not accessible here
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);
```

**Problem:** Importing `env` from `cloudflare:workers` at top level doesn't work properly with Hono. Environment bindings must be accessed from the Hono context.

### Breaking Change #3 (Commit 6b07f40)
🔴 **Added Alchemy Vite plugin causing build errors**

```typescript
// apps/web/vite.config.ts - BROKEN
import alchemy from "alchemy/cloudflare/vite";

export default defineConfig({
	plugins: [alchemy(), tailwindcss(), tanstackRouter({}), react()],
	// ... rest of config
});
```

**Problem:** When using Alchemy's `Vite` resource, you should NOT manually add the `alchemy/cloudflare/vite` plugin. Alchemy handles this automatically. Adding it manually causes:
1. "expected nodeJsCompat to be defined" error
2. Requires `compatibility: "node"` on Vite resource
3. Creates conflict with Alchemy's default asset serving

### Breaking Change #4 (Commit 6b07f40)
🔴 **Added `compatibility: "node"` to Vite resource**

```diff
export const web = await Vite("web", {
	cwd: "apps/web",
	assets: "dist",
+	compatibility: "node",  // ❌ Breaks asset serving!
	bindings: {
		VITE_SERVER_URL: "",
	},
});
```

**Problem:** Adding `compatibility: "node"` to a Vite resource changes how Alchemy generates the Worker. Instead of serving static assets correctly, it generated a stub worker that returns 404.

---

## Root Cause Analysis

### Primary Root Cause
**Incorrect resource creation order combined with misunderstanding of Vite environment variable injection timing.**

Alchemy's `Vite` resource builds the frontend application when it's created. Any environment variables prefixed with `VITE_` must be available in `bindings` at that moment. Setting bindings after resource creation is too late.

```typescript
// ❌ WRONG: Server URL not available during Vite build
const web = await Vite("web", {
	bindings: { VITE_SERVER_URL: "" }  // Empty!
});
const server = await Worker("server", { ... });
web.bindings.VITE_SERVER_URL = server.url;  // Too late!

// ✅ CORRECT: Server created first, URL available for Vite build
const server = await Worker("server", { ... });
const web = await Vite("web", {
	bindings: { VITE_SERVER_URL: server.url }  // Available at build time!
});
```

### Secondary Root Causes

1. **Alchemy Vite plugin conflict**
   - Manually adding `alchemy/cloudflare/vite` plugin conflicts with Alchemy's automatic configuration
   - Causes build errors requiring `compatibility: "node"` workaround

2. **Compatibility mode misconfiguration**
   - Adding `compatibility: "node"` to Vite resource breaks asset serving
   - Generated Worker returns 404 instead of serving static files

3. **CORS environment access**
   - Accessing `env` from `cloudflare:workers` at top level doesn't work with Hono
   - Must access environment through Hono context (`c.env`)

4. **Worker naming requirements**
   - Cloudflare Workers require kebab-case names
   - `spectralNotify` failed validation, required `spectral-notify`

---

## Resolution Steps

### Step 1: Fix Worker Naming Convention
```diff
- const app = await alchemy("spectralNotify");
+ const app = await alchemy("spectral-notify");
```

**Lesson:** Cloudflare Workers names must be kebab-case, lowercase, and alphanumeric with dashes only.

### Step 2: Fix CORS Configuration
```typescript
// apps/server/src/index.ts
type Env = {
	CORS_ORIGIN: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	ALLOWED_EMAIL: string;
	DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

app.use(
	"/*",
	cors({
		origin: (origin, c) => {
			const corsOrigin = c.env.CORS_ORIGIN;  // ✅ Access from context
			// In development, allow localhost origins
			if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
				return origin;
			}
			return corsOrigin || origin;
		},
		allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);
```

**Lesson:** Always access environment bindings through the Hono context, not from top-level imports.

### Step 3: Remove Alchemy Vite Plugin
```diff
// apps/web/vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
- import alchemy from "alchemy/cloudflare/vite";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
-	plugins: [alchemy(), tailwindcss(), tanstackRouter({}), react()],
+	plugins: [tailwindcss(), tanstackRouter({}), react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		hmr: {
			protocol: "ws",
			host: "localhost",
			port: 3014,
			clientPort: 3014,
		},
		watch: {
			usePolling: false,
		},
	},
});
```

**Lesson:** When using Alchemy's `Vite` resource, do NOT manually add the `alchemy/cloudflare/vite` plugin. Alchemy handles Cloudflare integration automatically.

### Step 4: Remove `compatibility: "node"` from Vite Resource
```diff
// alchemy.run.ts
export const web = await Vite("web", {
	cwd: "apps/web",
	assets: "dist",
-	compatibility: "node",  // ❌ Remove this
	bindings: {
		VITE_SERVER_URL: "",
	},
	dev: {
		command: "pnpm run dev",
	},
});
```

**Lesson:** Only add `compatibility` options when you actually need them. The Vite resource works correctly without it.

### Step 5: Fix Resource Creation Order
```diff
// alchemy.run.ts
const db = await D1Database("database", {
	migrationsDir: "packages/db/src/migrations",
});

- // Create web first to get its URL
- export const web = await Vite("web", {
-	cwd: "apps/web",
-	assets: "dist",
-	bindings: {
-		VITE_SERVER_URL: "",
-	},
-	dev: {
-		command: "pnpm run dev",
-	},
- });
-
+ // Create server first to get its URL for the web build
export const server = await Worker("server", {
	cwd: "apps/server",
	entrypoint: "src/index.ts",
	compatibility: "node",
	bindings: {
		DB: db,
-		CORS_ORIGIN: web.url,
+		CORS_ORIGIN: "",
		BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET),
		BETTER_AUTH_URL: "",
		ALLOWED_EMAIL: alchemy.secret(process.env.ALLOWED_EMAIL),
	},
	dev: {
		port: 8094,
	},
});

+ // Create web with server URL available at build time
+ export const web = await Vite("web", {
+	cwd: "apps/web",
+	assets: "dist",
+	bindings: {
+		VITE_SERVER_URL: server.url,  // ✅ Available during build!
+	},
+	dev: {
+		command: "pnpm run dev",
+	},
+ });
+
- // Update web binding with server URL after server is created
- web.bindings.VITE_SERVER_URL = server.url;
+ // Update server CORS after web is created
+ server.bindings.CORS_ORIGIN = web.url;
server.bindings.BETTER_AUTH_URL = server.url;
```

**Lesson:** Resource creation order matters when resources depend on each other's URLs. Create dependencies first, then dependents.

---

## Key Learnings & Best Practices

### 1. Alchemy Resource Creation Order
**Rule:** Create resources in dependency order based on build-time requirements.

```typescript
// ✅ CORRECT ORDER
const database = await D1Database("db", { ... });  // No dependencies
const server = await Worker("server", {            // Needs database
	bindings: { DB: database }
});
const web = await Vite("web", {                    // Needs server URL at build time
	bindings: { VITE_SERVER_URL: server.url }
});
server.bindings.CORS_ORIGIN = web.url;             // Update server after web creation
```

**Why it matters:** Vite environment variables (prefixed with `VITE_`) are injected during build, not at runtime. If you create `web` before `server`, the `VITE_SERVER_URL` will be undefined in your built JavaScript.

### 2. Vite Environment Variables
**Rule:** All `VITE_*` environment variables must be available in bindings when the Vite resource is created.

```typescript
// ❌ WRONG: Binding set too late
const web = await Vite("web", {
	bindings: { VITE_API_URL: "" }
});
const api = await Worker("api", { ... });
web.bindings.VITE_API_URL = api.url;  // Too late! Build already completed

// ✅ CORRECT: Binding available at creation
const api = await Worker("api", { ... });
const web = await Vite("web", {
	bindings: { VITE_API_URL: api.url }  // Available during build
});
```

### 3. Alchemy Vite Plugin Usage
**Rule:** Do NOT manually add `alchemy/cloudflare/vite` plugin when using Alchemy's `Vite` resource.

```typescript
// ❌ WRONG: Manual plugin conflicts with Alchemy
// vite.config.ts
import alchemy from "alchemy/cloudflare/vite";
export default defineConfig({
	plugins: [alchemy(), react()],  // Conflicts!
});

// ✅ CORRECT: Let Alchemy handle it
// vite.config.ts
export default defineConfig({
	plugins: [react()],  // Alchemy handles Cloudflare integration
});
```

**Why:** Alchemy automatically configures the Cloudflare Vite plugin with the correct settings. Adding it manually causes conflicts and requires workarounds that break deployment.

### 4. Vite Resource Compatibility Mode
**Rule:** Only add `compatibility` when you actually need Node.js APIs in your Vite Worker.

```typescript
// ✅ CORRECT: Default configuration for static sites
const web = await Vite("web", {
	cwd: "apps/web",
	assets: "dist",
	bindings: { VITE_SERVER_URL: server.url },
});

// ⚠️ ONLY when you need Node.js APIs in the Worker
const web = await Vite("web", {
	cwd: "apps/web",
	assets: "dist",
	compatibility: "node",  // Only if Worker code uses Node APIs
	bindings: { VITE_SERVER_URL: server.url },
});
```

**Why:** The `compatibility: "node"` flag changes how Alchemy generates the Worker code. For static sites, you don't need it.

### 5. CORS in Hono with Cloudflare Workers
**Rule:** Access environment bindings through the Hono context, not top-level imports.

```typescript
// ❌ WRONG: Top-level env import doesn't work
import { env } from "cloudflare:workers";
app.use("/*", cors({ origin: env.CORS_ORIGIN }));

// ✅ CORRECT: Access through Hono context
type Env = {
	CORS_ORIGIN: string;
	// ... other bindings
};
const app = new Hono<{ Bindings: Env }>();
app.use("/*", cors({
	origin: (origin, c) => c.env.CORS_ORIGIN
}));
```

### 6. Cloudflare Worker Naming
**Rule:** Worker names must be kebab-case (lowercase with dashes).

```typescript
// ❌ WRONG: camelCase
const app = await alchemy("spectralNotify");

// ✅ CORRECT: kebab-case
const app = await alchemy("spectral-notify");
```

### 7. Dynamic CORS for Development
**Rule:** Allow localhost origins in development for local testing.

```typescript
cors({
	origin: (origin, c) => {
		const corsOrigin = c.env.CORS_ORIGIN;
		// In development, allow localhost origins
		if (origin.startsWith("http://localhost:") ||
		    origin.startsWith("http://127.0.0.1:")) {
			return origin;
		}
		return corsOrigin || origin;
	},
	allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
	allowHeaders: ["Content-Type", "Authorization"],
	credentials: true,
}),
```

---

## Infrastructure Setup Checklist

### Initial Project Setup

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Configure Environment Variables**
   ```bash
   # Root .env (optional)
   BETTER_AUTH_SECRET=your-secret-here
   ALLOWED_EMAIL=your-email@example.com

   # apps/web/.env
   VITE_SERVER_URL=http://localhost:8094  # For local dev

   # apps/server/.env
   BETTER_AUTH_SECRET=your-secret-here
   ALLOWED_EMAIL=your-email@example.com
   ```

3. **Verify Alchemy Configuration**
   ```typescript
   // alchemy.run.ts - Correct template
   import alchemy from "alchemy";
   import { Vite, Worker, D1Database, Exec } from "alchemy/cloudflare";
   import { config } from "dotenv";

   config({ path: "./.env" });
   config({ path: "./apps/web/.env" });
   config({ path: "./apps/server/.env" });

   const app = await alchemy("your-app-name");  // kebab-case!

   await Exec("db-generate", {
   	cwd: "packages/db",
   	command: "pnpm run db:generate",
   });

   const db = await D1Database("database", {
   	migrationsDir: "packages/db/src/migrations",
   });

   // IMPORTANT: Create server FIRST
   export const server = await Worker("server", {
   	cwd: "apps/server",
   	entrypoint: "src/index.ts",
   	compatibility: "node",  // Server needs Node.js APIs
   	bindings: {
   		DB: db,
   		CORS_ORIGIN: "",  // Will be updated after web creation
   		BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET),
   		BETTER_AUTH_URL: "",
   		ALLOWED_EMAIL: alchemy.secret(process.env.ALLOWED_EMAIL),
   	},
   	dev: {
   		port: 8094,
   	},
   });

   // THEN create web with server URL available
   export const web = await Vite("web", {
   	cwd: "apps/web",
   	assets: "dist",
   	// NO compatibility option for static sites
   	// NO entrypoint option - Alchemy handles it
   	bindings: {
   		VITE_SERVER_URL: server.url,  // Available at build time
   	},
   	dev: {
   		command: "pnpm run dev",
   	},
   });

   // Update server CORS after web is created
   server.bindings.CORS_ORIGIN = web.url;
   server.bindings.BETTER_AUTH_URL = server.url;

   console.log(`Web    -> ${web.url}`);
   console.log(`Server -> ${server.url}`);

   await app.finalize();
   ```

4. **Verify Vite Configuration**
   ```typescript
   // apps/web/vite.config.ts
   import tailwindcss from "@tailwindcss/vite";
   import { tanstackRouter } from "@tanstack/router-plugin/vite";
   import react from "@vitejs/plugin-react";
   import path from "node:path";
   import { defineConfig } from "vite";

   export default defineConfig({
   	// DO NOT add alchemy() plugin here
   	plugins: [tailwindcss(), tanstackRouter({}), react()],
   	resolve: {
   		alias: {
   			"@": path.resolve(__dirname, "./src"),
   		},
   	},
   	server: {
   		hmr: {
   			protocol: "ws",
   			host: "localhost",
   			port: 3014,
   			clientPort: 3014,
   		},
   		watch: {
   			usePolling: false,
   		},
   	},
   });
   ```

5. **Verify Server CORS Configuration**
   ```typescript
   // apps/server/src/index.ts
   import { Hono } from "hono";
   import { cors } from "hono/cors";

   type Env = {
   	CORS_ORIGIN: string;
   	BETTER_AUTH_SECRET: string;
   	BETTER_AUTH_URL: string;
   	ALLOWED_EMAIL: string;
   	DB: D1Database;
   };

   const app = new Hono<{ Bindings: Env }>();

   app.use(logger());
   app.use(
   	"/*",
   	cors({
   		origin: (origin, c) => {
   			const corsOrigin = c.env.CORS_ORIGIN;
   			// In development, allow localhost origins
   			if (origin.startsWith("http://localhost:") ||
   			    origin.startsWith("http://127.0.0.1:")) {
   				return origin;
   			}
   			return corsOrigin || origin;
   		},
   		allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
   		allowHeaders: ["Content-Type", "Authorization"],
   		credentials: true,
   	}),
   );

   // ... rest of your server code
   ```

### Local Development

1. **Start Development Server**
   ```bash
   pnpm run dev  # Starts both frontend and backend
   ```

2. **Verify Services Running**
   - Frontend: http://localhost:3014
   - Backend: http://localhost:8094
   - Check browser console for no CORS errors

3. **Test Authentication Flow**
   - Sign up with allowed email
   - Verify email restriction works
   - Check session persistence

### Deployment

1. **Run Type Check**
   ```bash
   pnpm run check-types
   ```

2. **Deploy to Cloudflare**
   ```bash
   pnpm run deploy
   ```

3. **Verify Deployment**
   ```bash
   # Check if site is serving
   curl -I https://your-app-web-stage.yourname.workers.dev/
   # Should return: HTTP/2 200

   # Check if API is reachable
   curl https://your-app-server-stage.yourname.workers.dev/
   # Should return: "OK" or similar
   ```

4. **Test in Browser**
   - Visit production URL
   - Hard refresh (Cmd+Shift+R or Ctrl+Shift+F5)
   - Open DevTools → Network tab
   - Verify no CORS errors
   - Test authentication flow

### Troubleshooting

#### Issue: 404 on All Routes After Deployment
**Symptoms:** Production returns 404 for all requests
**Cause:** Vite resource misconfiguration
**Fix:**
1. Remove `compatibility: "node"` from Vite resource
2. Remove `alchemy()` plugin from vite.config.ts
3. Redeploy

#### Issue: Frontend Can't Reach Backend API
**Symptoms:** CORS errors, API returns 404
**Cause:** `VITE_SERVER_URL` not set correctly during build
**Fix:**
1. Verify server created before web in alchemy.run.ts
2. Check `web.bindings.VITE_SERVER_URL = server.url`
3. Rebuild and redeploy

#### Issue: CORS Errors in Production
**Symptoms:** "No 'Access-Control-Allow-Origin' header"
**Cause:** CORS middleware not accessing env correctly
**Fix:**
1. Use `c.env.CORS_ORIGIN` instead of top-level `env`
2. Type your Hono app: `new Hono<{ Bindings: Env }>()`
3. Redeploy server

#### Issue: WebSocket Errors in Development
**Symptoms:** HMR connection failed
**Cause:** Vite HMR not configured for Alchemy dev mode
**Fix:** Add HMR configuration to vite.config.ts:
```typescript
server: {
	hmr: {
		protocol: "ws",
		host: "localhost",
		port: 3014,
		clientPort: 3014,
	},
},
```

#### Issue: Browser Shows Old Version After Deployment
**Symptoms:** Changes not visible after successful deployment
**Cause:** Browser or CDN caching
**Fix:**
1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)
2. Try incognito/private window
3. Clear browser cache
4. Wait 30-60 seconds for Cloudflare CDN propagation
5. Check asset filenames changed in HTML (indicates new build)

---

## Prevention Measures

### 1. Always Test Locally First
```bash
# Before deploying, verify local dev works
pnpm run dev

# Check both frontend and backend are accessible
# Frontend: http://localhost:3014
# Backend: http://localhost:8094
```

### 2. Use Git to Verify Changes
```bash
# Before deploying, review what changed
git diff HEAD~1

# Check for suspicious changes to:
# - alchemy.run.ts (resource order, bindings)
# - vite.config.ts (plugins, compatibility)
# - apps/server/src/index.ts (CORS, env access)
```

### 3. Deploy to Staging First
```bash
# Use Alchemy stages for safe deployments
ALCHEMY_STAGE=staging pnpm run deploy

# Test staging thoroughly before production
# Then deploy to production:
ALCHEMY_STAGE=production pnpm run deploy
```

### 4. Monitor Deployment Logs
```bash
# Watch for errors during deployment:
# - Build errors (vite build failures)
# - Type errors (TypeScript compilation)
# - Worker deployment failures
# - Asset upload issues
```

### 5. Document Configuration Changes
- Always commit with descriptive messages
- Document why compatibility flags were added
- Note any workarounds or temporary fixes
- Link to relevant Alchemy/Cloudflare docs

---

## References

- [Alchemy Worker Documentation](https://alchemy.run/providers/cloudflare/worker)
- [Alchemy Vite Documentation](https://alchemy.run/providers/cloudflare/vite)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Hono CORS Middleware](https://hono.dev/middleware/builtin/cors)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

## Conclusion

This incident highlighted the importance of understanding infrastructure-as-code frameworks like Alchemy, particularly around resource creation order and build-time vs runtime configuration. The key takeaway is that Vite environment variables are injected at build time, not runtime, so resource dependencies must be created in the correct order.

**Future Recommendations:**
1. Document resource dependencies in comments
2. Test deployments in staging environment first
3. Use git to verify changes before deploying
4. Keep Alchemy configuration simple - avoid unnecessary compatibility flags
5. Never manually add Alchemy-specific plugins to tool configs

This incident report should serve as a reference for future infrastructure setup and troubleshooting.
