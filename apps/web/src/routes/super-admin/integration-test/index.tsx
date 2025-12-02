import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { WorkflowWebSocketMessage } from "@spectralNotify/api/types/workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { client } from "@/utils/orpc";
import {
  closeWebSocket,
  createWorkflowWebSocket,
} from "@/utils/websocket-workflow";

export const Route = createFileRoute("/super-admin/integration-test/")({
  component: IntegrationTestPage,
});

type Speed = "fast" | "normal" | "slow";
type WsStatus = "disconnected" | "connecting" | "connected";
type PhaseStatus = "pending" | "in-progress" | "success" | "failed" | "canceled";

interface PhaseState {
  key: string;
  label: string;
  weight: number;
  status: PhaseStatus;
  progress: number;
}

interface EventLogEntry {
  id: string;
  timestamp: string;
  type: string;
  phase?: string;
  progress?: number;
  message: string;
}

const DEMO_PHASES: PhaseState[] = [
  { key: "download", label: "Download", weight: 0.25, status: "pending", progress: 0 },
  { key: "transcription", label: "Transcription", weight: 0.25, status: "pending", progress: 0 },
  { key: "write-transcript", label: "Write Transcript", weight: 0.25, status: "pending", progress: 0 },
  { key: "write-paragraphed", label: "Write Paragraphed", weight: 0.25, status: "pending", progress: 0 },
];

const SPEED_DELAYS: Record<Speed, number> = {
  fast: 200,
  normal: 1500,
  slow: 3000,
};

const PROGRESS_STEPS = [0, 8, 16, 32, 64, 77, 85, 93, 100];

/**
 * Formats a UUID workflow ID to spectralNotify format (WF-XXXX)
 * Takes the first 8 characters (no hyphens) and converts to uppercase
 */
function formatSpectralNotifyWorkflowId(uuid: string): string {
  const shortId = uuid.replace(/-/g, "").substring(0, 8).toUpperCase();
  return `WF-${shortId}`;
}

function generateWorkflowIds(): { uuid: string; workflowId: string } {
  const uuid = crypto.randomUUID();
  return {
    uuid,
    workflowId: formatSpectralNotifyWorkflowId(uuid),
  };
}

function IntegrationTestPage() {
  const [workflowIds, setWorkflowIds] = useState(generateWorkflowIds);
  const workflowId = workflowIds.workflowId;
  const workflowUuid = workflowIds.uuid;
  const [speed, setSpeed] = useState<Speed>("normal");
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [phases, setPhases] = useState<PhaseState[]>(DEMO_PHASES);
  const [overallProgress, setOverallProgress] = useState(0);
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [manualProgress, setManualProgress] = useState<Record<string, number>>({});
  const [workflowCreated, setWorkflowCreated] = useState(false);
  const [enableWebSocket, setEnableWebSocket] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pauseRef = useRef(isPaused);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Keep pauseRef in sync
  useEffect(() => {
    pauseRef.current = isPaused;
  }, [isPaused]);

  // Auto-scroll events
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const addEvent = useCallback((entry: Omit<EventLogEntry, "id" | "timestamp">) => {
    setEvents((prev) => [
      ...prev,
      {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      closeWebSocket(wsRef.current);
    }

    setWsStatus("connecting");
    addEvent({ type: "system", message: `Connecting to workflow ${workflowId}...` });

    const ws = createWorkflowWebSocket(workflowId, {
      onOpen: () => {
        setWsStatus("connected");
        addEvent({ type: "system", message: "WebSocket connected" });
      },
      onClose: () => {
        setWsStatus("disconnected");
        addEvent({ type: "system", message: "WebSocket disconnected" });
      },
      onError: () => {
        addEvent({ type: "error", message: "WebSocket connection error" });
      },
      onMessage: (message: WorkflowWebSocketMessage) => {
        if (message.type === "ping" || message.type === "pong") {
          return;
        }

        if (message.type === "error") {
          addEvent({ type: "error", message: message.message });
          return;
        }

        // Update state from WebSocket events
        if ("phases" in message && message.phases) {
          setPhases(message.phases.map((p) => ({
            key: p.key,
            label: p.label,
            weight: p.weight,
            status: p.status,
            progress: p.progress,
          })));
        }

        if ("workflow" in message && message.workflow) {
          setOverallProgress(message.workflow.overallProgress);
        }

        // Log the event
        addEvent({
          type: message.type,
          phase: "phase" in message ? message.phase : undefined,
          progress: "progress" in message ? message.progress : undefined,
          message: formatEventMessage(message),
        });
      },
    });

    wsRef.current = ws;
  }, [workflowId, addEvent]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      closeWebSocket(wsRef.current);
      wsRef.current = null;
    }
    setWsStatus("disconnected");
  }, []);

  const delay = useCallback(async (ms: number) => {
    return new Promise<void>((resolve, reject) => {
      const checkPause = () => {
        if (abortRef.current?.signal.aborted) {
          reject(new Error("Aborted"));
          return;
        }
        if (pauseRef.current) {
          setTimeout(checkPause, 100);
        } else {
          setTimeout(resolve, ms);
        }
      };
      checkPause();
    });
  }, []);

  const createWorkflow = useCallback(async () => {
    addEvent({ type: "api", message: `Creating workflow ${workflowId}...` });

    const phasesInput = DEMO_PHASES.map((p) => ({
      key: p.key,
      label: p.label,
      weight: p.weight,
      status: p.status,
      progress: p.progress,
    }));

    const metadata = {
      purpose: {
        title: "Integration Test",
        description: "Demo workflow for testing SpectralNotify connection",
      },
      author: {
        type: "system" as const,
        id: "integration-test",
        name: "Integration Test Page",
      },
      origin: {
        repo: "spectralNotify" as const,
        app: "web" as const,
        module: "IntegrationTest",
      },
    };

    const result = await client.workflows.create({
      id: workflowId,
      status: "in-progress",
      phases: phasesInput,
      metadata,
    });

    if (result.success) {
      addEvent({ type: "api", message: `Workflow created: ${result.workflowId}` });
      setWorkflowCreated(true);
    }

    return result;
  }, [workflowId, addEvent]);

  const runSimulation = useCallback(async () => {
    abortRef.current = new AbortController();
    const delayMs = SPEED_DELAYS[speed];

    for (const phase of DEMO_PHASES) {
      if (abortRef.current.signal.aborted) break;

      // Update phase progress
      for (const progress of PROGRESS_STEPS) {
        if (abortRef.current.signal.aborted) break;

        await client.workflows.updatePhaseProgress({
          workflowId,
          phase: phase.key,
          progress,
        });

        await delay(delayMs);
      }

      if (abortRef.current.signal.aborted) break;

      // Complete phase
      await client.workflows.completePhase({
        workflowId,
        phase: phase.key,
      });

      await delay(delayMs);
    }

    if (!abortRef.current.signal.aborted) {
      // Complete workflow
      await client.workflows.complete({ workflowId });
      addEvent({ type: "api", message: "Workflow completed" });
    }
  }, [workflowId, speed, delay, addEvent]);

  const handleStartDemo = useCallback(async () => {
    setIsRunning(true);
    setIsPaused(false);

    // Reset phases
    setPhases(DEMO_PHASES);
    setOverallProgress(0);

    // Connect WebSocket first (if enabled)
    if (enableWebSocket) {
      connectWebSocket();
      // Wait a bit for WS to connect
      await new Promise((resolve) => setTimeout(resolve, 500));
    } else {
      addEvent({ type: "system", message: "WebSocket disabled - running API-only simulation" });
    }

    // Create workflow
    await createWorkflow();

    // Run simulation
    await runSimulation();

    setIsRunning(false);
  }, [connectWebSocket, createWorkflow, runSimulation, enableWebSocket, addEvent]);

  const handlePauseResume = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    // Abort any running simulation
    abortRef.current?.abort();

    // Disconnect WebSocket
    disconnectWebSocket();

    // Reset state
    setIsRunning(false);
    setIsPaused(false);
    setWorkflowCreated(false);
    setPhases(DEMO_PHASES);
    setOverallProgress(0);
    setEvents([]);
    setManualProgress({});

    // Generate new workflow IDs
    setWorkflowIds(generateWorkflowIds());
  }, [disconnectWebSocket]);

  const handleCopyWorkflowId = useCallback(() => {
    navigator.clipboard.writeText(workflowId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [workflowId]);

  const handleCopyWsUrl = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const serverUrl = (import.meta.env.VITE_SERVER_URL as string).replace(/^https?:\/\//, "");
    const wsUrl = `${protocol}//${serverUrl}/ws/workflow/${encodeURIComponent(workflowId)}`;
    navigator.clipboard.writeText(wsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [workflowId]);

  // Manual phase controls
  const handleManualUpdateProgress = useCallback(async (phaseKey: string) => {
    const progress = manualProgress[phaseKey] ?? 0;
    addEvent({ type: "manual", message: `Updating ${phaseKey} progress to ${progress}%` });
    await client.workflows.updatePhaseProgress({
      workflowId,
      phase: phaseKey,
      progress,
    });
  }, [workflowId, manualProgress, addEvent]);

  const handleManualCompletePhase = useCallback(async (phaseKey: string) => {
    addEvent({ type: "manual", message: `Completing phase: ${phaseKey}` });
    await client.workflows.completePhase({
      workflowId,
      phase: phaseKey,
    });
  }, [workflowId, addEvent]);

  const handleManualFailPhase = useCallback(async (phaseKey: string) => {
    addEvent({ type: "manual", message: `Failing workflow at phase: ${phaseKey}` });
    await client.workflows.fail({
      workflowId,
      error: `Manual failure at phase: ${phaseKey}`,
    });
  }, [workflowId, addEvent]);

  const handleManualConnect = useCallback(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  const handleManualCreateWorkflow = useCallback(async () => {
    await createWorkflow();
  }, [createWorkflow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (wsRef.current) {
        closeWebSocket(wsRef.current);
      }
    };
  }, []);

  const serverUrl = import.meta.env.VITE_SERVER_URL as string;
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${wsProtocol}//${serverUrl.replace(/^https?:\/\//, "")}/ws/workflow/${encodeURIComponent(workflowId)}`;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-bold text-3xl text-foreground">Integration Test</h1>
        <p className="mt-1 text-muted-foreground">
          Test connection between SpectralNotify and SpectralChat
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Connection Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Connection Info
                <Badge variant={wsStatus === "connected" ? "default" : "secondary"}>
                  {wsStatus === "connected" ? (
                    <Wifi className="mr-1 h-3 w-3" />
                  ) : (
                    <WifiOff className="mr-1 h-3 w-3" />
                  )}
                  {wsStatus}
                </Badge>
              </CardTitle>
              <CardDescription>
                Share these details with SpectralChat to observe workflow updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workflowUuid">Source UUID</Label>
                <div className="flex gap-2">
                  <Input
                    id="workflowUuid"
                    value={workflowUuid}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(workflowUuid);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setWorkflowIds(generateWorkflowIds())}
                    disabled={isRunning || workflowCreated}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workflowId">Workflow ID (formatted)</Label>
                <div className="flex gap-2">
                  <Input
                    id="workflowId"
                    value={workflowId}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyWorkflowId}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>WebSocket URL</Label>
                <div className="flex gap-2">
                  <Input value={wsUrl} readOnly className="font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyWsUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleManualConnect}
                  disabled={wsStatus === "connected"}
                >
                  Connect WebSocket
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleManualCreateWorkflow}
                  disabled={workflowCreated || wsStatus !== "connected"}
                >
                  Create Workflow
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Control Panel</CardTitle>
              <CardDescription>
                Run an automated demo or control the simulation manually
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Speed</Label>
                <div className="flex gap-2">
                  {(["fast", "normal", "slow"] as Speed[]).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant={speed === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSpeed(s)}
                      disabled={isRunning}
                    >
                      {s === "fast" && "Fast (2s)"}
                      {s === "normal" && "Normal (15s)"}
                      {s === "slow" && "Slow (30s)"}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableWebSocket"
                  checked={enableWebSocket}
                  onChange={(e) => setEnableWebSocket(e.target.checked)}
                  disabled={isRunning}
                  className="h-4 w-4"
                />
                <Label htmlFor="enableWebSocket" className="text-sm font-normal cursor-pointer">
                  Connect WebSocket (disable to allow external app testing)
                </Label>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleStartDemo}
                  disabled={isRunning}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Demo
                </Button>
                {isRunning && (
                  <Button type="button" variant="outline" onClick={handlePauseResume}>
                    {isPaused ? (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                    )}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>
                Overall: {overallProgress}%
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={overallProgress} className="h-3" />
              <div className="space-y-3">
                {phases.map((phase) => (
                  <div key={phase.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{phase.label}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            phase.status === "success"
                              ? "default"
                              : phase.status === "in-progress"
                                ? "secondary"
                                : phase.status === "failed"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {phase.status}
                        </Badge>
                        <span className="text-muted-foreground text-sm">
                          {phase.progress}%
                        </span>
                      </div>
                    </div>
                    <Progress value={phase.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Manual Phase Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Phase Controls</CardTitle>
              <CardDescription>
                Manually update progress or complete individual phases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {phases.map((phase) => (
                <div key={phase.key} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{phase.label}</span>
                    <Badge variant="outline">{phase.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      value={manualProgress[phase.key] ?? phase.progress}
                      onChange={(e) =>
                        setManualProgress((prev) => ({
                          ...prev,
                          [phase.key]: Number(e.target.value),
                        }))
                      }
                      max={100}
                      min={0}
                      step={1}
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-secondary"
                      disabled={!workflowCreated}
                    />
                    <span className="w-12 text-right text-sm">
                      {manualProgress[phase.key] ?? phase.progress}%
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualUpdateProgress(phase.key)}
                      disabled={!workflowCreated}
                    >
                      Update
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualCompletePhase(phase.key)}
                      disabled={!workflowCreated || phase.status === "success"}
                    >
                      Complete
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleManualFailPhase(phase.key)}
                      disabled={!workflowCreated}
                    >
                      Fail
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Event Log */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Event Log</CardTitle>
                  <CardDescription>
                    Real-time events from WebSocket
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEvents([])}
                >
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] overflow-y-auto rounded-md border p-2">
                <div className="space-y-1 font-mono text-xs">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className={`rounded px-2 py-1 ${
                        event.type === "error"
                          ? "bg-destructive/10 text-destructive"
                          : event.type === "system"
                            ? "bg-muted text-muted-foreground"
                            : event.type === "manual"
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-green-500/10 text-green-600"
                      }`}
                    >
                      <span className="text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>{" "}
                      <span className="font-semibold">[{event.type}]</span>{" "}
                      {event.message}
                    </div>
                  ))}
                  <div ref={eventsEndRef} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatEventMessage(message: WorkflowWebSocketMessage): string {
  if (message.type === "phase-progress") {
    return `Phase "${message.phase}" progress: ${message.progress}% (overall: ${message.overallProgress}%)`;
  }
  if (message.type === "workflow-progress") {
    return `Workflow progress: ${message.overallProgress}%`;
  }
  if (message.type === "complete") {
    return "Workflow completed successfully";
  }
  if (message.type === "fail") {
    return `Workflow failed: ${message.error}`;
  }
  if (message.type === "cancel") {
    return "Workflow canceled";
  }
  return JSON.stringify(message);
}
