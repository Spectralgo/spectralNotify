# SpectralNotify Client Tests

This directory contains tests for the SpectralNotify client SDK, including REST API and WebSocket integration tests.

## Test Files

### 1. **workflow-api.test.ts**
Unit tests for the WorkflowApi class, testing REST endpoint calls with mocked responses.

### 2. **workflow-websocket-integration.test.ts** ⭐ NEW
Integration test suite that verifies:
- REST API workflow creation with idempotency keys
- WebSocket real-time updates (native WebSocket, no oRPC)
- Integration between REST writes and WebSocket events
- Complete workflow lifecycle: create → progress → complete

### 3. **manual-workflow-test.ts** ⭐ NEW
Standalone executable script for manual testing and debugging. Provides colored console output showing all REST API calls and WebSocket events in real-time.

## Running Tests

### Prerequisites

1. **Start the server** (required for integration tests):
   ```bash
   pnpm dev
   ```
   The server should be running at `http://localhost:8094`

2. **Set environment variables** (optional):
   ```bash
   export SERVER_URL=http://localhost:8094
   export API_KEY=your-api-key
   ```

### Run Unit Tests

```bash
# From project root
pnpm test

# Or from packages/client directory
pnpm test
```

### Run Integration Test

The integration test uses Vitest and requires a running server:

```bash
# Run all tests including integration test
pnpm test

# Run only the integration test
pnpm test workflow-websocket-integration
```

**Environment variables:**
- `TEST_SERVER_URL` - Server URL (default: `http://localhost:8094`)
- `TEST_API_KEY` - API key for authentication (default: `test-api-key`)

### Run Manual Test Script

The manual test script is a standalone TypeScript file that can be executed directly:

```bash
# From project root
pnpm tsx packages/client/test/manual-workflow-test.ts

# With custom server URL
SERVER_URL=http://localhost:8094 pnpm tsx packages/client/test/manual-workflow-test.ts

# With custom API key
API_KEY=my-secret-key pnpm tsx packages/client/test/manual-workflow-test.ts
```

**What you'll see:**
- ✅ Colored console output showing each step
- 📡 REST API calls (POST /workflows/create, etc.)
- 🔌 WebSocket connection status
- ⚡ Real-time event updates from WebSocket
- ✓ Final verification of workflow state

## Test Coverage

### REST API Endpoints Tested
- ✅ `POST /workflows/create` - Create workflow with phases
- ✅ `POST /workflows/updatePhaseProgress` - Update phase progress
- ✅ `POST /workflows/completePhase` - Mark phase as complete
- ✅ `POST /workflows/complete` - Complete entire workflow
- ✅ `POST /workflows/getById` - Retrieve workflow metadata
- ✅ `POST /workflows/getPhases` - Retrieve all phases
- ✅ `POST /workflows/getHistory` - Retrieve event history

### WebSocket Events Tested
- ✅ `phase-progress` - Phase progress updated
- ✅ `workflow-progress` - Overall workflow progress
- ✅ `complete` - Workflow completed successfully
- ✅ Connection establishment
- ✅ Real-time event delivery
- ✅ Message parsing and type validation

### Key Features Verified
- ✅ **Idempotency Keys**: Automatically generated SHA-256 hashes for write operations
- ✅ **API Key Authentication**: `X-API-Key` header sent only for write operations
- ✅ **No Credentials**: `credentials: 'omit'` by default (no cookies/session)
- ✅ **Native WebSocket**: Direct WebSocket connection (no oRPC dependency)
- ✅ **REST Endpoints**: Direct paths like `/workflows/create` (not `/rpc/workflows.create`)
- ✅ **Real-time Integration**: REST writes trigger WebSocket events immediately

## Troubleshooting

### Server Not Running
```
Error: Failed to create workflow: API error: 500
```
**Solution**: Make sure the server is running with `pnpm dev`

### WebSocket Connection Failed
```
Error: WebSocket connection timeout
```
**Solution**:
1. Verify server is running and accessible
2. Check firewall settings
3. Ensure WebSocket endpoint `/ws/workflow/:id` is available

### API Key Issues
```
Error: API key required for write operation
```
**Solution**: Set the `API_KEY` or `TEST_API_KEY` environment variable

### Test Timeout
```
Error: Test exceeded timeout
```
**Solution**:
1. Check server response time
2. Increase timeout in test configuration
3. Verify network connectivity

## Example Output (Manual Test)

```
=== Workflow REST API + WebSocket Integration Test ===

Server: http://localhost:8094
Workflow ID: MANUAL-TEST-1730387456789

Step 1: Creating workflow via REST API
→ POST /workflows/create
✓ Workflow created successfully
  Status: in-progress
  Phases: 3
  Overall Progress: 0%

Step 2: Connecting to WebSocket for real-time updates
→ WS /ws/workflow/MANUAL-TEST-1730387456789
✓ WebSocket connected

Step 3: Executing workflow phases

Phase 1: Initialization
→ POST /workflows/updatePhaseProgress
← WebSocket Event: phase-progress
  Phase: initialization
  Phase Progress: 50%
  Overall Progress: 10%

→ POST /workflows/completePhase
← WebSocket Event: phase-progress
  Phase: initialization
  Phase Progress: 100%
  Overall Progress: 20%
✓ Phase 1 complete

...

=== Test Completed Successfully ===

✓ All REST API calls worked correctly
✓ WebSocket received real-time updates
✓ Integration between REST and WebSocket verified
```

## Next Steps

After running these tests successfully:

1. **Use the same patterns in your application**:
   ```typescript
   import { ApiClient, WorkflowApi, createWorkflowWebSocket } from '@spectralnotify/client';

   const client = new ApiClient({ serverUrl, apiKey });
   const workflowApi = new WorkflowApi(client);

   // Create workflow
   const result = await workflowApi.create(id, phases, metadata);

   // Listen for updates
   const ws = createWorkflowWebSocket(serverUrl, workflowId, {
     onMessage: (event) => console.log('Update:', event)
   });
   ```

2. **Check the React Native package**: The same API works in React Native (`@spectralnotify/react-native`)

3. **Review server logs**: See the actual REST endpoints being called and WebSocket connections

4. **Test with different workflows**: Try error scenarios, cancellations, etc.
