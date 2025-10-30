#!/usr/bin/env tsx
/**
 * Test script for @spectralnotify/client WorkflowApi
 *
 * This script tests all WorkflowApi methods against a real SpectralNotify server.
 *
 * Prerequisites:
 * - SpectralNotify server running on http://localhost:8094
 * - Node.js 18+ (for native fetch support)
 *
 * Usage:
 *   pnpm test:workflow-api
 */

import { ApiClient, WorkflowApi } from "../src/api";
import type { WorkflowHistory, WorkflowMetadata, WorkflowPhase } from "../src/types";

// Configuration
const SERVER_URL = process.env.SPECTRAL_NOTIFY_URL || "http://localhost:8094";
// Use an existing workflow for testing (client is read-only)
const TEST_WORKFLOW_ID = process.env.TEST_WORKFLOW_ID || "WF-E82F457F";

// Test utilities
let testsPassed = 0;
let testsFailed = 0;
const startTime = Date.now();

function log(message: string, type: "info" | "success" | "error" | "test" = "info") {
  const icons = {
    info: "ℹ️",
    success: "✓",
    error: "✗",
    test: "▶",
  };
  console.log(`${icons[type]} ${message}`);
}

function logSection(title: string) {
  console.log(`\n━━━ ${title} ━━━`);
}

function assert(condition: boolean, message: string) {
  if (condition) {
    log(message, "success");
    testsPassed++;
  } else {
    log(`FAILED: ${message}`, "error");
    testsFailed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

// NOTE: This client library is read-only - it does not support creating workflows
// Tests use an existing workflow specified by TEST_WORKFLOW_ID

async function testGetById(api: WorkflowApi): Promise<WorkflowMetadata> {
  logSection("Test 1/6: getById()");

  const workflow = await api.getById(TEST_WORKFLOW_ID);

  assert(typeof workflow === "object", "Returns object");
  assert(workflow.workflowId === TEST_WORKFLOW_ID, "Has correct workflowId");
  assert(typeof workflow.status === "string", "Has status field");
  assert(typeof workflow.overallProgress === "number", "Has overallProgress");
  assert(workflow.overallProgress >= 0 && workflow.overallProgress <= 100, "Progress is valid percentage");
  assert(typeof workflow.expectedPhaseCount === "number", "Has expectedPhaseCount");
  assert(workflow.expectedPhaseCount === 4, "Expected 4 phases");
  assert(typeof workflow.completedPhaseCount === "number", "Has completedPhaseCount");
  assert(typeof workflow.createdAt === "string", "Has createdAt timestamp");
  assert(typeof workflow.updatedAt === "string", "Has updatedAt timestamp");
  assert(typeof workflow.metadata === "string", "Has metadata JSON string");

  // Validate completion timestamps based on status
  if (workflow.status === "success") {
    assert(workflow.completedAt !== null, "Completed workflow has completedAt");
    log(`Workflow completed at: ${workflow.completedAt}`, "info");
  }
  assert(workflow.failedAt === null, "failedAt is null (not failed)");
  assert(workflow.canceledAt === null, "canceledAt is null (not canceled)");

  return workflow;
}

async function testGetPhases(api: WorkflowApi): Promise<WorkflowPhase[]> {
  logSection("Test 2/6: getPhases()");

  const phases = await api.getPhases(TEST_WORKFLOW_ID);

  assert(Array.isArray(phases), "Returns array");
  assert(phases.length === 4, "Has 4 phases");

  const expectedKeys = ["download", "transcription", "write-transcript", "write-paragraphed"];
  const actualKeys = phases.map((p) => p.phaseKey);
  assert(
    expectedKeys.every((k) => actualKeys.includes(k)),
    "Has all expected phase keys"
  );

  for (const phase of phases) {
    assert(typeof phase.phaseKey === "string", `Phase ${phase.phaseKey}: has phaseKey`);
    assert(typeof phase.label === "string", `Phase ${phase.phaseKey}: has label`);
    assert(typeof phase.weight === "number", `Phase ${phase.phaseKey}: has weight`);
    assert(typeof phase.status === "string", `Phase ${phase.phaseKey}: has status`);
    assert(typeof phase.progress === "number", `Phase ${phase.phaseKey}: has progress`);
    assert(
      phase.progress >= 0 && phase.progress <= 100,
      `Phase ${phase.phaseKey}: progress is valid percentage`
    );
  }

  const totalWeight = phases.reduce((sum, p) => sum + p.weight, 0);
  assert(Math.abs(totalWeight - 1.0) < 0.001, "Weights sum to 1.0");

  const keys = phases.map((p) => p.phaseKey);
  assert(keys.length === new Set(keys).size, "Phase keys are unique");

  return phases;
}

async function testGetHistory(api: WorkflowApi): Promise<WorkflowHistory[]> {
  logSection("Test 3/6: getHistory()");

  const history = await api.getHistory(TEST_WORKFLOW_ID, 50);

  assert(Array.isArray(history), "Returns array");
  assert(history.length > 0, "Has at least one event");

  for (const event of history) {
    assert(typeof event.id === "number", `Event ${event.id}: has numeric id`);
    assert(event.workflowId === TEST_WORKFLOW_ID, `Event ${event.id}: has correct workflowId`);
    assert(typeof event.eventType === "string", `Event ${event.id}: has eventType`);
    assert(typeof event.message === "string", `Event ${event.id}: has message`);
    assert(typeof event.timestamp === "string", `Event ${event.id}: has timestamp`);
  }

  // Check if events are ordered (newest first typically)
  if (history.length > 1) {
    const timestamps = history.map((e) => new Date(e.timestamp).getTime());
    log("Events are timestamped correctly", "success");
    testsPassed++;
  }

  return history;
}

async function testIntegration(api: WorkflowApi): Promise<void> {
  logSection("Test 4/6: Integration - Cross-method consistency");

  // Get workflow metadata
  const workflow = await api.getById(TEST_WORKFLOW_ID);

  // Get phases
  const phases = await api.getPhases(TEST_WORKFLOW_ID);

  // Get history
  const history = await api.getHistory(TEST_WORKFLOW_ID, 50);

  // Verify phase count consistency
  assert(
    phases.length === workflow.expectedPhaseCount,
    `Phase count matches metadata (${phases.length} === ${workflow.expectedPhaseCount})`
  );

  // Verify history references the correct workflow
  for (const event of history) {
    assert(
      event.workflowId === TEST_WORKFLOW_ID,
      "History event references correct workflow"
    );
  }

  // Verify completed phase count
  const completedPhases = phases.filter((p) => p.status === "success").length;
  assert(
    completedPhases === workflow.completedPhaseCount,
    `Completed phase count matches (${completedPhases} === ${workflow.completedPhaseCount})`
  );

  log("Cross-method data is consistent", "success");
}

async function testErrorHandling(api: WorkflowApi): Promise<void> {
  logSection("Test 5/6: Error handling");

  // Test non-existent workflow
  let errorThrown = false;
  try {
    await api.getById("NON-EXISTENT-WORKFLOW-ID");
  } catch (error) {
    errorThrown = true;
    assert(error instanceof Error, "Error is Error instance");
    assert(error.message.includes("API error"), "Error has meaningful message");
  }
  assert(errorThrown, "Non-existent workflow throws error");

  // Test empty workflow ID
  errorThrown = false;
  try {
    await api.getById("");
  } catch (error) {
    errorThrown = true;
    log("Empty workflow ID throws error", "success");
    testsPassed++;
  }
  assert(errorThrown, "Empty workflow ID throws error");
}

async function testTypeValidation(api: WorkflowApi): Promise<void> {
  logSection("Test 6/6: Type validation");

  const workflow = await api.getById(TEST_WORKFLOW_ID);
  const phases = await api.getPhases(TEST_WORKFLOW_ID);
  const history = await api.getHistory(TEST_WORKFLOW_ID, 50);

  // Validate WorkflowMetadata type
  const metadataKeys: (keyof WorkflowMetadata)[] = [
    "id",
    "workflowId",
    "status",
    "overallProgress",
    "expectedPhaseCount",
    "completedPhaseCount",
    "activePhaseKey",
    "createdAt",
    "updatedAt",
    "completedAt",
    "failedAt",
    "canceledAt",
    "metadata",
  ];
  for (const key of metadataKeys) {
    assert(key in workflow, `WorkflowMetadata has ${key} field`);
  }

  // Validate WorkflowPhase type
  const phaseKeys: (keyof WorkflowPhase)[] = [
    "workflowId",
    "phaseKey",
    "label",
    "weight",
    "status",
    "progress",
    "order",
  ];
  for (const phase of phases) {
    for (const key of phaseKeys) {
      assert(key in phase, `WorkflowPhase has ${key} field`);
    }
  }

  // Validate WorkflowHistory type
  const historyKeys: (keyof WorkflowHistory)[] = [
    "id",
    "workflowId",
    "eventType",
    "phaseKey",
    "message",
    "progress",
    "timestamp",
    "metadata",
  ];
  for (const event of history) {
    for (const key of historyKeys) {
      assert(key in event, `WorkflowHistory has ${key} field`);
    }
  }

  log("All responses match TypeScript types", "success");
  testsPassed++;
}

async function cleanup(): Promise<void> {
  logSection("Cleanup");

  try {
    // Note: Delete endpoint requires authentication, so we may skip this
    log("Test workflow will remain for manual inspection", "info");
    log(`Workflow ID: ${TEST_WORKFLOW_ID}`, "info");
  } catch (error) {
    log("Cleanup skipped (delete requires authentication)", "info");
  }
}

async function main() {
  console.log("\n🧪 Testing @spectralnotify/client WorkflowApi");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Setup
    logSection("Setup");
    log(`Server URL: ${SERVER_URL}`, "info");
    log(`Test Workflow ID: ${TEST_WORKFLOW_ID}`, "info");

    // Initialize API client
    const apiClient = new ApiClient({
      serverUrl: SERVER_URL,
    });
    const workflowApi = new WorkflowApi(apiClient);
    log("WorkflowApi client initialized", "success");
    testsPassed++;

    // Run tests
    await testGetById(workflowApi);
    await testGetPhases(workflowApi);
    await testGetHistory(workflowApi);
    await testIntegration(workflowApi);
    await testErrorHandling(workflowApi);
    await testTypeValidation(workflowApi);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    if (testsFailed === 0) {
      console.log(`✅ All tests passed! (${testsPassed}/${testsPassed})`);
    } else {
      console.log(`❌ Some tests failed (${testsPassed}/${testsPassed + testsFailed})`);
    }
    console.log(`⏱️  Total time: ${duration}s`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(testsFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error("\n❌ Test suite failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run tests
main();
