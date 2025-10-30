# Workflow Demo - YouTube Transcription Pipeline

## Overview

This demo showcases the `@spectralnotify/client` library integrated into the React Native app, simulating a real-world YouTube video transcription workflow with real-time WebSocket updates.

## What Was Implemented

### 1. Files Created

- **`hooks/use-workflow.ts`** - React Native wrapper for the client library hook
- **`services/workflow-simulator.ts`** - API orchestration service to drive the workflow simulation
- **`components/workflow-viewer.tsx`** - Visual display component for workflow progress
- **`app/(drawer)/(tabs)/workflow-demo.tsx`** - Main demo screen with controls

### 2. Files Modified

- **`package.json`** - Added `@spectralnotify/client` dependency
- **`app/_layout.tsx`** - Wrapped app with `SpectralNotifyProvider`
- **`app/(drawer)/(tabs)/_layout.tsx`** - Added "Workflow" tab with video icon

## Workflow Specification

### Metadata
```json
{
  "id": "WF-E82F457F",
  "purpose": {
    "title": "Transcribe YouTube Video (audio)",
    "description": "Full transcription pipeline for YouTube video audio"
  },
  "author": {
    "type": "user",
    "id": "user-123",
    "name": "Demo User"
  },
  "origin": {
    "repo": "spectralTranscript",
    "app": "server",
    "module": "YouTubeTranscriptionOrchestrationService"
  }
}
```

### Phases (Total: 30 seconds)

#### Phase 1: Download (12 seconds, 40% weight)
- **Progress Updates**: 15 updates
- **Pattern**: Variable timing (slower start, faster middle, slower end)
- **Updates**: 0%, 1%, 2%, 5%, 8%, 11%, 15%, 22%, 30%, 44%, 58%, 72%, 88%, 95%, 100%

#### Phase 2: Transcription (15 seconds, 50% weight)
- **Progress Updates**: 9 updates
- **Pattern**: Steady ~1.5-2s intervals
- **Updates**: 0%, 10%, 25%, 40%, 55%, 70%, 85%, 95%, 100%

#### Phase 3: Write Transcript JSON (1.5 seconds, 5% weight)
- **Progress Updates**: 3 rapid updates
- **Pattern**: Quick successive updates
- **Updates**: 0%, 50%, 100%

#### Phase 4: Write Paragraphed Transcript (1.5 seconds, 5% weight)
- **Progress Updates**: 3 rapid updates
- **Pattern**: Quick successive updates
- **Updates**: 0%, 50%, 100%

## How to Use

### 1. Start the Development Server

Make sure the SpectralNotify server is running:
```bash
pnpm dev
```

### 2. Install Dependencies

```bash
cd apps/native
pnpm install
```

### 3. Run the Native App

```bash
# For iOS
pnpm ios

# For Android
pnpm android

# For Web
pnpm web
```

### 4. Navigate to Workflow Tab

1. Open the app
2. Tap the "Workflow" tab (video icon)
3. Tap "Start Demo Workflow" button
4. Watch real-time updates for 30 seconds

## Features Demonstrated

### Real-time Updates
- ✅ WebSocket connection with live status indicator (🟢 Live / 🔴 Disconnected)
- ✅ Automatic reconnection on connection loss
- ✅ Real-time phase progress updates
- ✅ Overall workflow progress calculation
- ✅ Event timeline with timestamps

### UI Components
- ✅ Connection status badges (Live, Connecting, Disconnected)
- ✅ Overall progress bar with percentage
- ✅ Phase cards with individual progress bars
- ✅ Phase status icons (✓ success, ▶ in-progress, ○ pending, ✗ failed)
- ✅ Scrollable event timeline
- ✅ Workflow metadata display

### State Management
- ✅ TanStack Query integration for data caching
- ✅ Optimistic UI updates from WebSocket events
- ✅ Query invalidation for eventual consistency
- ✅ Loading and error states

## Architecture

### Data Flow

```
┌─────────────────┐
│  Demo Screen    │
│  (User Action)  │
└────────┬────────┘
         │
         ├─────────────────────────────┐
         │                             │
         ▼                             ▼
┌─────────────────┐         ┌──────────────────┐
│ Simulator       │         │  useWorkflow     │
│ Service         │         │  Hook            │
│                 │         │                  │
│ - Create WF     │         │ - REST API       │
│ - Send Updates  │         │ - WebSocket      │
└────────┬────────┘         │ - TanStack Query │
         │                  └────────┬─────────┘
         │                           │
         ▼                           ▼
┌──────────────────────────────────────┐
│     SpectralNotify Server            │
│                                      │
│  - Workflow DO Storage               │
│  - WebSocket Broadcasting            │
│  - Phase Progress Tracking           │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  WorkflowViewer  │
│  Component       │
│                  │
│  - Displays Data │
│  - Real-time UI  │
└──────────────────┘
```

### Key Components

#### 1. `useWorkflow` Hook
```typescript
const {
  workflow,        // Full workflow data
  isLoading,       // Loading state
  isConnected,     // WebSocket status
  isConnecting,    // Connection in progress
  connectionError  // Error message
} = useWorkflow({ workflowId });
```

#### 2. Workflow Simulator
```typescript
// Create workflow and start simulation
const workflowId = await runYouTubeTranscriptionDemo();

// Internally:
// 1. Creates workflow with 4 phases
// 2. Starts async simulation
// 3. Sends progress updates via API
// 4. Completes phases sequentially
// 5. Marks workflow complete
```

#### 3. WorkflowViewer Component
- Displays workflow header with metadata
- Shows overall progress bar
- Lists all phases with individual progress
- Displays event timeline with timestamps
- Shows connection status indicators

## API Endpoints Used

### Create Workflow
```
POST /rpc/workflows.create
Body: {
  id: string,
  status: "pending",
  phases: WorkflowPhase[],
  metadata: NotifyMetadata
}
```

### Update Phase Progress
```
POST /rpc/workflows.updatePhaseProgress
Body: {
  workflowId: string,
  phase: string,
  progress: number
}
```

### Complete Phase
```
POST /rpc/workflows.completePhase
Body: {
  workflowId: string,
  phase: string
}
```

### Complete Workflow
```
POST /rpc/workflows.complete
Body: {
  workflowId: string
}
```

### WebSocket Connection
```
ws://{server}/ws/workflow/{workflowId}
```

## Troubleshooting

### WebSocket Not Connecting
- Ensure server is running on `http://localhost:8094`
- Check `EXPO_PUBLIC_SERVER_URL` environment variable
- Verify firewall/network settings

### No Progress Updates
- Check browser/app console for errors
- Verify workflow was created successfully
- Ensure API endpoints are accessible

### Simulation Not Starting
- Check server logs for errors
- Verify workflow creation API call succeeded
- Ensure sufficient server resources

## Next Steps

### Enhancements
- Add pause/resume functionality
- Implement failure simulation
- Add multiple workflow tracking
- Export workflow data
- Add historical workflow viewer

### Production Use
- Replace simulator with real workflow orchestration
- Add authentication/authorization
- Implement workflow cancellation
- Add retry logic for failed phases
- Monitor WebSocket connection health
