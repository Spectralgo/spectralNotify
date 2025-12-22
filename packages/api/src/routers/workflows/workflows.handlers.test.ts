/**
 * Workflow Handlers Unit Tests
 *
 * Tests for the workflow handler functions that route requests
 * to the Workflow Durable Object.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  handleInitializeWorkflow,
  handleGetWorkflow,
  handleGetWorkflowPhases,
  handleUpdatePhaseProgress,
  handleCompletePhase,
  handleCompleteWorkflow,
  handleFailWorkflow,
  handleCancelWorkflow,
  handleGetWorkflowHistory,
  handleDeleteWorkflow,
  type EnrichedWorkflowResponse,
} from "./workflows.handlers";
import type { WorkflowMetadata, WorkflowPhase, WorkflowHistory } from "../../types/workflow";
import type { NotifyMetadata } from "../../types/metadata";

// ============================================================================
// Mock Data
// ============================================================================

const mockWorkflowMetadata: WorkflowMetadata = {
  id: 1,
  workflowId: "test-workflow-id",
  status: "in-progress",
  overallProgress: 40,
  expectedPhaseCount: 14,
  completedPhaseCount: 5,
  activePhaseKey: "digest.text",
  createdAt: "2024-12-16T00:00:00.000Z",
  updatedAt: "2024-12-16T00:01:00.000Z",
  completedAt: null,
  failedAt: null,
  canceledAt: null,
  metadata: JSON.stringify({}),
};

const mockPhases: WorkflowPhase[] = [
  {
    workflowId: "test-workflow-id",
    phaseKey: "transcription",
    label: "Transcription",
    weight: 0.4,
    status: "success",
    progress: 100,
    order: 0,
    parentPhaseKey: null,
    depth: 0,
    startedAt: "2024-12-16T00:00:00.000Z",
    updatedAt: "2024-12-16T00:01:00.000Z",
    completedAt: "2024-12-16T00:01:00.000Z",
  },
];

const mockHistory: WorkflowHistory[] = [
  {
    id: 1,
    workflowId: "test-workflow-id",
    eventType: "log",
    phaseKey: null,
    message: "Workflow created",
    progress: null,
    timestamp: "2024-12-16T00:00:00.000Z",
    metadata: null,
  },
];

const mockEnrichedResponse: EnrichedWorkflowResponse = {
  workflow: mockWorkflowMetadata,
  latestHistory: mockHistory,
};

// ============================================================================
// Mock Workflow Binding Factory
// ============================================================================

function createMockWorkflowBinding(stubOverrides: Partial<{
  initialize: ReturnType<typeof vi.fn>;
  getWorkflow: ReturnType<typeof vi.fn>;
  getPhases: ReturnType<typeof vi.fn>;
  updatePhaseProgress: ReturnType<typeof vi.fn>;
  completePhase: ReturnType<typeof vi.fn>;
  completeWorkflow: ReturnType<typeof vi.fn>;
  failWorkflow: ReturnType<typeof vi.fn>;
  cancelWorkflow: ReturnType<typeof vi.fn>;
  getHistory: ReturnType<typeof vi.fn>;
  deleteWorkflow: ReturnType<typeof vi.fn>;
}> = {}) {
  const mockStub = {
    initialize: vi.fn().mockResolvedValue(undefined),
    getWorkflow: vi.fn().mockResolvedValue(mockWorkflowMetadata),
    getPhases: vi.fn().mockResolvedValue(mockPhases),
    updatePhaseProgress: vi.fn().mockResolvedValue(mockEnrichedResponse),
    completePhase: vi.fn().mockResolvedValue(mockEnrichedResponse),
    completeWorkflow: vi.fn().mockResolvedValue(mockEnrichedResponse),
    failWorkflow: vi.fn().mockResolvedValue(mockEnrichedResponse),
    cancelWorkflow: vi.fn().mockResolvedValue(mockEnrichedResponse),
    getHistory: vi.fn().mockResolvedValue(mockHistory),
    deleteWorkflow: vi.fn().mockResolvedValue(undefined),
    ...stubOverrides,
  };

  return {
    idFromName: vi.fn().mockReturnValue({ toString: () => "mock-do-id" }),
    get: vi.fn().mockReturnValue(mockStub),
    _stub: mockStub, // Expose for test assertions
  };
}

// ============================================================================
// handleInitializeWorkflow Tests
// ============================================================================

describe("handleInitializeWorkflow", () => {
  it("ShouldCallDurableObjectInitializeWithPhases", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();
    const input = {
      workflowId: "test-workflow-id",
      status: "pending",
      phases: mockPhases,
      metadata: {
        author: { type: "user" as const, id: "user-123" },
        purpose: { title: "Test Workflow" },
      },
    };

    // Act
    await handleInitializeWorkflow(mockBinding, input);

    // Assert
    expect(mockBinding.idFromName).toHaveBeenCalledWith("test-workflow-id");
    expect(mockBinding.get).toHaveBeenCalled();
    expect(mockBinding._stub.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "test-workflow-id",
        status: "pending",
        phases: mockPhases,
      })
    );
  });

  it("ShouldAutoPopulateSystemAuthorWhenMissing", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();
    const input = {
      workflowId: "test-workflow-id",
      status: "pending",
      phases: mockPhases,
      metadata: {
        purpose: { title: "Test Workflow" },
        // No author provided
      },
    };

    // Act
    await handleInitializeWorkflow(mockBinding, input);

    // Assert
    expect(mockBinding._stub.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          author: {
            type: "system",
            id: "system",
            name: "System",
          },
        }),
      })
    );
  });

  it("ShouldPreserveProvidedAuthor", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();
    const customAuthor = { type: "user" as const, id: "user-456", name: "John" };
    const input = {
      workflowId: "test-workflow-id",
      status: "pending",
      phases: mockPhases,
      metadata: {
        author: customAuthor,
        purpose: { title: "Test Workflow" },
      },
    };

    // Act
    await handleInitializeWorkflow(mockBinding, input);

    // Assert
    expect(mockBinding._stub.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          author: customAuthor,
        }),
      })
    );
  });

  it("ShouldPassHierarchicalPhasesToDO", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();
    const hierarchicalPhases: WorkflowPhase[] = [
      {
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
      },
      {
        workflowId: "test-workflow-id",
        phaseKey: "transcription.download",
        label: "Download",
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
    ];

    const input = {
      workflowId: "test-workflow-id",
      status: "pending",
      phases: hierarchicalPhases,
      metadata: { purpose: { title: "Test" } },
    };

    // Act
    await handleInitializeWorkflow(mockBinding, input);

    // Assert
    expect(mockBinding._stub.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        phases: expect.arrayContaining([
          expect.objectContaining({
            phaseKey: "transcription",
            parentPhaseKey: null,
            depth: 0,
          }),
          expect.objectContaining({
            phaseKey: "transcription.download",
            parentPhaseKey: "transcription",
            depth: 1,
          }),
        ]),
      })
    );
  });
});

// ============================================================================
// handleGetWorkflow Tests
// ============================================================================

describe("handleGetWorkflow", () => {
  it("ShouldRouteToCorrectDurableObject", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();

    // Act
    const result = await handleGetWorkflow(mockBinding, "test-workflow-id");

    // Assert
    expect(mockBinding.idFromName).toHaveBeenCalledWith("test-workflow-id");
    expect(mockBinding._stub.getWorkflow).toHaveBeenCalled();
    expect(result).toEqual(mockWorkflowMetadata);
  });
});

// ============================================================================
// handleGetWorkflowPhases Tests
// ============================================================================

describe("handleGetWorkflowPhases", () => {
  it("ShouldReturnAllPhases", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();

    // Act
    const result = await handleGetWorkflowPhases(mockBinding, "test-workflow-id");

    // Assert
    expect(mockBinding._stub.getPhases).toHaveBeenCalled();
    expect(result).toEqual(mockPhases);
  });
});

// ============================================================================
// handleUpdatePhaseProgress Tests
// ============================================================================

describe("handleUpdatePhaseProgress", () => {
  it("ShouldRouteUpdateToCorrectDO", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();

    // Act
    const result = await handleUpdatePhaseProgress(
      mockBinding,
      "test-workflow-id",
      "transcription.download",
      75
    );

    // Assert
    expect(mockBinding.idFromName).toHaveBeenCalledWith("test-workflow-id");
    expect(mockBinding._stub.updatePhaseProgress).toHaveBeenCalledWith(
      "transcription.download",
      75,
      undefined
    );
    expect(result).toEqual(mockEnrichedResponse);
  });

  it("ShouldPassPhaseKeyAndProgress", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();

    // Act
    await handleUpdatePhaseProgress(
      mockBinding,
      "test-workflow-id",
      "digest.visual-analysis",
      50
    );

    // Assert
    expect(mockBinding._stub.updatePhaseProgress).toHaveBeenCalledWith(
      "digest.visual-analysis",
      50,
      undefined
    );
  });

  it("ShouldPassMetadataWhenProvided", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();
    const metadata: NotifyMetadata = {
      purpose: { title: "Progress Update" },
      tags: ["batch-1"],
    };

    // Act
    await handleUpdatePhaseProgress(
      mockBinding,
      "test-workflow-id",
      "transcription.download",
      100,
      metadata
    );

    // Assert
    expect(mockBinding._stub.updatePhaseProgress).toHaveBeenCalledWith(
      "transcription.download",
      100,
      metadata
    );
  });

  it("ShouldReturnEnrichedResponse", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();

    // Act
    const result = await handleUpdatePhaseProgress(
      mockBinding,
      "test-workflow-id",
      "transcription.download",
      100
    );

    // Assert
    expect(result).toHaveProperty("workflow");
    expect(result).toHaveProperty("latestHistory");
    expect(result.workflow).toEqual(mockWorkflowMetadata);
    expect(result.latestHistory).toEqual(mockHistory);
  });
});

// ============================================================================
// handleCompletePhase Tests
// ============================================================================

describe("handleCompletePhase", () => {
  it("ShouldCallCompletePhaseWithMetadata", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();
    const metadata: NotifyMetadata = {
      purpose: { title: "Phase Complete" },
    };

    // Act
    await handleCompletePhase(
      mockBinding,
      "test-workflow-id",
      "transcription.download",
      metadata
    );

    // Assert
    expect(mockBinding._stub.completePhase).toHaveBeenCalledWith(
      "transcription.download",
      metadata
    );
  });
});

// ============================================================================
// handleCompleteWorkflow Tests
// ============================================================================

describe("handleCompleteWorkflow", () => {
  it("ShouldCallDurableObjectCompleteWorkflow", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();
    const metadata: NotifyMetadata = {
      purpose: { title: "Workflow Complete" },
    };

    // Act
    const result = await handleCompleteWorkflow(
      mockBinding,
      "test-workflow-id",
      metadata
    );

    // Assert
    expect(mockBinding._stub.completeWorkflow).toHaveBeenCalledWith(metadata);
    expect(result).toEqual(mockEnrichedResponse);
  });
});

// ============================================================================
// handleFailWorkflow Tests
// ============================================================================

describe("handleFailWorkflow", () => {
  it("ShouldCallDurableObjectFailWithError", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();
    const errorMessage = "Transcription failed: network timeout";
    const metadata: NotifyMetadata = {
      purpose: { title: "Workflow Failed" },
    };

    // Act
    const result = await handleFailWorkflow(
      mockBinding,
      "test-workflow-id",
      errorMessage,
      metadata
    );

    // Assert
    expect(mockBinding._stub.failWorkflow).toHaveBeenCalledWith(
      errorMessage,
      metadata
    );
    expect(result).toEqual(mockEnrichedResponse);
  });
});

// ============================================================================
// handleCancelWorkflow Tests
// ============================================================================

describe("handleCancelWorkflow", () => {
  it("ShouldCallDurableObjectCancel", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();
    const metadata: NotifyMetadata = {
      purpose: { title: "Workflow Cancelled" },
    };

    // Act
    const result = await handleCancelWorkflow(
      mockBinding,
      "test-workflow-id",
      metadata
    );

    // Assert
    expect(mockBinding._stub.cancelWorkflow).toHaveBeenCalledWith(metadata);
    expect(result).toEqual(mockEnrichedResponse);
  });
});

// ============================================================================
// handleGetWorkflowHistory Tests
// ============================================================================

describe("handleGetWorkflowHistory", () => {
  it("ShouldReturnHistoryWithLimit", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();

    // Act
    const result = await handleGetWorkflowHistory(
      mockBinding,
      "test-workflow-id",
      10
    );

    // Assert
    expect(mockBinding._stub.getHistory).toHaveBeenCalledWith(10);
    expect(result).toEqual(mockHistory);
  });

  it("ShouldReturnHistoryWithoutLimit", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();

    // Act
    await handleGetWorkflowHistory(mockBinding, "test-workflow-id");

    // Assert
    expect(mockBinding._stub.getHistory).toHaveBeenCalledWith(undefined);
  });
});

// ============================================================================
// handleDeleteWorkflow Tests
// ============================================================================

describe("handleDeleteWorkflow", () => {
  it("ShouldCallDurableObjectDelete", async () => {
    // Arrange
    const mockBinding = createMockWorkflowBinding();

    // Act
    await handleDeleteWorkflow(mockBinding, "test-workflow-id");

    // Assert
    expect(mockBinding._stub.deleteWorkflow).toHaveBeenCalled();
  });
});
