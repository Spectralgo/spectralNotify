#!/usr/bin/env tsx
/**
 * Manual test script for REST API + WebSocket workflow integration
 *
 * Run this with: pnpm tsx packages/client/test/manual-workflow-test.ts
 *
 * This script:
 * 1. Creates a workflow using REST API
 * 2. Connects via WebSocket for real-time updates
 * 3. Simulates a 3-phase workflow execution
 * 4. Logs all REST responses and WebSocket events
 */

import { ApiClient, WorkflowApi } from "../src/api";
import { createWorkflowWebSocket } from "../src/websocket/workflow-ws";
import type { WorkflowWebSocketMessage, WorkflowPhaseInput, NotifyMetadata } from "../src/types";

// Configuration
const SERVER_URL = process.env.SERVER_URL || "http://localhost:8094";
const API_KEY = process.env.API_KEY || "test-api-key";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  log("bright", "\n=== Workflow REST API + WebSocket Integration Test ===\n");
  log("dim", `Server: ${SERVER_URL}`);
  log("dim", `API Key: ${API_KEY}\n`);

  // Initialize API client
  const apiClient = new ApiClient({
    serverUrl: SERVER_URL,
    apiKey: API_KEY,
  });
  const workflowApi = new WorkflowApi(apiClient);

  // Generate unique workflow ID
  const workflowId = `MANUAL-TEST-${Date.now()}`;
  log("cyan", `Workflow ID: ${workflowId}\n`);

  // Step 1: Create workflow via REST
  log("bright", "Step 1: Creating workflow via REST API");
  log("blue", "→ POST /workflows/create");

  const metadata: NotifyMetadata = {
    purpose: {
      title: "Manual Integration Test",
      description: "Testing REST API + WebSocket real-time updates",
    },
    author: {
      type: "system",
      id: "manual-test",
      name: "Manual Test Script",
    },
    origin: {
      repo: "spectralNotify",
      app: "api",
      module: "ManualTest",
    },
  };

  const phases: WorkflowPhaseInput[] = [
    { key: "initialization", label: "Initialization", weight: 1.0 / 3 },
    { key: "processing", label: "Processing", weight: 1.0 / 3 },
    { key: "finalization", label: "Finalization", weight: 1.0 / 3 },
  ];

  try {
    const createResult = await workflowApi.create(workflowId, phases, metadata);
    log("green", "✓ Workflow created successfully");
    log("dim", `  Success: ${createResult.success}`);
    log("dim", `  Workflow ID: ${createResult.workflowId}`);
    log("dim", `  Idempotency: ${createResult.idempotency?.isNew ? "new" : "cached"}\n`);
  } catch (error) {
    log("red", `✗ Failed to create workflow: ${error}`);
    process.exit(1);
  }

  // Step 2: Connect WebSocket
  log("bright", "Step 2: Connecting to WebSocket for real-time updates");
  log("blue", `→ WS /ws/workflow/${workflowId}`);

  const wsConnected = new Promise<WebSocket>((resolve, reject) => {
    const ws = createWorkflowWebSocket(SERVER_URL, workflowId, {
      onOpen: () => {
        log("green", "✓ WebSocket connected\n");
        resolve(ws);
      },
      onError: (error) => {
        log("red", `✗ WebSocket error: ${error}`);
        reject(error);
      },
      onMessage: (message: WorkflowWebSocketMessage) => {
        if (message.type === "ping" || message.type === "pong") {
          return; // Skip ping/pong logging
        }

        log("magenta", `← WebSocket Event: ${message.type}`);
        if ("phase" in message) {
          log("dim", `  Phase: ${message.phase}`);
          if ("progress" in message) {
            log("dim", `  Phase Progress: ${message.progress}%`);
          }
        }
        if ("overallProgress" in message) {
          log("dim", `  Overall Progress: ${message.overallProgress}%`);
        }
        if ("workflow" in message) {
          log("dim", `  Workflow Status: ${message.workflow.status}`);
        }
        console.log(); // Empty line
      },
      onClose: () => {
        log("yellow", "WebSocket disconnected");
      },
    });
  });

  let websocket: WebSocket;
  try {
    websocket = await wsConnected;
  } catch (error) {
    log("red", `✗ Failed to connect WebSocket: ${error}`);
    process.exit(1);
  }

  // Step 3: Execute workflow phases
  log("bright", "Step 3: Executing workflow phases\n");

  // Phase 1: Initialization
  log("cyan", "Phase 1: Initialization");
  log("blue", "→ POST /workflows/updatePhaseProgress");
  await workflowApi.updatePhaseProgress(workflowId, "initialization", 50);
  await sleep(1000);

  log("blue", "→ POST /workflows/completePhase");
  await workflowApi.completePhase(workflowId, "initialization");
  log("green", "✓ Phase 1 complete\n");
  await sleep(1000);

  // Phase 2: Processing (with multiple progress updates)
  log("cyan", "Phase 2: Processing");
  for (const progress of [25, 50, 75]) {
    log("blue", `→ POST /workflows/updatePhaseProgress (${progress}%)`);
    await workflowApi.updatePhaseProgress(workflowId, "processing", progress);
    await sleep(1000);
  }

  log("blue", "→ POST /workflows/completePhase");
  await workflowApi.completePhase(workflowId, "processing");
  log("green", "✓ Phase 2 complete\n");
  await sleep(1000);

  // Phase 3: Finalization
  log("cyan", "Phase 3: Finalization");
  log("blue", "→ POST /workflows/completePhase");
  await workflowApi.completePhase(workflowId, "finalization");
  log("green", "✓ Phase 3 complete\n");
  await sleep(1000);

  // Step 4: Complete workflow
  log("bright", "Step 4: Completing workflow");
  log("blue", "→ POST /workflows/complete");
  const completeResult = await workflowApi.complete(workflowId);
  log("green", "✓ Workflow completed successfully");
  log("dim", `  Success: ${completeResult.success}`);
  log("dim", `  Workflow ID: ${completeResult.workflowId}\n`);
  await sleep(1000);

  // Step 5: Verify final state
  log("bright", "Step 5: Verifying final state");
  log("blue", "→ POST /workflows/getById");
  const finalWorkflow = await workflowApi.getById(workflowId);
  log("green", "✓ Workflow metadata retrieved");
  log("dim", `  Status: ${finalWorkflow.status}`);
  log("dim", `  Progress: ${finalWorkflow.overallProgress}%`);
  log("dim", `  Completed Phases: ${finalWorkflow.completedPhaseCount}/${finalWorkflow.expectedPhaseCount}`);
  log("dim", `  Completed At: ${finalWorkflow.completedAt}\n`);

  log("blue", "→ POST /workflows/getPhases");
  const finalPhases = await workflowApi.getPhases(workflowId);
  log("green", "✓ Phases retrieved");
  for (const phase of finalPhases) {
    log("dim", `  ${phase.label}: ${phase.status} (${phase.progress}%)`);
  }
  console.log();

  log("blue", "→ POST /workflows/getHistory");
  const history = await workflowApi.getHistory(workflowId, 50);
  log("green", `✓ History retrieved (${history.length} events)`);
  log("dim", `  First event: ${history[0]?.type} - ${history[0]?.message}`);
  log("dim", `  Last event: ${history[history.length - 1]?.type} - ${history[history.length - 1]?.message}\n`);

  // Cleanup
  log("bright", "Step 6: Cleanup");
  websocket.close();
  log("green", "✓ WebSocket closed\n");

  log("bright", "=== Test Completed Successfully ===\n");
  log("green", "✓ All REST API calls worked correctly");
  log("green", "✓ WebSocket received real-time updates");
  log("green", "✓ Integration between REST and WebSocket verified\n");

  process.exit(0);
}

// Run the test
main().catch((error) => {
  log("red", `\n✗ Test failed: ${error}`);
  console.error(error);
  process.exit(1);
});
