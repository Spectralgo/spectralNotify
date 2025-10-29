# Workflow Real-Time Progress Test Guide

## Prerequisites

1. Both services running:
   - spectralTranscript: http://localhost:3020
   - spectralNotify: http://localhost:3014 (web), http://localhost:8094 (API)

2. Environment variables configured:
   - spectralTranscript `.env`:
     ```
     SPECTRAL_NOTIFY_URL=http://localhost:8094
     SPECTRAL_NOTIFY_API_KEY=local-dev-key-12345
     ```
   - spectralNotify `apps/server/.env`:
     ```
     SPECTRAL_NOTIFY_API_KEY=local-dev-key-12345
     ```

## Test Procedure

### Step 1: Start Services

Terminal 1 (spectralNotify):
```bash
cd /Users/spectralgo/code/spectralNotify
pnpm dev
```

Wait for:
```
Web    -> http://localhost:3014/
Server -> http://localhost:8094/
```

Terminal 2 (spectralTranscript):
```bash
cd /Users/spectralgo/code/spectralTranscript
pnpm dev
```

Wait for:
```
➜  Local:   http://localhost:3020/
```

### Step 2: Open Browser

1. Open http://localhost:3014 in Chrome/Firefox
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Navigate to "Live Workflows" in sidebar

### Step 3: Trigger Workflow

1. In spectralTranscript UI (http://localhost:3020), paste a YouTube URL:
   - Example: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
2. Select format: "audio" or "video"
3. Click "Start Transcription"
4. Copy the workflow ID from response (e.g., `94e1428f-65f7-4f69-9cae-3d99029ad6ed`)

### Step 4: Monitor in spectralNotify

1. In spectralNotify web app, the workflow should appear in "Live Workflows" list
2. Click the workflow row to select it
3. **Watch for WebSocket connection**:
   - Green dot + "Live updates active" in detail panel
   - Console log: `[WorkflowWebSocket] 🔌 Connected | workflowId=WF-XXXX`

### Step 5: Observe Real-Time Updates

**Expected Behavior:**

#### Phase 1: Download (0-8 seconds typical)
- **Phase Card**: "Download" changes from pending → in-progress
- **Phase Progress Bar**: 0% → 100% (updates every 1-2 seconds)
- **Overall Progress Bar**: 0% → 40%
- **Event Timeline**: New events appear immediately:
  ```
  [EventTimeline] 🎨 RENDER Start | eventCount=2
  [EventTimeline] 📄 Rendering Event #1 | type=phase-progress | message="Download progress: 0%"
  [EventTimeline] 🎨 RENDER Start | eventCount=3
  [EventTimeline] 📄 Rendering Event #1 | type=phase-progress | message="Download progress: 30%"
  [EventTimeline] 🎨 RENDER Start | eventCount=4
  [EventTimeline] 📄 Rendering Event #1 | type=phase-progress | message="Download progress: 61%"
  [EventTimeline] 🎨 RENDER Start | eventCount=5
  [EventTimeline] 📄 Rendering Event #1 | type=phase-progress | message="Download progress: 100%"
  ```
- **Download Card**: Status changes to "success" when progress=100%

#### Phase 2: Transcription (5-30 seconds depending on length)
- **Phase Card**: "Transcription" changes from pending → in-progress
- **Phase Progress Bar**: Jumps to 100% when complete (no incremental updates currently)
- **Overall Progress Bar**: 40% → 100%
- **Event Timeline**: Shows transcription start and complete events

#### Final: Workflow Complete
- **Workflow Status**: Changes to "Success"
- **Overall Progress**: 100%
- **Event Timeline**: "Workflow completed successfully" event appears
- **Console**: No errors, clean end-to-end flow

### Step 6: Verify Timing (Console Logs)

Check timestamps in browser console to verify sub-100ms latency:

```
[NotifyBroker] 📤 SEND Workflow Phase Progress | phase=download | progress=42% | timestamp=2025-10-28T23:33:56.728Z
[WorkflowHandler] 📥 RECEIVE Phase Progress Update | phase=download | progress=42% | timestamp=2025-10-28T23:33:56.728Z
[WorkflowDO] 📥 RECEIVE updatePhaseProgress | phase=download | progress=42% | timestamp=2025-10-28T23:33:56.728Z
[WorkflowDO] 💾 Database Write Complete | phase=download | progress=42% | dbDuration=1ms
[WorkflowDO] 📡 BROADCAST Complete | success=1 | duration=0ms
[WorkflowWebSocket] 📥 RECEIVE Message | type=phase-progress | receiveTimestamp=2025-10-28T23:33:56.729Z
[WorkflowWebSocket] ✅ Cache Update Complete | processingDuration=1ms
[EventTimeline] 🎨 RENDER Start | eventCount=7
[EventTimeline] ✅ RENDER Complete | sortDuration=0ms
```

**Total latency**: ~3-5ms from DO broadcast to UI render ✅

## Troubleshooting

### Issue: "Workflow not found" errors in console
**Cause**: Workflow DO not initialized before progress update  
**Fix**: Check that `notifyWorkflowStartedAsync()` is called before any phase updates  
**Verify**: Look for `[WorkflowDO] 📥 RECEIVE initialize` log before any `updatePhaseProgress` logs

### Issue: WebSocket fails to connect
**Cause**: WORKFLOW binding not registered in Alchemy config  
**Fix**: Verify `alchemy.run.ts` has `WORKFLOW: workflow` binding and restart server  
**Verify**: Check server logs for `GET /ws/workflow/:workflowId 101` (successful upgrade)

### Issue: Progress updates appear all at once
**Cause**: WebSocket not connected when updates sent  
**Fix**: Ensure workflow is selected BEFORE download starts, or check for reconnection logic  
**Verify**: `[WorkflowWebSocket] 🔌 Connected` appears before `[WorkflowWebSocket] 📥 RECEIVE Message`

### Issue: Overall progress doesn't reach 100%
**Cause**: Phase weights don't sum to 1.0  
**Fix**: Adjust weights in `startYouTubeTranscriptionAsync()` (e.g., 0.4 + 0.6 = 1.0)  
**Verify**: Check `[WorkflowDO] 💾 Database Write Complete | overallProgress=100%` log

### Issue: Frontend shows old data after refresh
**Cause**: TanStack Query cache stale  
**Fix**: WebSocket invalidates queries on updates; check `queryClient.invalidateQueries()` calls  
**Verify**: Click "Refresh" button or navigate away and back

## Performance Metrics

### Expected Timings (from logs)
- NotifyBroker send: 5-20ms (HTTP request to spectralNotify)
- WorkflowHandler: 1-5ms (routing + validation)
- WorkflowDO write: 1-3ms (SQLite transaction)
- WorkflowDO broadcast: 0-1ms (WebSocket send)
- Frontend receive: 1-2ms (WebSocket → cache update)
- React render: 0-1ms (EventTimeline sort + render)

**Total end-to-end**: 10-35ms from NotifyBroker send to UI render ✅

### Warning Thresholds
- NotifyBroker > 50ms: Network latency issue
- WorkflowDO write > 10ms: Database contention
- Frontend render > 20ms: React performance issue (check for unnecessary re-renders)

## Advanced Testing

### Load Test: Rapid Progress Updates
```bash
# In spectralTranscript terminal, start multiple workflows simultaneously
# Expected: All workflows update independently without interference
```

### Failure Test: Network Interruption
1. Start workflow
2. Stop spectralNotify server mid-download
3. Expected: Circuit breaker opens after 5 failures, spectralTranscript logs errors but continues
4. Restart spectralNotify server
5. Expected: Circuit resets after cooldown, new workflows work

### Idempotency Test: Duplicate Requests
1. Watch NotifyBroker logs for idempotency hits:
   ```
   [NotifyBroker] Cached response (hit rate: 33.3%) for /workflows/updatePhaseProgress
   ```
2. Expected: Identical progress updates (e.g., multiple 0% updates) use cached responses

## Success Criteria

✅ Real-time updates appear individually, not in batches  
✅ Sub-100ms total latency from backend to frontend  
✅ Phase cards update smoothly with status changes  
✅ Overall progress computation is accurate (weighted sum)  
✅ Workflow completes only after all phases + JSON write  
✅ No TypeScript errors or lint warnings  
✅ Clean console logs with no exceptions  
✅ WebSocket reconnects automatically on disconnect

