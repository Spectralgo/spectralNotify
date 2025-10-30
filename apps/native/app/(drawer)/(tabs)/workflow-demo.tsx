import { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Container } from "@/components/container";
import { WorkflowViewer } from "@/components/workflow-viewer";
import { useWorkflow } from "@/hooks/use-workflow";
import { runYouTubeTranscriptionDemo } from "@/services/workflow-simulator";

export default function WorkflowDemo() {
  const [workflowId, setWorkflowId] = useState<string>();
  const [isSimulating, setIsSimulating] = useState(false);
  const [startTime, setStartTime] = useState<number>();

  const { workflow, isLoading, isConnected, isConnecting, connectionError } =
    useWorkflow({
      workflowId,
      enableWebSocket: true,
    });

  const handleStartDemo = async () => {
    if (isSimulating) {
      Alert.alert(
        "Simulation Running",
        "A workflow simulation is already in progress"
      );
      return;
    }

    try {
      setIsSimulating(true);
      setStartTime(Date.now());

      console.log("[Demo] Starting YouTube transcription demo...");
      const newWorkflowId = await runYouTubeTranscriptionDemo();

      console.log("[Demo] Workflow created:", newWorkflowId);
      setWorkflowId(newWorkflowId);

      // Simulation will complete after 30 seconds
      setTimeout(() => {
        setIsSimulating(false);
        console.log("[Demo] Simulation complete");
      }, 31000); // 30s + 1s buffer
    } catch (error) {
      console.error("[Demo] Error starting demo:", error);
      setIsSimulating(false);

      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to start workflow demo"
      );
    }
  };

  const handleReset = () => {
    setWorkflowId(undefined);
    setIsSimulating(false);
    setStartTime(undefined);
  };

  const getElapsedTime = (): string => {
    if (!startTime) return "0.0s";
    const elapsed = (Date.now() - startTime) / 1000;
    return `${elapsed.toFixed(1)}s`;
  };

  const getStatus = (): string => {
    if (!workflowId) return "No workflow";
    if (isSimulating) return `Running... (${getElapsedTime()} / 30.0s)`;
    if (workflow?.status === "success") return "Completed successfully";
    if (workflow?.status === "failed") return "Failed";
    return "Ready";
  };

  return (
    <Container>
      <ScrollView className="flex-1 p-6">
        {/* Header */}
        <View className="mb-6 py-8">
          <Text className="mb-2 font-bold text-3xl text-foreground">
            Workflow Demo
          </Text>
          <Text className="text-lg text-muted-foreground">
            YouTube Video Transcription Pipeline
          </Text>
        </View>

        {/* Controls */}
        <View className="mb-6 space-y-4">
          <TouchableOpacity
            activeOpacity={0.7}
            className={`rounded-lg px-6 py-4 ${
              isSimulating || isLoading
                ? "bg-gray-400"
                : "bg-blue-600 active:bg-blue-700"
            }`}
            disabled={isSimulating || isLoading}
            onPress={handleStartDemo}
          >
            <Text className="text-center font-semibold text-lg text-white">
              {isSimulating
                ? "Simulation Running..."
                : workflowId
                  ? "Start New Demo"
                  : "Start Demo Workflow"}
            </Text>
          </TouchableOpacity>

          {workflowId && !isSimulating && (
            <TouchableOpacity
              activeOpacity={0.7}
              className="rounded-lg border border-border bg-secondary px-6 py-3 active:bg-secondary/80"
              onPress={handleReset}
            >
              <Text className="text-center font-medium text-foreground">
                Reset
              </Text>
            </TouchableOpacity>
          )}

          {/* Status Display */}
          <View className="rounded-lg border border-border bg-card p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-medium text-foreground">Status:</Text>
              <Text className="text-muted-foreground">{getStatus()}</Text>
            </View>
            {workflowId && (
              <View className="flex-row items-center justify-between border-border border-t pt-2">
                <Text className="font-medium text-foreground">Workflow ID:</Text>
                <Text className="font-mono text-muted-foreground text-sm">
                  {workflowId}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Workflow Viewer */}
        {workflowId && (
          <View className="mb-6">
            <WorkflowViewer
              connectionError={connectionError}
              isConnected={isConnected}
              isConnecting={isConnecting}
              isLoading={isLoading}
              workflow={workflow}
            />
          </View>
        )}

        {/* Info Card */}
        {!workflowId && (
          <View className="rounded-lg border border-border bg-card p-4">
            <Text className="mb-3 font-semibold text-foreground text-lg">
              About This Demo
            </Text>
            <Text className="mb-4 text-muted-foreground leading-6">
              This demo simulates a YouTube video transcription workflow with 4
              phases:
            </Text>
            <View className="space-y-2">
              <View className="flex-row gap-3">
                <Text className="font-mono text-muted-foreground">1.</Text>
                <View className="flex-1">
                  <Text className="font-medium text-foreground">Download</Text>
                  <Text className="text-muted-foreground text-sm">
                    12 seconds • 15 progress updates
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <Text className="font-mono text-muted-foreground">2.</Text>
                <View className="flex-1">
                  <Text className="font-medium text-foreground">
                    Transcription
                  </Text>
                  <Text className="text-muted-foreground text-sm">
                    15 seconds • 9 progress updates
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <Text className="font-mono text-muted-foreground">3.</Text>
                <View className="flex-1">
                  <Text className="font-medium text-foreground">
                    Write Transcript JSON
                  </Text>
                  <Text className="text-muted-foreground text-sm">
                    1.5 seconds • 3 progress updates
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <Text className="font-mono text-muted-foreground">4.</Text>
                <View className="flex-1">
                  <Text className="font-medium text-foreground">
                    Write Paragraphed Transcript
                  </Text>
                  <Text className="text-muted-foreground text-sm">
                    1.5 seconds • 3 progress updates
                  </Text>
                </View>
              </View>
            </View>
            <Text className="mt-4 text-muted-foreground text-sm">
              Total duration: 30 seconds with real-time WebSocket updates
            </Text>
          </View>
        )}
      </ScrollView>
    </Container>
  );
}
