/**
 * Integration test for REST API + WebSocket workflow updates
 *
 * This test verifies:
 * 1. REST API creates workflows with idempotency keys
 * 2. WebSocket receives real-time updates (native WebSocket, no oRPC)
 * 3. Integration between REST writes and WebSocket events works correctly
 * 4. All event types are properly formatted and delivered
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ApiClient, WorkflowApi } from "../src/api";
import { createWorkflowWebSocket } from "../src/websocket/workflow-ws";
import type { WorkflowWebSocketMessage, WorkflowPhaseInput, NotifyMetadata } from "../src/types";

// Test configuration
const SERVER_URL = process.env.TEST_SERVER_URL || "http://localhost:8094";
const API_KEY = process.env.TEST_API_KEY || "test-api-key";
const TEST_TIMEOUT = 30000; // 30 seconds

describe("Workflow REST API + WebSocket Integration", () => {
  let apiClient: ApiClient;
  let workflowApi: WorkflowApi;
  let workflowId: string;
  let websocket: WebSocket | null = null;
  const receivedMessages: WorkflowWebSocketMessage[] = [];

  beforeAll(() => {
    // Initialize REST API client
    apiClient = new ApiClient({
      serverUrl: SERVER_URL,
      apiKey: API_KEY,
    });
    workflowApi = new WorkflowApi(apiClient);
  });

  afterAll(() => {
    // Cleanup WebSocket connection
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.close();
    }
  });

  it("should create workflow via REST API", async () => {
    // Generate unique workflow ID for this test
    workflowId = `TEST-WF-${Date.now()}`;

    const metadata: NotifyMetadata = {
      purpose: {
        title: "Integration Test Workflow",
        description: "Testing REST API + WebSocket integration",
      },
      author: {
        type: "system",
        id: "test-suite",
        name: "Integration Test",
      },
      origin: {
        repo: "spectralNotify",
        app: "client",
        module: "IntegrationTest",
      },
    };

    const phases: WorkflowPhaseInput[] = [
      {
        key: "phase-1",
        label: "Phase 1",
        weight: 0.33,
      },
      {
        key: "phase-2",
        label: "Phase 2",
        weight: 0.33,
      },
      {
        key: "phase-3",
        label: "Phase 3",
        weight: 0.34,
      },
    ];

    console.log(`[Test] Creating workflow: ${workflowId}`);
    const result = await workflowApi.create(workflowId, phases, metadata);

    expect(result).toBeDefined();
    expect(result.workflow).toBeDefined();
    expect(result.workflow.workflowId).toBe(workflowId);
    expect(result.workflow.status).toBe("in-progress");
    expect(result.phases).toHaveLength(3);

    console.log(`[Test] ✓ Workflow created successfully`);
  }, TEST_TIMEOUT);

  it("should establish WebSocket connection and receive updates", async () => {
    // Create promise to wait for WebSocket connection
    const wsConnected = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
      }, 5000);

      websocket = createWorkflowWebSocket(SERVER_URL, workflowId, {
        onOpen: () => {
          clearTimeout(timeout);
          console.log(`[Test] ✓ WebSocket connected to workflow: ${workflowId}`);
          resolve();
        },
        onError: (error) => {
          clearTimeout(timeout);
          console.error(`[Test] ✗ WebSocket error:`, error);
          reject(error);
        },
        onMessage: (message) => {
          console.log(`[Test] ← WebSocket message:`, message.type);
          receivedMessages.push(message);
        },
      });
    });

    await wsConnected;
    expect(websocket).toBeDefined();
    expect(websocket?.readyState).toBe(WebSocket.OPEN);
  }, TEST_TIMEOUT);

  it("should update phase 1 progress and receive WebSocket events", async () => {
    expect(websocket?.readyState).toBe(WebSocket.OPEN);

    // Clear previous messages
    receivedMessages.length = 0;

    // Update phase 1 progress to 50%
    console.log(`[Test] → Updating phase-1 progress to 50%`);
    await workflowApi.updatePhaseProgress(workflowId, "phase-1", 50);

    // Wait for WebSocket message
    await waitForMessage("phase-progress", 3000);

    // Verify we received the update
    const progressEvent = receivedMessages.find(
      (msg) => msg.type === "phase-progress" && "phase" in msg && msg.phase === "phase-1"
    );

    expect(progressEvent).toBeDefined();
    if (progressEvent && "progress" in progressEvent) {
      expect(progressEvent.progress).toBe(50);
      expect(progressEvent.workflowId).toBe(workflowId);
      expect(progressEvent.workflow).toBeDefined();
      expect(progressEvent.phases).toBeDefined();
      console.log(`[Test] ✓ Received phase-progress event for phase-1 (50%)`);
    }
  }, TEST_TIMEOUT);

  it("should complete phase 1 and receive WebSocket event", async () => {
    receivedMessages.length = 0;

    console.log(`[Test] → Completing phase-1`);
    await workflowApi.completePhase(workflowId, "phase-1");

    await waitForMessage("phase-progress", 3000);

    const completeEvent = receivedMessages.find(
      (msg) => msg.type === "phase-progress" && "phase" in msg && msg.phase === "phase-1"
    );

    expect(completeEvent).toBeDefined();
    if (completeEvent && "progress" in completeEvent) {
      expect(completeEvent.progress).toBe(100);
      console.log(`[Test] ✓ Received phase completion event for phase-1`);
    }
  }, TEST_TIMEOUT);

  it("should update and complete phase 2", async () => {
    receivedMessages.length = 0;

    // Update to 75%
    console.log(`[Test] → Updating phase-2 progress to 75%`);
    await workflowApi.updatePhaseProgress(workflowId, "phase-2", 75);
    await waitForMessage("phase-progress", 3000);

    // Complete phase 2
    console.log(`[Test] → Completing phase-2`);
    await workflowApi.completePhase(workflowId, "phase-2");
    await waitForMessage("phase-progress", 3000);

    const events = receivedMessages.filter(
      (msg) => msg.type === "phase-progress" && "phase" in msg && msg.phase === "phase-2"
    );

    expect(events.length).toBeGreaterThanOrEqual(2);
    console.log(`[Test] ✓ Received phase-2 progress events`);
  }, TEST_TIMEOUT);

  it("should update and complete phase 3", async () => {
    receivedMessages.length = 0;

    // Update to 100% (complete)
    console.log(`[Test] → Completing phase-3`);
    await workflowApi.completePhase(workflowId, "phase-3");
    await waitForMessage("phase-progress", 3000);

    const event = receivedMessages.find(
      (msg) => msg.type === "phase-progress" && "phase" in msg && msg.phase === "phase-3"
    );

    expect(event).toBeDefined();
    console.log(`[Test] ✓ Received phase-3 completion event`);
  }, TEST_TIMEOUT);

  it("should complete workflow and receive final event", async () => {
    receivedMessages.length = 0;

    console.log(`[Test] → Completing workflow`);
    await workflowApi.complete(workflowId);

    // Wait for complete event
    await waitForMessage("complete", 3000);

    const completeEvent = receivedMessages.find((msg) => msg.type === "complete");

    expect(completeEvent).toBeDefined();
    if (completeEvent && "workflow" in completeEvent) {
      expect(completeEvent.workflowId).toBe(workflowId);
      expect(completeEvent.workflow.status).toBe("success");
      console.log(`[Test] ✓ Workflow completed successfully`);
    }
  }, TEST_TIMEOUT);

  it("should verify all phases are complete", async () => {
    const phases = await workflowApi.getPhases(workflowId);

    expect(phases).toHaveLength(3);
    for (const phase of phases) {
      expect(phase.status).toBe("success");
      expect(phase.progress).toBe(100);
    }

    console.log(`[Test] ✓ All phases verified as complete`);
  }, TEST_TIMEOUT);

  it("should verify workflow metadata shows completion", async () => {
    const workflow = await workflowApi.getById(workflowId);

    expect(workflow.workflowId).toBe(workflowId);
    expect(workflow.status).toBe("success");
    expect(workflow.overallProgress).toBe(100);
    expect(workflow.completedPhaseCount).toBe(3);
    expect(workflow.completedAt).toBeDefined();

    console.log(`[Test] ✓ Workflow metadata verified`);
  }, TEST_TIMEOUT);

  it("should retrieve workflow history", async () => {
    const history = await workflowApi.getHistory(workflowId, 100);

    expect(history.length).toBeGreaterThan(0);

    // Check for key events
    const createEvent = history.find((e) => e.type === "log" && e.message.includes("created"));
    const completeEvent = history.find((e) => e.type === "success");

    expect(createEvent).toBeDefined();
    expect(completeEvent).toBeDefined();

    console.log(`[Test] ✓ Retrieved ${history.length} history events`);
  }, TEST_TIMEOUT);

  // Helper function to wait for a specific message type
  function waitForMessage(messageType: string, timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const found = receivedMessages.some((msg) => msg.type === messageType);
        if (found) {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Timeout waiting for message type: ${messageType}`));
        }
      }, 100);
    });
  }
});
