# Workflow Implementation Summary

## Overview
Implemented parent Workflow tasks with multi-phase progress tracking for YouTube transcription orchestration. Workflows show real-time updates for both download and transcription phases without throttling.

## Changes Made

### 1. SpectralNotify Backend (Database & Durable Objects)

#### Database Schema
- **D1 Registry**: `workflow_registry` table (workflowId, createdAt, createdBy)
  - Migration: `0005_short_mulholland_black.sql`
  - Schema: `packages/db/src/schema/workflow-registry.ts`

#### Workflow Durable Object
- **File**: `apps/server/src/workflow.ts`
- **Storage Tables**:
  - `workflow_metadata`: Single row (id=1) with workflowId, status, overallProgress, phases (JSON), metadata (JSON)
  - `workflow_history`: Event log with eventType, phaseKey, message, progress, timestamp
- **Methods**:
  - `initialize(workflowId, status, phases[], metadata)` - Create workflow
  - `updatePhaseProgress(phaseKey, progress, metadata?)` - Update phase progress, compute overall progress
  - `completePhase(phaseKey, metadata?)` - Mark phase complete (progress=100)
  - `completeWorkflow(metadata?)` - Mark entire workflow complete
  - `failWorkflow(error, metadata?)` - Mark workflow failed
  - `cancelWorkflow(metadata?)` - Mark workflow canceled
  - `broadcastUpdate(event)` - Send real-time WebSocket updates to all connected clients

#### Progress Computation
- Phases have weights (e.g., download=0.4, transcription=0.6)
- Overall progress = Σ(phase.progress × phase.weight)
- Example: download=100%, transcription=50% → overall=70% (0.4×100 + 0.6×50)

#### Migrations
- **Directory**: `apps/server/src/workflow-migrations/`
- **Files**:
  - `0000_workflow_init.sql` - Initial schema
  - `meta/_journal.json` - Migration metadata
  - `migrations.js` - Migration loader

### 2. SpectralNotify API (REST & WebSocket)

#### Type Definitions
- **File**: `packages/api/src/types/workflow.ts`
- **Types**: `WorkflowMetadata`, `WorkflowHistory`, `WorkflowPhase`, `WorkflowUpdateEvent`

#### Handlers
- **File**: `packages/api/src/routers/workflows/workflows.handlers.ts`
- **Functions**: handleInitializeWorkflow, handleUpdatePhaseProgress, handleCompletePhase, handleCompleteWorkflow, handleFailWorkflow, handleCancelWorkflow, handleGetWorkflow, handleGetWorkflowHistory, handleDeleteWorkflow

#### Router
- **File**: `packages/api/src/routers/workflows/workflows.router.ts`
- **Endpoints** (all with idempotency where applicable):
  - POST `/workflows/create` - Initialize workflow with phases
  - POST `/workflows/updatePhaseProgress` - Update phase progress
  - POST `/workflows/completePhase` - Mark phase complete
  - POST `/workflows/complete` - Mark workflow complete
  - POST `/workflows/fail` - Mark workflow failed
  - POST `/workflows/cancel` - Mark workflow canceled
  - GET `/workflows/getById` - Fetch workflow metadata
  - GET `/workflows/getHistory` - Fetch event history
  - GET `/workflows/getAll` - List all workflows
  - DELETE `/workflows/delete` - Delete single workflow
  - DELETE `/workflows/deleteAll` - Delete all workflows (admin)

#### WebSocket Route
- **File**: `apps/server/src/index.ts`
- **Route**: `GET /ws/workflow/:workflowId` - Proxy to Workflow DO for real-time updates
- **Env Binding**: Added `WORKFLOW: DurableObjectNamespace` to Env type
- **Alchemy Config**: `alchemy.run.ts` - Added `workflow` DO namespace binding

### 3. SpectralTranscript Integration (NotifyBroker)

#### Broker Interface
- **File**: `packages/api/src/brokers/notify_broker/NotifyBroker.Interface.ts`
- **New Methods**:
  - `notifyWorkflowStartedAsync(workflowId, phases[], metadata)`
  - `notifyWorkflowPhaseProgressAsync(workflowId, phaseKey, progress, metadata?)`
  - `notifyWorkflowPhaseCompletedAsync(workflowId, phaseKey, metadata?)`
  - `notifyWorkflowCompletedAsync(workflowId, metadata?)`
  - `notifyWorkflowFailedAsync(workflowId, error, metadata?)`
  - `notifyWorkflowCancelledAsync(workflowId, metadata?)`
- **Legacy Methods**: Marked as `@deprecated` (still functional)

#### Broker Implementation
- **File**: `packages/api/src/brokers/notify_broker/NotifyBroker.ts`
- **Added**: All 6 workflow methods with circuit breaker, retry logic, idempotency
- **Logging**: Timestamped debug logs for all workflow notifications (send, success, failure)

#### Type Utilities
- **File**: `packages/api/src/brokers/notify_broker/spectralNotify.types.ts`
- **Added**: `formatSpectralNotifyWorkflowId(uuid)` → `WF-XXXX` format

#### Orchestration Service
- **File**: `packages/api/src/services/orchestrations/youtube_transcription/YouTubeTranscriptionOrchestrationService.ts`
- **Changes**:
  - Added `notifyBroker` to constructor
  - In `startYouTubeTranscriptionAsync()`: Call `notifyWorkflowStartedAsync()` with 2 phases (download=0.4, transcription=0.6)
  - In `executeWorkflowAsync()`: 
    - Notify transcription phase start (progress=0%)
    - Notify transcription phase complete after polling
    - Call `notifyWorkflowCompletedAsync()` at the very end (after JSON write)
- **Handler Wiring**: `youtube_transcription.handlers.ts` - Pass notifyBroker to orchestration service constructor

#### Download Processor
- **File**: `packages/api/src/services/processors/youtube_download/YouTubeDownloadProcessor.ts`
- **Changes**:
  - Removed `notifyDownloadStartedAsync()` call (workflow already started in orchestration)
  - Progress updates: Call `notifyWorkflowPhaseProgressAsync(workflowId, "download", progress)`
  - On success: Call `notifyWorkflowPhaseCompletedAsync(workflowId, "download")`
  - On failure: Call `notifyWorkflowFailedAsync(workflowId, error, { phase: "download" })`
  - On cancel: Call `notifyWorkflowCancelledAsync(workflowId, { phase: "download" })`

### 4. SpectralNotify Frontend (React Components & Hooks)

#### WebSocket Utilities
- **File**: `apps/web/src/utils/websocket-workflow.ts`
- **Functions**: createWorkflowWebSocket, sendPing, closeWebSocket

#### Hooks
- **`use-workflow-websocket.ts`**: WebSocket connection hook with TanStack Query cache updates
- **`use-workflow-detail.ts`**: Composite hook (workflow data + WebSocket + history)
- **`use-workflows.ts`**: List all workflows with client-side filtering

#### Components
- **`workflow-phase-card.tsx`**: Individual phase card (icon, label, progress bar, status)
- **`workflow-detail-panel.tsx`**: Full workflow detail (overall progress, phase cards, event timeline)
- **`workflow-status-pill.tsx`**: Status badge (pending/in-progress/success/failed/canceled)
- **`workflow-list-item.tsx`**: List row (workflowId, status, overall progress, last event)

#### Pages
- **`routes/_app/workflows/route.tsx`**: Layout with context provider
- **`routes/_app/workflows/all.tsx`**: All workflows view
- **`routes/_app/workflows/live.tsx`**: Active workflows only (pending + in-progress)

#### Navigation
- **File**: `components/app-sidebar.tsx`
- **Added**: "All Workflows" and "Live Workflows" menu items

## Data Flow

### Workflow Start
```
User → POST /api/youtubeTranscription.start
  → OrchestrationService.startYouTubeTranscriptionAsync()
    → notifyBroker.notifyWorkflowStartedAsync(downloadTaskId, phases, metadata)
      → POST /workflows/create { id: "WF-XXXX", status: "in-progress", phases: [...] }
        → WorkflowDO.initialize()
          → Store workflow_metadata + workflow_history
          → Broadcast to WebSocket clients
```

### Download Phase Progress
```
yt-dlp stdout → "[download] 42%"
  → YouTubeDownloadProcessor parses progress
    → notifyBroker.notifyWorkflowPhaseProgressAsync(workflowId, "download", 42)
      → POST /workflows/updatePhaseProgress { workflowId, phase: "download", progress: 42 }
        → WorkflowDO.updatePhaseProgress()
          → Update phases[0].progress = 42
          → Compute overallProgress = 0.4×42 + 0.6×0 = 16.8%
          → Store + Broadcast { type: "phase-progress", phase: "download", progress: 42, overallProgress: 17 }
```

### Download Phase Complete
```
yt-dlp exits with code 0
  → notifyBroker.notifyWorkflowPhaseCompletedAsync(workflowId, "download", { filePath })
    → POST /workflows/completePhase { workflowId, phase: "download" }
      → WorkflowDO.completePhase() → updatePhaseProgress("download", 100)
        → phases[0] = { status: "success", progress: 100 }
        → overallProgress = 0.4×100 + 0.6×0 = 40%
        → Broadcast
```

### Transcription Phase Start
```
OrchestrationService.executeWorkflowAsync() after download completes
  → notifyBroker.notifyWorkflowPhaseProgressAsync(workflowId, "transcription", 0)
    → WorkflowDO.updatePhaseProgress()
      → phases[1] = { status: "in-progress", progress: 0 }
      → Broadcast
```

### Transcription Phase Complete
```
AssemblyAI callback → transcription complete
  → notifyBroker.notifyWorkflowPhaseCompletedAsync(workflowId, "transcription", { taskId })
    → WorkflowDO.completePhase("transcription")
      → phases[1] = { status: "success", progress: 100 }
      → overallProgress = 0.4×100 + 0.6×100 = 100%
      → Broadcast
```

### Workflow Complete
```
After JSON files written
  → notifyBroker.notifyWorkflowCompletedAsync(workflowId, { outputFormat })
    → POST /workflows/complete
      → WorkflowDO.completeWorkflow()
        → workflow.status = "success"
        → workflow.completedAt = now
        → Broadcast { type: "complete" }
```

## Frontend Real-Time Updates

```
User selects workflow in UI
  → useWorkflowDetail() hook
    → useWorkflowWebSocket() establishes WebSocket connection
      → GET /ws/workflow/WF-XXXX (upgrades to WebSocket)
        → WorkflowDO accepts WebSocket, adds to sessions

WorkflowDO broadcasts event
  → WebSocket sends JSON message to frontend
    → useWorkflowWebSocket.updateQueryCache(event)
      → Updates TanStack Query caches:
        - workflows.getById (metadata + phases)
        - workflows.getHistory (event log)
        - workflows.getAll (list item)
      → React re-renders WorkflowDetailPanel
        → Overall progress bar updates
        → Phase card updates (progress, status)
        → Event timeline shows new entry
```

## Debug Logging

All layers have timestamped debug logs:
- `[NotifyBroker]` - spectralTranscript broker sends
- `[WorkflowHandler]` - spectralNotify API receives
- `[WorkflowDO]` - Durable Object processes + broadcasts
- `[WorkflowWebSocket]` - Frontend receives WebSocket messages
- `[EventTimeline]` - UI renders events

## Testing

### Manual Test Flow
1. Start spectralNotify dev server: `cd /Users/spectralgo/code/spectralNotify && pnpm dev`
2. Start spectralTranscript dev server: `cd /Users/spectralgo/code/spectralTranscript && pnpm dev`
3. Open spectralNotify web app: http://localhost:3014
4. Navigate to "Live Workflows" in sidebar
5. In spectralTranscript app, start a YouTube transcription
6. Select the workflow in spectralNotify UI
7. Watch real-time updates:
   - Download phase: 0% → 100% (events appear immediately)
   - Overall progress: 0% → 40% during download
   - Transcription phase: starts at 0%
   - Overall progress: 40% → 100% during transcription
   - Workflow completes with "success" status

### Expected Logs
```
[NotifyBroker] 📤 SEND Workflow Started | workflowId=... | phases=download,transcription
[WorkflowHandler] 📥 RECEIVE Workflow Create | workflowId=WF-XXXX
[WorkflowDO] 📥 RECEIVE initialize | workflowId=WF-XXXX
[WorkflowDO] 📡 BROADCAST Start | type=phase-progress | sessions=1
[WorkflowWebSocket] 📥 RECEIVE Message | type=phase-progress | phase=download | progress=42%
[EventTimeline] 🎨 RENDER Start | eventCount=N (increases with each update)
```

### Validation Checklist
- [ ] Workflow appears in "All Workflows" page immediately after creation
- [ ] WebSocket connects (green indicator in detail panel)
- [ ] Download phase progress updates appear in real-time (not batched)
- [ ] Overall progress bar increases during download (0% → 40%)
- [ ] Download phase card shows "success" when complete
- [ ] Transcription phase card changes from "pending" to "in-progress"
- [ ] Overall progress continues during transcription (40% → 100%)
- [ ] Workflow status changes to "success" after JSON write
- [ ] No delays between backend broadcast and frontend render (< 100ms total)

## Breaking Changes

### API Changes
- NotifyBroker now uses `/workflows/*` endpoints for new orchestrations
- Legacy `/tasks/*` endpoints still work but are deprecated
- Workflow IDs use `WF-` prefix vs `TASK-` prefix

### Database Changes
- Added `workflow_registry` table (requires migration)
- Workflow DOs store multi-phase state (not compatible with Task DOs)

### Frontend Changes
- New routes: `/workflows/all`, `/workflows/live`
- New hooks: `useWorkflowWebSocket`, `useWorkflowDetail`, `useWorkflows`
- New components: phase cards, workflow detail panel, status pill, list item

## Backward Compatibility

- Task endpoints (`/tasks/*`) are preserved and functional
- Existing Task pages (`/tasks/all`, `/tasks/live`, etc.) unchanged
- New workflows use `/workflows/*` exclusively
- Both systems coexist; no migration of existing tasks required

## Configuration

### Environment Variables
- **spectralTranscript**:
  - `SPECTRAL_NOTIFY_URL` - spectralNotify API URL (e.g., http://localhost:8094)
  - `SPECTRAL_NOTIFY_API_KEY` - API key for authentication
  - Circuit breaker: `NOTIFY_CIRCUIT_BREAKER_THRESHOLD` (default: 5), `NOTIFY_CIRCUIT_BREAKER_TIMEOUT` (default: 60000ms)

- **spectralNotify**:
  - Alchemy bindings in `alchemy.run.ts`:
    - `WORKFLOW: DurableObjectNamespace` (namespace: "workflow", className: "Workflow", sqlite: true)

### Phase Weights (Configurable)
Default weights in `YouTubeTranscriptionOrchestrationService.startYouTubeTranscriptionAsync()`:
```typescript
phases: [
  { key: "download", label: "Download", weight: 0.4, ... },
  { key: "transcription", label: "Transcription", weight: 0.6, ... }
]
```

To adjust:
- Increase download weight for long videos: `weight: 0.6` (transcription: 0.4)
- Increase transcription weight for long audio: `weight: 0.3` (transcription: 0.7)

## Architecture Benefits

1. **Accurate Progress**: Overall progress reflects actual work (download + transcription), not just download
2. **Real-Time UX**: No batching—every phase update broadcasts immediately via WebSocket
3. **Phase Visibility**: Users see which phase is active, completed, or pending
4. **Extensible**: Easy to add more phases (e.g., "post-processing", "upload") with weight adjustments
5. **Idempotent**: All mutations use idempotency keys—safe retries without duplicates
6. **Resilient**: Circuit breaker protects against cascading failures; non-blocking progress updates

## Future Enhancements

1. **Nested Workflows**: Support parent-child relationships for complex orchestrations
2. **Dynamic Weights**: Adjust phase weights based on file size or duration
3. **Pause/Resume**: Allow pausing workflows mid-flight
4. **Progress Estimation**: Use historical data to estimate time remaining
5. **Notifications**: Email/push when workflow completes or fails
6. **Bulk Operations**: Start/cancel multiple workflows simultaneously

