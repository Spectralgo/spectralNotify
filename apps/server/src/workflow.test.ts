/**
 * Workflow Durable Object Unit Tests
 *
 * Tests for hierarchical workflow progress calculation and lifecycle management.
 * These tests verify the core logic of the Workflow Durable Object without
 * requiring actual Cloudflare infrastructure.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createTranscriptDigestPhases,
  updatePhaseProgress,
  calculateExpectedHierarchicalProgress,
  createMockWorkflowPhase,
} from "./__mocks__/durable-object.mock";
import type { WorkflowPhase } from "./workflow-schema";

// ============================================================================
// Hierarchical Progress Calculation Tests
// ============================================================================

describe("Workflow - Hierarchical Progress Calculation", () => {
  /**
   * Pure function implementation of calculateHierarchicalProgress
   * Mirrors the logic in Workflow Durable Object for unit testing
   */
  function calculateHierarchicalProgress(phases: WorkflowPhase[]): number {
    const topLevelPhases = phases.filter((p) => !p.parentPhaseKey);

    const calculatePhaseProgress = (phase: WorkflowPhase): number => {
      const children = phases.filter(
        (p) => p.parentPhaseKey === phase.phaseKey
      );

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

  describe("Behavior: Leaf Phase Progress", () => {
    it("ShouldReturnDirectProgressForLeafPhases", () => {
      // Arrange - Simple flat phases (no hierarchy)
      const phases: WorkflowPhase[] = [
        createMockWorkflowPhase({
          phaseKey: "phase1",
          weight: 0.5,
          progress: 50,
          parentPhaseKey: null,
        }),
        createMockWorkflowPhase({
          phaseKey: "phase2",
          weight: 0.5,
          progress: 100,
          parentPhaseKey: null,
        }),
      ];

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert - (50 * 0.5) + (100 * 0.5) = 25 + 50 = 75
      expect(result).toBe(75);
    });

    it("ShouldReturn0WhenAllPhasesAt0", () => {
      // Arrange
      const phases = createTranscriptDigestPhases();

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert
      expect(result).toBe(0);
    });

    it("ShouldReturn100WhenAllPhasesComplete", () => {
      // Arrange
      let phases = createTranscriptDigestPhases();
      // Complete all phases
      phases = phases.map((p) => ({ ...p, progress: 100, status: "success" }));

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert
      expect(result).toBe(100);
    });
  });

  describe("Behavior: Weighted Sum for Parent Phases", () => {
    it("ShouldComputeWeightedSumForParentPhases", () => {
      // Arrange - Parent with two children
      const phases: WorkflowPhase[] = [
        createMockWorkflowPhase({
          phaseKey: "parent",
          weight: 1.0,
          progress: 0, // Parent progress is computed from children
          parentPhaseKey: null,
        }),
        createMockWorkflowPhase({
          phaseKey: "child1",
          weight: 0.6,
          progress: 100,
          parentPhaseKey: "parent",
          depth: 1,
        }),
        createMockWorkflowPhase({
          phaseKey: "child2",
          weight: 0.4,
          progress: 50,
          parentPhaseKey: "parent",
          depth: 1,
        }),
      ];

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert - (100 * 0.6) + (50 * 0.4) = 60 + 20 = 80
      expect(result).toBe(80);
    });

    it("ShouldHandleTwoLevelHierarchy", () => {
      // Arrange - Full TranscriptDigest hierarchy
      let phases = createTranscriptDigestPhases();

      // Complete transcription.download (weight 0.4 of transcription)
      phases = updatePhaseProgress(phases, "transcription.download", 100);

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert
      // transcription.download = 100%, others = 0%
      // transcription progress = 100 * 0.4 = 40%
      // overall = 40 * 0.4 = 16%
      expect(result).toBe(16);
    });

    it("ShouldRoundProgressToInteger", () => {
      // Arrange - Set up phases that would produce a non-integer result
      let phases = createTranscriptDigestPhases();
      phases = updatePhaseProgress(phases, "transcription.download", 33);

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert - Should be floored to integer
      // 33 * 0.4 = 13.2 (transcription progress)
      // 13.2 * 0.4 = 5.28 (overall)
      // floor(5.28) = 5
      expect(result).toBe(5);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe("Behavior: TranscriptDigest Progress Scenarios", () => {
    it("ShouldCalculate16PercentWhenTranscriptionDownloadComplete", () => {
      // Arrange
      let phases = createTranscriptDigestPhases();
      phases = updatePhaseProgress(phases, "transcription.download", 100);

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert
      // transcription.download=100% → transcription=40% → overall=16%
      expect(result).toBe(16);
    });

    it("ShouldCalculate24PercentWhenTranscriptionIs60Percent", () => {
      // Arrange
      let phases = createTranscriptDigestPhases();
      // transcription.download = 100% (0.4 weight)
      // transcription.transcription = 50% (0.4 weight)
      // transcription progress = 100*0.4 + 50*0.4 = 60%
      phases = updatePhaseProgress(phases, "transcription.download", 100);
      phases = updatePhaseProgress(phases, "transcription.transcription", 50);

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert
      // transcription = 60% → overall = 60 * 0.4 = 24%
      expect(result).toBe(24);
    });

    it("ShouldCalculate40PercentWhenTranscriptionComplete", () => {
      // Arrange
      let phases = createTranscriptDigestPhases();
      phases = updatePhaseProgress(phases, "transcription.download", 100);
      phases = updatePhaseProgress(phases, "transcription.transcription", 100);
      phases = updatePhaseProgress(phases, "transcription.write-transcript", 100);
      phases = updatePhaseProgress(
        phases,
        "transcription.write-paragraphed",
        100
      );

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert
      // transcription = 100% → overall = 100 * 0.4 = 40%
      expect(result).toBe(40);
    });

    it("ShouldCalculateCorrectProgressWhenDigestIs50Percent", () => {
      // Arrange - Transcription complete, digest partially done
      let phases = createTranscriptDigestPhases();

      // Complete transcription (40% of overall)
      phases = updatePhaseProgress(phases, "transcription.download", 100);
      phases = updatePhaseProgress(phases, "transcription.transcription", 100);
      phases = updatePhaseProgress(phases, "transcription.write-transcript", 100);
      phases = updatePhaseProgress(
        phases,
        "transcription.write-paragraphed",
        100
      );

      // Partial digest progress
      // digest.text = 100% (weight 0.03)
      // digest.analyze = 100% (weight 0.05)
      // digest.extract-frames = 100% (weight 0.17)
      // digest.detect-dead-time = 100% (weight 0.08)
      // digest.select-candidates = 100% (weight 0.08)
      // Total so far: 0.03 + 0.05 + 0.17 + 0.08 + 0.08 = 0.41 = 41% of digest
      phases = updatePhaseProgress(phases, "digest.text", 100);
      phases = updatePhaseProgress(phases, "digest.analyze", 100);
      phases = updatePhaseProgress(phases, "digest.extract-frames", 100);
      phases = updatePhaseProgress(phases, "digest.detect-dead-time", 100);
      phases = updatePhaseProgress(phases, "digest.select-candidates", 100);

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert
      // transcription = 100% → 40% of overall
      // digest = 41% → 41 * 0.6 = 24.6% of overall
      // total = 40 + 24.6 = 64.6% → floor = 64%
      expect(result).toBe(64);
    });

    it("ShouldCalculate49PercentWhenDigestExtractFramesIs50Percent", () => {
      // Arrange - From the testing guide example
      let phases = createTranscriptDigestPhases();

      // Complete transcription
      phases = updatePhaseProgress(phases, "transcription.download", 100);
      phases = updatePhaseProgress(phases, "transcription.transcription", 100);
      phases = updatePhaseProgress(phases, "transcription.write-transcript", 100);
      phases = updatePhaseProgress(
        phases,
        "transcription.write-paragraphed",
        100
      );

      // digest.text = 100% (weight 0.03)
      // digest.analyze = 100% (weight 0.05)
      // digest.extract-frames = 50% (weight 0.17)
      phases = updatePhaseProgress(phases, "digest.text", 100);
      phases = updatePhaseProgress(phases, "digest.analyze", 100);
      phases = updatePhaseProgress(phases, "digest.extract-frames", 50);

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert
      // transcription = 100% → 40%
      // digest = (100*0.03) + (100*0.05) + (50*0.17) = 3 + 5 + 8.5 = 16.5%
      // digest contribution = 16.5 * 0.6 = 9.9%
      // total = 40 + 9.9 = 49.9% → floor = 49%
      expect(result).toBe(49);
    });
  });

  describe("Behavior: Edge Cases", () => {
    it("ShouldHandleEmptyPhasesArray", () => {
      // Arrange
      const phases: WorkflowPhase[] = [];

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert
      expect(result).toBe(0);
    });

    it("ShouldHandleSinglePhase", () => {
      // Arrange
      const phases: WorkflowPhase[] = [
        createMockWorkflowPhase({
          phaseKey: "single",
          weight: 1.0,
          progress: 75,
          parentPhaseKey: null,
        }),
      ];

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert
      expect(result).toBe(75);
    });

    it("ShouldIgnoreOrphanedChildPhases", () => {
      // Arrange - Child phase with non-existent parent
      const phases: WorkflowPhase[] = [
        createMockWorkflowPhase({
          phaseKey: "real-parent",
          weight: 1.0,
          progress: 50,
          parentPhaseKey: null,
        }),
        createMockWorkflowPhase({
          phaseKey: "orphan-child",
          weight: 0.5,
          progress: 100,
          parentPhaseKey: "non-existent-parent",
          depth: 1,
        }),
      ];

      // Act
      const result = calculateHierarchicalProgress(phases);

      // Assert - Orphan is not counted since parent doesn't exist as top-level
      expect(result).toBe(50);
    });
  });
});

// ============================================================================
// Phase Weight Validation Tests
// ============================================================================

describe("Workflow - Phase Weight Validation", () => {
  it("ShouldHaveTopLevelWeightsSumTo1", () => {
    // Arrange
    const phases = createTranscriptDigestPhases();
    const topLevelPhases = phases.filter((p) => !p.parentPhaseKey);

    // Act
    const totalWeight = topLevelPhases.reduce((sum, p) => sum + p.weight, 0);

    // Assert
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it("ShouldHaveTranscriptionChildWeightsSumTo1", () => {
    // Arrange
    const phases = createTranscriptDigestPhases();
    const transcriptionChildren = phases.filter(
      (p) => p.parentPhaseKey === "transcription"
    );

    // Act
    const totalWeight = transcriptionChildren.reduce(
      (sum, p) => sum + p.weight,
      0
    );

    // Assert
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it("ShouldHaveDigestChildWeightsSumTo1", () => {
    // Arrange
    const phases = createTranscriptDigestPhases();
    const digestChildren = phases.filter((p) => p.parentPhaseKey === "digest");

    // Act
    const totalWeight = digestChildren.reduce((sum, p) => sum + p.weight, 0);

    // Assert
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it("ShouldHave14TotalPhases", () => {
    // Arrange
    const phases = createTranscriptDigestPhases();

    // Assert
    expect(phases).toHaveLength(14);
  });

  it("ShouldHave2TopLevelPhases", () => {
    // Arrange
    const phases = createTranscriptDigestPhases();
    const topLevelPhases = phases.filter((p) => !p.parentPhaseKey);

    // Assert
    expect(topLevelPhases).toHaveLength(2);
    expect(topLevelPhases.map((p) => p.phaseKey)).toEqual([
      "transcription",
      "digest",
    ]);
  });

  it("ShouldHave4TranscriptionChildPhases", () => {
    // Arrange
    const phases = createTranscriptDigestPhases();
    const transcriptionChildren = phases.filter(
      (p) => p.parentPhaseKey === "transcription"
    );

    // Assert
    expect(transcriptionChildren).toHaveLength(4);
  });

  it("ShouldHave8DigestChildPhases", () => {
    // Arrange
    const phases = createTranscriptDigestPhases();
    const digestChildren = phases.filter((p) => p.parentPhaseKey === "digest");

    // Assert
    expect(digestChildren).toHaveLength(8);
  });
});

// ============================================================================
// Mock Helper Validation Tests
// ============================================================================

describe("Workflow - Mock Helper Functions", () => {
  it("ShouldUpdatePhaseProgressCorrectly", () => {
    // Arrange
    let phases = createTranscriptDigestPhases();

    // Act
    phases = updatePhaseProgress(phases, "transcription.download", 75);

    // Assert
    const updated = phases.find((p) => p.phaseKey === "transcription.download");
    expect(updated?.progress).toBe(75);
    expect(updated?.status).toBe("in-progress");
  });

  it("ShouldSetStatusToSuccessWhenProgressIs100", () => {
    // Arrange
    let phases = createTranscriptDigestPhases();

    // Act
    phases = updatePhaseProgress(phases, "transcription.download", 100);

    // Assert
    const updated = phases.find((p) => p.phaseKey === "transcription.download");
    expect(updated?.progress).toBe(100);
    expect(updated?.status).toBe("success");
  });

  it("ShouldMatchExpectedProgressCalculation", () => {
    // Arrange
    let phases = createTranscriptDigestPhases();
    phases = updatePhaseProgress(phases, "transcription.download", 100);
    phases = updatePhaseProgress(phases, "transcription.transcription", 50);

    // Act
    const expected = calculateExpectedHierarchicalProgress(phases);

    // Assert - This validates our helper matches the expected logic
    expect(expected).toBe(24);
  });
});
