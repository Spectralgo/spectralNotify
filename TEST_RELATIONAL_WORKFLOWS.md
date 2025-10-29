# Testing Relational Workflow Implementation

## Quick Start

### 1. Start Services
```bash
# Terminal 1: SpectralNotify
cd /Users/spectralgo/code/spectralNotify
pnpm dev

# Terminal 2: SpectralTranscript
cd /Users/spectralgo/code/spectralTranscript
pnpm dev
```

### 2. Open UI
- SpectralNotify: http://localhost:3014
- Navigate to "Live Workflows" in sidebar
- Open browser DevTools Console (Cmd+Option+I)

### 3. Trigger Workflow
- SpectralTranscript: http://localhost:3020
- Paste YouTube URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- Click "Start Transcription"

### 4. Watch Real-Time Updates
Expected console logs sequence:

```
[NotifyBroker] 📤 SEND Workflow Started | workflowId=... | phases=download,transcription
[WorkflowDO] 📥 RECEIVE initialize | phasesInserted=2
[WorkflowWebSocket] 🔌 Connected | workflowId=WF-XXXX

[NotifyBroker] 📤 SEND Workflow Phase Progress | phase=download | progress=0%
[WorkflowDO] 💾 Database Write Complete | overallProgress=0% | completedCount=0/2
[WorkflowWebSocket] 📥 RECEIVE | type=phase-progress

[NotifyBroker] 📤 SEND Workflow Phase Progress | phase=download | progress=30%
[WorkflowDO] 💾 Database Write Complete | overallProgress=12% | completedCount=0/2
[WorkflowWebSocket] 📥 RECEIVE | type=phase-progress

[NotifyBroker] 📤 SEND Workflow Phase Progress | phase=download | progress=100%
[WorkflowDO] 💾 Database Write Complete | overallProgress=40% | completedCount=1/2
[WorkflowWebSocket] 📥 RECEIVE | type=phase-progress

[NotifyBroker] 📤 SEND Workflow Phase Progress | phase=transcription | progress=0%
[WorkflowDO] 💾 Database Write Complete | overallProgress=40% | completedCount=1/2
[WorkflowWebSocket] 📥 RECEIVE | type=phase-progress

[NotifyBroker] 📤 SEND Workflow Phase Completed | phase=transcription
[WorkflowDO] 💾 Database Write Complete | overallProgress=100% | completedCount=2/2
[WorkflowWebSocket] 📥 RECEIVE | type=phase-progress

[NotifyBroker] 📤 SEND Workflow Completed
[WorkflowDO] 📡 BROADCAST | type=complete
[WorkflowWebSocket] 📥 RECEIVE | type=complete
```

## Validation Tests

### Test 1: Invalid Weight Sum
```bash
# In spectralTranscript, manually call with invalid weights
POST /workflows/create
{
  "id": "WF-TEST",
  "status": "in-progress",
  "phases": [
    { "key": "download", "weight": 0.3, ... },
    { "key": "transcription", "weight": 0.5", ... }
  ]
}

# Expected: 400 Bad Request
# Error: "Phase weights must sum to 1.0"
```

### Test 2: Duplicate Phase Keys
```bash
POST /workflows/create
{
  "phases": [
    { "key": "download", ... },
    { "key": "download", ... }  // Duplicate!
  ]
}

# Expected: 400 Bad Request
# Error: "Phase keys must be unique"
```

### Test 3: Zero Phases
```bash
POST /workflows/create
{
  "phases": []
}

# Expected: 400 Bad Request
# Error: "At least one phase required"
```

## Progress Accuracy Tests

### Test 4: Weighted Progress
1. Start workflow (download=0%, transcription=0%)
   - Expected: overallProgress=0%
2. Update download to 50%
   - Expected: overallProgress=20% (0.4×50 + 0.6×0)
3. Complete download (100%)
   - Expected: overallProgress=40% (0.4×100 + 0.6×0)
4. Update transcription to 50%
   - Expected: overallProgress=70% (0.4×100 + 0.6×50)
5. Complete transcription (100%)
   - Expected: overallProgress=100% (0.4×100 + 0.6×100)

### Test 5: Phase Completion Counter
1. Initial state
   - Expected: completedPhaseCount=0, activePhaseKey="download"
2. Download progress 50%
   - Expected: completedPhaseCount=0 (not complete yet)
3. Download progress 100%
   - Expected: completedPhaseCount=1, activePhaseKey="transcription"
4. Transcription progress 100%
   - Expected: completedPhaseCount=2, activePhaseKey=null

## UI Visual Tests

### Test 6: Phase Cards Render
1. Select workflow in UI
2. Verify 2 phase cards visible:
   - Download: label, progress bar, status badge
   - Transcription: label, progress bar, status badge
3. Watch download progress increase: 0% → 100%
4. Verify download card status changes: "in-progress" → "success"
5. Verify transcription card status changes: "pending" → "in-progress" → "success"

### Test 7: Overall Progress Display
1. Check header shows: "Overall Progress: X% (Y/2 phases)"
2. Verify counter increments: (0/2) → (1/2) → (2/2)
3. Verify progress bar increases: 0% → 40% → 100%
4. Verify "Active: download" → "Active: transcription" → (disappears when complete)

### Test 8: Event Timeline
1. Watch events appear in real-time (not batched)
2. Each event shows:
   - Phase-specific: "Download progress: 42%"
   - With progress value and timestamp
3. Events sorted newest-first
4. No duplicate events or missing updates

## Performance Tests

### Test 9: Latency Measurement
Check console timestamps:
```
[NotifyBroker] 📤 SEND | timestamp=23:33:56.728Z
[WorkflowDO] 📥 RECEIVE | timestamp=23:33:56.728Z
[WorkflowDO] 💾 Complete | dbDuration=1ms
[WorkflowDO] 📡 BROADCAST | duration=0ms
[WorkflowWebSocket] 📥 RECEIVE | receiveTimestamp=23:33:56.729Z

Total latency: 1ms ✅ (sub-10ms target)
```

### Test 10: Concurrent Workflows
1. Start 3 workflows simultaneously
2. Verify each has independent progress
3. Verify no cross-contamination (each DO isolated)
4. Check logs show correct workflowId for each event

## Error Handling Tests

### Test 11: Download Failure
1. Use invalid YouTube URL
2. Expected:
   - Download phase status → "failed"
   - Workflow status → "failed"
   - Event: "Download failed with exit code 1"
   - completedPhaseCount remains 0
   - activePhaseKey remains "download"

### Test 12: Network Interruption
1. Start workflow
2. Stop spectralNotify server mid-download
3. Expected:
   - Circuit breaker opens after 5 failures
   - spectralTranscript logs errors but continues
   - Download completes locally
4. Restart spectralNotify
5. Expected:
   - Circuit resets, new workflows succeed

## Database Integrity Tests

### Test 13: Relational Consistency
After workflow completes, verify in SQLite:
```sql
-- All phases have matching workflowId
SELECT COUNT(*) FROM workflow_phases WHERE workflowId != (SELECT workflowId FROM workflow_metadata WHERE id=1);
-- Expected: 0

-- Phase weights sum to 1.0
SELECT SUM(weight) FROM workflow_phases;
-- Expected: 1.0

-- Completed count matches query
SELECT completedPhaseCount FROM workflow_metadata WHERE id=1;
SELECT COUNT(*) FROM workflow_phases WHERE status='success';
-- Expected: Both return same value

-- Active phase matches query
SELECT activePhaseKey FROM workflow_metadata WHERE id=1;
SELECT phaseKey FROM workflow_phases WHERE status != 'success' ORDER BY `order` LIMIT 1;
-- Expected: Both return same value (or null if all complete)
```

### Test 14: History References
```sql
-- All history events reference valid workflowId
SELECT COUNT(*) FROM workflow_history WHERE workflowId != (SELECT workflowId FROM workflow_metadata WHERE id=1);
-- Expected: 0

-- Phase events reference valid phases
SELECT COUNT(*) FROM workflow_history 
WHERE phaseKey IS NOT NULL 
  AND phaseKey NOT IN (SELECT phaseKey FROM workflow_phases);
-- Expected: 0
```

## Success Criteria

✅ Schema validation prevents invalid workflows (weight sum, duplicate keys)  
✅ Overall progress computes correctly (weighted sum)  
✅ Phase completion counter accurate (matches COUNT query)  
✅ Active phase tracking correct (first non-success by order)  
✅ WebSocket events include phases array (no JSON parsing)  
✅ UI displays phase counts: "(1/2 phases)"  
✅ UI shows active phase: "Active: transcription"  
✅ Sub-10ms latency end-to-end  
✅ No TypeScript compilation errors  
✅ No runtime exceptions in console  
✅ Database integrity checks pass

## Troubleshooting

### Issue: "Phase download not found"
**Cause**: Phase not inserted during initialization  
**Fix**: Check `initialize()` inserts all phases into `workflow_phases` table  
**Verify**: `SELECT * FROM workflow_phases` returns all phases

### Issue: Overall progress stuck at wrong value
**Cause**: Weights don't sum to 1.0  
**Fix**: Validation should reject, but check: `SELECT SUM(weight) FROM workflow_phases`  
**Expected**: Returns 1.0 exactly

### Issue: "completedPhaseCount" doesn't increment
**Cause**: Phase status not updating to "success" at 100%  
**Fix**: Check `updatePhaseProgress()` sets `status='success'` when `progress=100`  
**Verify**: `SELECT status FROM workflow_phases WHERE phaseKey='download' AND progress=100`

### Issue: Phases array empty in WebSocket event
**Cause**: `broadcastUpdate()` not calling `getPhases()`  
**Fix**: Ensure all broadcast calls fetch and include `phases: allPhases`  
**Verify**: Check WebSocket payload in DevTools Network tab

## Performance Benchmarks

Expected timings (from logs):

| Stage | Target | Acceptable | Warning |
|-------|--------|------------|---------|
| NotifyBroker send | 5-20ms | <50ms | >100ms |
| WorkflowDO DB write | 1-5ms | <10ms | >20ms |
| Compute overall progress | <1ms | <5ms | >10ms |
| Count completed phases | <1ms | <5ms | >10ms |
| Find active phase | <1ms | <5ms | >10ms |
| Broadcast to WebSocket | <1ms | <5ms | >10ms |
| Frontend cache update | 1-3ms | <10ms | >20ms |
| **Total end-to-end** | **10-35ms** | **<100ms** | **>200ms** |

All stages operating within target = 🟢 Healthy  
Any stage in "Warning" zone = 🟡 Investigate  
Any stage over "Warning" threshold = 🔴 Performance issue

