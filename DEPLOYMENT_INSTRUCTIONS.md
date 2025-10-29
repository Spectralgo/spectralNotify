# Deployment Instructions for NotifyBroker Fix

## Issue Status
✅ **Code Fix Complete** - The Response body stream consumption fix has been implemented
❌ **Not Yet Applied** - The development server is running old code and needs to be restarted

## Current Situation
The spectralNotify server logs show `200 OK` responses, but spectralTranscript is still receiving empty response bodies. This is because:

1. **The fix IS in the code** (verified at lines 162, 172, 182 of `apps/server/src/index.ts`)
2. **The API package builds successfully** 
3. **The dev server is running cached/old code** - Alchemy's hot reload didn't pick up the changes

## Required Steps

### 1. Stop SpectralNotify Dev Server
Press `Ctrl+C` in the terminal running `pnpm dev` for spectralNotify (the terminal showing the error was already stopped)

### 2. Rebuild All Packages
```bash
cd /Users/spectralgo/code/spectralNotify
pnpm build
```

### 3. Restart Dev Server
```bash
cd /Users/spectralgo/code/spectralNotify
pnpm dev
```

### 4. Test the Fix
Once the server restarts:
1. Go to spectralTranscript and trigger a YouTube download
2. Watch for these SUCCESS indicators:
   - ✅ `[Idempotency] Processing new key: ...` in spectralNotify logs
   - ✅ `--> POST /tasks/create 200 Xms` in spectralNotify logs  
   - ✅ NO "Unexpected end of JSON input" errors in spectralTranscript
   - ✅ NO "[NotifyBroker] Circuit breaker opened" messages

### 5. Expected Successful Output

**SpectralNotify logs should show:**
```
<-- POST /tasks/create
[Middleware] Processing POST /tasks/create
[Middleware] X-API-Key header: present
[Auth] API Key provided: local-de...
[Auth] Keys match: true
[Auth] Using service session (API key validated)
[Idempotency] Processing new key: dde18791...
--> POST /tasks/create 200 8ms

<-- POST /tasks/updateProgress
[Idempotency] Processing new key: e7d35076...
--> POST /tasks/updateProgress 200 3ms
```

**SpectralTranscript logs should show:**
```
[INFO] Download task created: f72bbeef-a67d-4f2a-80c9-39802691b2de
[INFO] Starting download phase for f72bbeef-a67d-4f2a-80c9-39802691b2de
[INFO] Download task updated: f72bbeef-a67d-4f2a-80c9-39802691b2de
✅ NO NotifyBroker errors!
```

## Verification Checklist
- [ ] SpectralNotify dev server stopped
- [ ] `pnpm build` completed successfully
- [ ] SpectralNotify dev server restarted
- [ ] YouTube download test initiated
- [ ] No "Unexpected end of JSON input" errors
- [ ] Circuit breaker stays closed
- [ ] Progress updates flowing correctly

## If Issues Persist

### Check 1: Verify the fix is in the running code
```bash
cd /Users/spectralgo/code/spectralNotify
grep -n "return restResult.response" apps/server/src/index.ts
# Should show line 162 WITHOUT c.newResponse wrapper
```

### Check 2: Check for TypeScript compilation errors
```bash
cd /Users/spectralgo/code/spectralNotify
pnpm check
```

### Check 3: Inspect actual response in dev tools
Open spectralNotify at `http://localhost:8094/` and use browser dev tools to inspect `/tasks/create` response body - it should contain JSON with `{success: true, taskId: "...", __idempotency: {...}}`

## Technical Details

### What Was Fixed
**File:** `apps/server/src/index.ts`  
**Lines:** 162, 172, 182

**Before (BROKEN):**
```typescript
if (restResult.matched) {
  return c.newResponse(restResult.response.body, restResult.response);
}
```

**After (FIXED):**
```typescript
if (restResult.matched) {
  return restResult.response;
}
```

**Why This Fixes It:**
- `Response.body` is a ReadableStream that can only be consumed once
- Passing it to `c.newResponse()` attempts to read the stream
- This leaves an empty body for the client
- Returning the Response directly preserves the intact body

### Additional Changes
- Added `.output()` schemas for `updateProgress`, `complete`, `fail`, `cancel` endpoints
- Ensures proper OpenAPI documentation and type safety
- Enables full idempotency metadata flow

## Success Criteria
✅ NotifyBroker successfully sends task creation requests  
✅ SpectralNotify responds with valid JSON (not empty bodies)  
✅ Idempotency cache hits work correctly  
✅ Circuit breaker never opens  
✅ Real-time progress updates flow to spectralNotify UI  

## Next Steps After Verification
Once confirmed working in development:
1. Commit changes to git
2. Push to repository  
3. Deploy to staging/production environments
4. Monitor logs for any issues

## Files Modified
- `/Users/spectralgo/code/spectralNotify/apps/server/src/index.ts` (response handling)
- `/Users/spectralgo/code/spectralNotify/packages/api/src/routers/tasks/tasks.router.ts` (output schemas)
- `/Users/spectralgo/code/spectralNotify/NOTIFY_BROKER_FIX.md` (documentation)

