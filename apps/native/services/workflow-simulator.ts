import { Platform } from "react-native";
import { ApiClient, WorkflowApi } from "@spectralnotify/react-native";
import type { NotifyMetadata, WorkflowPhaseInput } from "@spectralnotify/react-native";

// Android emulator uses 10.0.2.2 to access host machine's localhost
const getServerUrl = () => {
  if (process.env.EXPO_PUBLIC_SERVER_URL) {
    return process.env.EXPO_PUBLIC_SERVER_URL;
  }
  // Android emulator localhost mapping
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8094";
  }
  return "http://localhost:8094";
};

const SERVER_URL = getServerUrl();
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || "local-dev-key";

// Initialize API client and workflow API
const apiClient = new ApiClient({
  serverUrl: SERVER_URL,
  apiKey: API_KEY,
});

const workflowApi = new WorkflowApi(apiClient);

/**
 * Sleep utility for timing simulation
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate a unique workflow ID
 */
function generateWorkflowId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WF-${timestamp}-${random}`;
}

/**
 * Create a YouTube transcription workflow
 */
export async function createYouTubeWorkflow(): Promise<string> {
  const workflowId = generateWorkflowId();

  const metadata: NotifyMetadata = {
    purpose: {
      title: "Transcribe YouTube Video (audio)",
      description: "Full transcription pipeline for YouTube video audio",
    },
    author: {
      type: "user",
      id: "user-123",
      name: "Demo User",
    },
    origin: {
      repo: "spectralTranscript",
      app: "server",
      module: "YouTubeTranscriptionOrchestrationService",
    },
  };

  // API expects 'key' not 'phaseKey' in the input schema
  const phases: WorkflowPhaseInput[] = [
    {
      key: "download",
      label: "Download",
      weight: 0.4, // 40% of workflow
      status: "pending",
      progress: 0,
    },
    {
      key: "transcription",
      label: "Transcription",
      weight: 0.5, // 50% of workflow
      status: "pending",
      progress: 0,
    },
    {
      key: "write-transcript",
      label: "Write Transcript JSON",
      weight: 0.05, // 5% of workflow
      status: "pending",
      progress: 0,
    },
    {
      key: "write-paragraphed",
      label: "Write Paragraphed Transcript JSON",
      weight: 0.05, // 5% of workflow
      status: "pending",
      progress: 0,
    },
  ];

  try {
    console.log(`[Simulator] Connecting to ${SERVER_URL}`);

    const result = await workflowApi.create(workflowId, phases, metadata);

    console.log("[Simulator] Workflow created:", result);

    return workflowId;
  } catch (error) {
    console.error("[Simulator] Network error:", error);
    throw new Error(
      `Cannot connect to server at ${SERVER_URL}. ` +
      `Make sure the backend is running and accessible from ${Platform.OS === "android" ? "the emulator" : "your device"}.`
    );
  }
}

/**
 * Update phase progress
 */
async function updatePhaseProgress(
  workflowId: string,
  phase: string,
  progress: number
): Promise<void> {
  try {
    await workflowApi.updatePhaseProgress(workflowId, phase, progress);
  } catch (error) {
    console.error(`Failed to update phase progress: ${error}`);
  }
}

/**
 * Complete a phase
 */
async function completePhase(workflowId: string, phase: string): Promise<void> {
  try {
    await workflowApi.completePhase(workflowId, phase);
  } catch (error) {
    console.error(`Failed to complete phase: ${error}`);
  }
}

/**
 * Complete the workflow
 */
async function completeWorkflow(workflowId: string): Promise<void> {
  try {
    await workflowApi.complete(workflowId);
  } catch (error) {
    console.error(`Failed to complete workflow: ${error}`);
  }
}

/**
 * Simulate Phase 1: Download (12 seconds)
 * Progress: [0, 1, 2, 5, 8, 11, 15, 22, 30, 44, 58, 72, 88, 95, 100]
 */
async function simulateDownloadPhase(workflowId: string): Promise<void> {
  const progressUpdates = [
    { progress: 0, delay: 0 },
    { progress: 1, delay: 500 },
    { progress: 2, delay: 500 },
    { progress: 5, delay: 700 },
    { progress: 8, delay: 800 },
    { progress: 11, delay: 900 },
    { progress: 15, delay: 1000 },
    { progress: 22, delay: 1000 },
    { progress: 30, delay: 1100 },
    { progress: 44, delay: 1100 },
    { progress: 58, delay: 1000 },
    { progress: 72, delay: 900 },
    { progress: 88, delay: 800 },
    { progress: 95, delay: 600 },
    { progress: 100, delay: 500 },
  ];

  console.log("[Simulator] Starting Download phase");

  for (const { progress, delay } of progressUpdates) {
    await updatePhaseProgress(workflowId, "download", progress);
    await sleep(delay);
  }

  await completePhase(workflowId, "download");
  console.log("[Simulator] Download phase complete");
}

/**
 * Simulate Phase 2: Transcription (15 seconds)
 * Progress: [0, 10, 25, 40, 55, 70, 85, 95, 100]
 */
async function simulateTranscriptionPhase(workflowId: string): Promise<void> {
  const progressUpdates = [
    { progress: 0, delay: 0 },
    { progress: 10, delay: 1500 },
    { progress: 25, delay: 1800 },
    { progress: 40, delay: 1800 },
    { progress: 55, delay: 2000 },
    { progress: 70, delay: 2000 },
    { progress: 85, delay: 2000 },
    { progress: 95, delay: 1900 },
    { progress: 100, delay: 2000 },
  ];

  console.log("[Simulator] Starting Transcription phase");

  for (const { progress, delay } of progressUpdates) {
    await updatePhaseProgress(workflowId, "transcription", progress);
    await sleep(delay);
  }

  await completePhase(workflowId, "transcription");
  console.log("[Simulator] Transcription phase complete");
}

/**
 * Simulate Phase 3: Write Transcript JSON (1.5 seconds)
 * Progress: [0, 50, 100]
 */
async function simulateWriteTranscriptPhase(workflowId: string): Promise<void> {
  const progressUpdates = [
    { progress: 0, delay: 0 },
    { progress: 50, delay: 500 },
    { progress: 100, delay: 500 },
  ];

  console.log("[Simulator] Starting Write Transcript JSON phase");

  for (const { progress, delay } of progressUpdates) {
    await updatePhaseProgress(workflowId, "write-transcript", progress);
    await sleep(delay);
  }

  await completePhase(workflowId, "write-transcript");
  console.log("[Simulator] Write Transcript JSON phase complete");
}

/**
 * Simulate Phase 4: Write Paragraphed Transcript (1.5 seconds)
 * Progress: [0, 50, 100]
 */
async function simulateWriteParagraphedPhase(workflowId: string): Promise<void> {
  const progressUpdates = [
    { progress: 0, delay: 0 },
    { progress: 50, delay: 500 },
    { progress: 100, delay: 500 },
  ];

  console.log("[Simulator] Starting Write Paragraphed Transcript phase");

  for (const { progress, delay } of progressUpdates) {
    await updatePhaseProgress(workflowId, "write-paragraphed", progress);
    await sleep(delay);
  }

  await completePhase(workflowId, "write-paragraphed");
  console.log("[Simulator] Write Paragraphed Transcript phase complete");
}

/**
 * Execute the complete YouTube transcription workflow simulation
 * Total duration: 30 seconds
 */
export async function simulateWorkflowExecution(workflowId: string): Promise<void> {
  const startTime = Date.now();
  console.log(`[Simulator] Starting workflow simulation: ${workflowId}`);

  try {
    // Phase 1: Download (12s)
    await simulateDownloadPhase(workflowId);

    // Phase 2: Transcription (15s)
    await simulateTranscriptionPhase(workflowId);

    // Phase 3: Write Transcript JSON (1.5s)
    await simulateWriteTranscriptPhase(workflowId);

    // Phase 4: Write Paragraphed Transcript (1.5s)
    await simulateWriteParagraphedPhase(workflowId);

    // Complete workflow
    await completeWorkflow(workflowId);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Simulator] Workflow completed in ${duration}s`);
  } catch (error) {
    console.error("[Simulator] Error during workflow simulation:", error);
    throw error;
  }
}

/**
 * Run the complete demo: create workflow and execute simulation
 */
export async function runYouTubeTranscriptionDemo(): Promise<string> {
  console.log("[Simulator] Creating YouTube transcription workflow...");
  const workflowId = await createYouTubeWorkflow();

  console.log("[Simulator] Starting workflow execution...");
  // Run simulation asynchronously (don't await)
  simulateWorkflowExecution(workflowId).catch((error) => {
    console.error("[Simulator] Workflow simulation failed:", error);
  });

  return workflowId;
}
