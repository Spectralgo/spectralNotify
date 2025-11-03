import type { Workflow } from "@spectralnotify/react-native";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from "react-native";

interface WorkflowViewerProps {
  workflow?: Workflow;
  isLoading: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError?: string | null;
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString();
}

function getStatusColor(status: string): string {
  switch (status) {
    case "success":
      return "text-green-600";
    case "in-progress":
      return "text-blue-600";
    case "failed":
      return "text-red-600";
    case "canceled":
      return "text-gray-600";
    default:
      return "text-gray-500";
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "success":
      return "✓";
    case "in-progress":
      return "▶";
    case "failed":
      return "✗";
    case "canceled":
      return "○";
    default:
      return "○";
  }
}

export function WorkflowViewer({
  workflow,
  isLoading,
  isConnected,
  isConnecting,
  connectionError,
}: WorkflowViewerProps) {
  if (isLoading) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text className="mt-2 text-muted-foreground">Loading workflow...</Text>
      </View>
    );
  }

  if (!workflow) {
    return (
      <View className="items-center justify-center rounded-lg border border-destructive bg-destructive/10 p-4">
        <Text className="text-destructive">Workflow not found</Text>
      </View>
    );
  }

  // Parse metadata
  let metadata: any = {};
  try {
    metadata = workflow.metadata ? JSON.parse(workflow.metadata) : {};
  } catch {
    // Ignore parse errors
  }

  const activePhase = workflow.phases.find((p) => p.status === "in-progress");

  return (
    <ScrollView className="flex-1">
      <View className="rounded-lg border border-border bg-card p-4">
        {/* Header with connection status */}
        <View className="mb-4 flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-semibold text-foreground text-lg">
              {workflow.id}
            </Text>
            {metadata.purpose?.title && (
              <Text className="mt-1 text-muted-foreground text-sm">
                {metadata.purpose.title}
              </Text>
            )}
            {metadata.origin?.module && (
              <Text className="mt-0.5 font-mono text-muted-foreground/60 text-xs">
                {metadata.origin.module}
              </Text>
            )}
          </View>
          <View className="ml-2">
            {isConnecting && (
              <View className="rounded-full bg-yellow-500/20 px-2 py-1">
                <Text className="font-medium text-xs text-yellow-600">
                  Connecting...
                </Text>
              </View>
            )}
            {isConnected && (
              <View className="flex-row items-center gap-1 rounded-full bg-green-500/20 px-2 py-1">
                <View className="h-2 w-2 rounded-full bg-green-500" />
                <Text className="font-medium text-green-600 text-xs">Live</Text>
              </View>
            )}
            {!(isConnected || isConnecting) && (
              <View className="rounded-full bg-red-500/20 px-2 py-1">
                <Text className="font-medium text-red-600 text-xs">
                  Disconnected
                </Text>
              </View>
            )}
            {connectionError && (
              <View className="mt-1 rounded-full bg-destructive/20 px-2 py-1">
                <Text className="font-medium text-destructive text-xs">
                  Error
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Overall Progress */}
        <View className="mb-4 border-border border-t pt-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-medium text-foreground text-sm">
              Overall Progress
            </Text>
            <Text
              className={`font-semibold text-sm ${getStatusColor(workflow.status)}`}
            >
              {Math.round(workflow.overallProgress)}%
            </Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-secondary">
            <View
              className={`h-full ${
                workflow.status === "success"
                  ? "bg-green-500"
                  : workflow.status === "failed"
                    ? "bg-red-500"
                    : "bg-blue-500"
              }`}
              style={{ width: `${workflow.overallProgress}%` }}
            />
          </View>
          {workflow.expectedPhaseCount !== undefined &&
            workflow.completedPhaseCount !== undefined && (
              <Text className="mt-1 text-muted-foreground text-xs">
                Phase {workflow.completedPhaseCount} of{" "}
                {workflow.expectedPhaseCount}
                {activePhase && `: ${activePhase.label}`}
              </Text>
            )}
        </View>

        {/* Phases */}
        <View className="mb-4 border-border border-t pt-4">
          <Text className="mb-3 font-medium text-foreground text-sm">
            Phases
          </Text>
          <View className="space-y-3">
            {workflow.phases.map((phase) => (
              <View
                key={phase.phaseKey}
                className={`rounded-lg border p-3 ${
                  phase.status === "in-progress"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-border bg-card"
                }`}
              >
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className={`font-semibold text-lg ${getStatusColor(phase.status)}`}
                    >
                      {getStatusIcon(phase.status)}
                    </Text>
                    <Text className="font-medium text-foreground text-sm">
                      {phase.label}
                    </Text>
                  </View>
                  <Text
                    className={`font-semibold text-sm ${getStatusColor(phase.status)}`}
                  >
                    {Math.round(phase.progress)}%
                  </Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <View
                    className={`h-full ${
                      phase.status === "success"
                        ? "bg-green-500"
                        : phase.status === "failed"
                          ? "bg-red-500"
                          : phase.status === "in-progress"
                            ? "bg-blue-500"
                            : "bg-gray-400"
                    }`}
                    style={{ width: `${phase.progress}%` }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Events Timeline */}
        <View className="border-border border-t pt-4">
          <Text className="mb-3 font-medium text-foreground text-sm">
            Events
          </Text>
          <ScrollView className="max-h-64">
            <View className="space-y-2">
              {workflow.events.length === 0 ? (
                <Text className="text-center text-muted-foreground text-xs">
                  No events yet
                </Text>
              ) : (
                workflow.events.map((event) => (
                  <View
                    key={event.id}
                    className="rounded border border-border bg-secondary/30 p-2"
                  >
                    <View className="mb-1 flex-row items-center justify-between">
                      <Text className="text-muted-foreground text-xs">
                        {formatTime(event.timestamp.toISOString())}
                      </Text>
                      {event.phaseKey && (
                        <Text className="font-mono text-muted-foreground/60 text-xs">
                          {event.phaseKey}
                        </Text>
                      )}
                    </View>
                    <Text className="text-foreground text-xs">
                      {event.message}
                    </Text>
                    {event.progress !== undefined && (
                      <Text className="mt-0.5 text-muted-foreground text-xs">
                        Progress: {event.progress}%
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}
