/**
 * Mock infrastructure for Workflow Durable Object unit tests
 *
 * Provides mock implementations for:
 * - DurableObjectState (storage, concurrency, WebSockets)
 * - Drizzle database operations
 * - WebSocket sessions
 */

import { vi } from "vitest";
import type {
  WorkflowMetadata,
  WorkflowPhase,
  WorkflowHistory,
} from "../workflow-schema";

// ============================================================================
// Mock Data Factories
// ============================================================================

/**
 * Create a mock WorkflowMetadata object
 */
export function createMockWorkflowMetadata(
  overrides: Partial<WorkflowMetadata> = {}
): WorkflowMetadata {
  const now = new Date().toISOString();
  return {
    id: 1,
    workflowId: "test-workflow-id",
    status: "pending",
    overallProgress: 0,
    expectedPhaseCount: 14,
    completedPhaseCount: 0,
    activePhaseKey: "transcription",
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    failedAt: null,
    canceledAt: null,
    metadata: JSON.stringify({}),
    ...overrides,
  };
}

/**
 * Create a mock WorkflowPhase object
 */
export function createMockWorkflowPhase(
  overrides: Partial<WorkflowPhase> = {}
): WorkflowPhase {
  return {
    workflowId: "test-workflow-id",
    phaseKey: "transcription",
    label: "Transcription",
    weight: 0.4,
    status: "pending",
    progress: 0,
    order: 0,
    parentPhaseKey: null,
    depth: 0,
    startedAt: null,
    updatedAt: null,
    completedAt: null,
    ...overrides,
  };
}

/**
 * Create the hierarchical TranscriptDigest phases for testing
 */
export function createTranscriptDigestPhases(): WorkflowPhase[] {
  const workflowId = "test-workflow-id";
  return [
    // Parent: transcription (40%)
    {
      workflowId,
      phaseKey: "transcription",
      label: "Transcription",
      weight: 0.4,
      status: "pending",
      progress: 0,
      order: 0,
      parentPhaseKey: null,
      depth: 0,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    {
      workflowId,
      phaseKey: "transcription.download",
      label: "Downloading video",
      weight: 0.4,
      status: "pending",
      progress: 0,
      order: 1,
      parentPhaseKey: "transcription",
      depth: 1,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    {
      workflowId,
      phaseKey: "transcription.transcription",
      label: "Transcribing audio",
      weight: 0.4,
      status: "pending",
      progress: 0,
      order: 2,
      parentPhaseKey: "transcription",
      depth: 1,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    {
      workflowId,
      phaseKey: "transcription.write-transcript",
      label: "Writing transcript",
      weight: 0.1,
      status: "pending",
      progress: 0,
      order: 3,
      parentPhaseKey: "transcription",
      depth: 1,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    {
      workflowId,
      phaseKey: "transcription.write-paragraphed",
      label: "Writing paragraphed transcript",
      weight: 0.1,
      status: "pending",
      progress: 0,
      order: 4,
      parentPhaseKey: "transcription",
      depth: 1,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    // Parent: digest (60%)
    {
      workflowId,
      phaseKey: "digest",
      label: "Full Digest",
      weight: 0.6,
      status: "pending",
      progress: 0,
      order: 5,
      parentPhaseKey: null,
      depth: 0,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    {
      workflowId,
      phaseKey: "digest.text",
      label: "Generating text digest",
      weight: 0.03,
      status: "pending",
      progress: 0,
      order: 6,
      parentPhaseKey: "digest",
      depth: 1,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    {
      workflowId,
      phaseKey: "digest.analyze",
      label: "Analyzing transcript",
      weight: 0.05,
      status: "pending",
      progress: 0,
      order: 7,
      parentPhaseKey: "digest",
      depth: 1,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    {
      workflowId,
      phaseKey: "digest.extract-frames",
      label: "Extracting frames",
      weight: 0.17,
      status: "pending",
      progress: 0,
      order: 8,
      parentPhaseKey: "digest",
      depth: 1,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    {
      workflowId,
      phaseKey: "digest.detect-dead-time",
      label: "Detecting dead time",
      weight: 0.08,
      status: "pending",
      progress: 0,
      order: 9,
      parentPhaseKey: "digest",
      depth: 1,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    {
      workflowId,
      phaseKey: "digest.select-candidates",
      label: "Selecting candidates",
      weight: 0.08,
      status: "pending",
      progress: 0,
      order: 10,
      parentPhaseKey: "digest",
      depth: 1,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    {
      workflowId,
      phaseKey: "digest.visual-analysis",
      label: "AI visual analysis",
      weight: 0.45,
      status: "pending",
      progress: 0,
      order: 11,
      parentPhaseKey: "digest",
      depth: 1,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    {
      workflowId,
      phaseKey: "digest.merge",
      label: "Merging digests",
      weight: 0.05,
      status: "pending",
      progress: 0,
      order: 12,
      parentPhaseKey: "digest",
      depth: 1,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
    {
      workflowId,
      phaseKey: "digest.persist",
      label: "Saving to storage",
      weight: 0.09,
      status: "pending",
      progress: 0,
      order: 13,
      parentPhaseKey: "digest",
      depth: 1,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
    },
  ];
}

/**
 * Create a mock WorkflowHistory entry
 */
export function createMockWorkflowHistory(
  overrides: Partial<WorkflowHistory> = {}
): WorkflowHistory {
  return {
    id: 1,
    workflowId: "test-workflow-id",
    eventType: "log",
    phaseKey: null,
    message: "Test event",
    progress: null,
    timestamp: new Date().toISOString(),
    metadata: null,
    ...overrides,
  };
}

// ============================================================================
// Mock Durable Object State
// ============================================================================

/**
 * Create a mock DurableObjectState for unit tests
 */
export function createMockDurableObjectState() {
  const webSockets: WebSocket[] = [];

  return {
    storage: {
      deleteAll: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue(new Map()),
    },
    blockConcurrencyWhile: vi
      .fn()
      .mockImplementation(async (fn: () => Promise<void>) => {
        await fn();
      }),
    getWebSockets: vi.fn().mockReturnValue(webSockets),
    acceptWebSocket: vi.fn().mockImplementation((ws: WebSocket) => {
      webSockets.push(ws);
    }),
    setWebSocketAutoResponse: vi.fn(),
  };
}

// ============================================================================
// Mock Drizzle Database
// ============================================================================

type MockTransaction = {
  select: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
};

/**
 * Create a chainable mock for Drizzle query builder
 */
export function createMockDrizzleDb() {
  const createChainableMock = (): MockTransaction => {
    const mock: MockTransaction = {
      select: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
      insert: vi.fn(),
      values: vi.fn(),
      update: vi.fn(),
      set: vi.fn(),
    };

    // Make methods chainable
    mock.select.mockReturnValue(mock);
    mock.from.mockReturnValue(mock);
    mock.where.mockReturnValue(mock);
    mock.orderBy.mockReturnValue(mock);
    mock.limit.mockReturnValue(mock);
    mock.insert.mockReturnValue(mock);
    mock.update.mockReturnValue(mock);
    mock.set.mockReturnValue(mock);
    mock.values.mockResolvedValue(undefined);
    mock.get.mockResolvedValue(undefined);
    mock.all.mockResolvedValue([]);

    return mock;
  };

  const baseMock = createChainableMock();

  return {
    ...baseMock,
    transaction: vi
      .fn()
      .mockImplementation(
        async (fn: (tx: MockTransaction) => Promise<void>) => {
          const txMock = createChainableMock();
          await fn(txMock);
        }
      ),
  };
}

// ============================================================================
// Mock WebSocket
// ============================================================================

/**
 * Create a mock WebSocket for broadcasting tests
 */
export function createMockWebSocket() {
  return {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    serializeAttachment: vi.fn(),
    deserializeAttachment: vi.fn().mockReturnValue({
      id: "mock-session-id",
      subscribedAt: new Date().toISOString(),
    }),
  };
}

// ============================================================================
// Progress Calculation Test Helpers
// ============================================================================

/**
 * Helper to update phase progress in test data
 */
export function updatePhaseProgress(
  phases: WorkflowPhase[],
  phaseKey: string,
  progress: number
): WorkflowPhase[] {
  return phases.map((phase) =>
    phase.phaseKey === phaseKey
      ? {
          ...phase,
          progress,
          status: progress === 100 ? "success" : "in-progress",
        }
      : phase
  );
}

/**
 * Calculate expected hierarchical progress (mirrors Workflow DO logic)
 * This is used to verify the actual implementation
 */
export function calculateExpectedHierarchicalProgress(
  phases: WorkflowPhase[]
): number {
  const topLevelPhases = phases.filter((p) => !p.parentPhaseKey);

  const calculatePhaseProgress = (phase: WorkflowPhase): number => {
    const children = phases.filter((p) => p.parentPhaseKey === phase.phaseKey);

    if (children.length === 0) {
      return phase.progress;
    }

    return children.reduce((sum, child) => {
      const childProgress = calculatePhaseProgress(child);
      return sum + childProgress * child.weight;
    }, 0);
  };

  const overallProgress = topLevelPhases.reduce((sum, phase) => {
    const phaseProgress = calculatePhaseProgress(phase);
    return sum + phaseProgress * phase.weight;
  }, 0);

  return Math.floor(overallProgress);
}
