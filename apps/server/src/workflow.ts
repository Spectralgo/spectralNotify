import { DurableObject } from "cloudflare:workers";
import { asc, desc, eq } from "drizzle-orm";
import {
  type DrizzleSqliteDODatabase,
  drizzle,
} from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import migrations from "./workflow-migrations/migrations.js";
import {
  type NewWorkflowHistory,
  type NewWorkflowMetadata,
  type NewWorkflowPhase,
  type WorkflowHistory,
  type WorkflowMetadata,
  type WorkflowPhase,
  workflowHistory,
  workflowMetadata,
  workflowPhases,
} from "./workflow-schema";

export class Workflow extends DurableObject {
  private db: DrizzleSqliteDODatabase<{
    workflowMetadata: typeof workflowMetadata;
    workflowPhases: typeof workflowPhases;
    workflowHistory: typeof workflowHistory;
  }>;
  private workflowId = "";
  // Track WebSocket sessions for broadcasting updates
  private sessions: Map<WebSocket, { id: string; subscribedAt: string }> =
    new Map();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Initialize Drizzle with Durable Object storage
    this.db = drizzle(ctx.storage, {
      schema: { workflowMetadata, workflowPhases, workflowHistory },
      logger: false,
    });

    // Run migrations before accepting queries
    ctx.blockConcurrencyWhile(async () => {
      await this._migrate();

      // Restore hibernating WebSocket sessions
      this.ctx.getWebSockets().forEach((ws) => {
        const attachment = ws.deserializeAttachment();
        if (attachment) {
          this.sessions.set(ws, { ...attachment });
        }
      });
    });

    // Set auto-response for ping/pong without waking hibernated WebSockets
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong")
    );
  }

  /**
   * Run Drizzle migrations
   */
  private async _migrate(): Promise<void> {
    await migrate(this.db, migrations);
  }

  /**
   * Calculate overall progress for hierarchical phases
   * For parent phases: progress = weighted sum of children
   * For leaf phases (no children): use direct progress
   */
  private calculateHierarchicalProgress(phases: WorkflowPhase[]): number {
    // Get top-level phases (no parent)
    const topLevelPhases = phases.filter((p) => !p.parentPhaseKey);

    const calculatePhaseProgress = (phase: WorkflowPhase): number => {
      // Find children of this phase
      const children = phases.filter((p) => p.parentPhaseKey === phase.phaseKey);

      if (children.length === 0) {
        // Leaf phase: use direct progress
        return phase.progress;
      }

      // Parent phase: compute weighted sum of children's progress
      return children.reduce((sum, child) => {
        const childProgress = calculatePhaseProgress(child);
        return sum + childProgress * child.weight;
      }, 0);
    };

    // Overall progress = weighted sum of top-level phases
    const overallProgress = topLevelPhases.reduce((sum, phase) => {
      const phaseProgress = calculatePhaseProgress(phase);
      return sum + phaseProgress * phase.weight;
    }, 0);

    return Math.floor(overallProgress);
  }

  /**
   * Initialize workflow with metadata and phases
   * Supports hierarchical phases via parentPhaseKey
   */
  async initialize(input: {
    workflowId: string;
    status: string;
    phases: Array<{
      key: string;
      label: string;
      weight: number;
      status: string;
      progress: number;
      parentPhaseKey?: string | null;
      depth?: number;
    }>;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    console.log(
      `[WorkflowDO] 📥 RECEIVE initialize | workflowId=${input.workflowId} | status=${input.status} | phases=${input.phases.map((p) => p.key).join(",")} | timestamp=${timestamp}`
    );

    const existing = await this.db
      .select()
      .from(workflowMetadata)
      .where(eq(workflowMetadata.id, 1))
      .get();

    if (existing) {
      this.workflowId = existing.workflowId;
      console.log(
        `[WorkflowDO] ℹ️ Workflow already exists | workflowId=${existing.workflowId}`
      );
    } else {
      const now = new Date().toISOString();

      // Determine active phase (first phase in order)
      const activePhaseKey = input.phases[0]?.key || null;

      const newWorkflow: NewWorkflowMetadata = {
        id: 1,
        workflowId: input.workflowId,
        status: input.status,
        overallProgress: 0,
        expectedPhaseCount: input.phases.length,
        completedPhaseCount: 0,
        activePhaseKey,
        createdAt: now,
        updatedAt: now,
        metadata: JSON.stringify(input.metadata),
      };

      await this.db.insert(workflowMetadata).values(newWorkflow);
      this.workflowId = input.workflowId;

      // Insert phases relationally (supports hierarchical phases)
      const phaseRecords: NewWorkflowPhase[] = input.phases.map(
        (phase, index) => ({
          workflowId: input.workflowId,
          phaseKey: phase.key,
          label: phase.label,
          weight: phase.weight,
          status: phase.status,
          progress: phase.progress,
          order: index,
          parentPhaseKey: phase.parentPhaseKey ?? undefined,
          depth: phase.depth ?? 0,
          startedAt: phase.status === "in-progress" ? now : undefined,
          updatedAt: phase.status === "in-progress" ? now : undefined,
        })
      );

      await this.db.insert(workflowPhases).values(phaseRecords);

      // Add initial event
      const initialEvent: NewWorkflowHistory = {
        workflowId: input.workflowId,
        eventType: "log",
        message: "Workflow created",
        timestamp: now,
        metadata: JSON.stringify(input.metadata),
      };

      await this.db.insert(workflowHistory).values(initialEvent);

      const duration = Date.now() - startTime;
      console.log(
        `[WorkflowDO] ✅ initialize Complete | workflowId=${input.workflowId} | phasesInserted=${input.phases.length} | duration=${duration}ms`
      );
    }
  }

  /**
   * Get workflow metadata
   */
  async getWorkflow(): Promise<WorkflowMetadata> {
    const result = await this.db
      .select()
      .from(workflowMetadata)
      .where(eq(workflowMetadata.id, 1))
      .get();

    if (!result) {
      throw new Error("Workflow not initialized");
    }

    return result;
  }

  /**
   * Get all phases ordered by execution order
   */
  async getPhases(): Promise<WorkflowPhase[]> {
    const phases = await this.db
      .select()
      .from(workflowPhases)
      .orderBy(asc(workflowPhases.order))
      .all();

    return phases;
  }

  /**
   * Update phase progress
   * Returns enriched data including updated metadata and recent history
   */
  async updatePhaseProgress(
    phaseKey: string,
    progress: number,
    metadata?: Record<string, unknown>
  ): Promise<{
    workflow: WorkflowMetadata;
    latestHistory: WorkflowHistory[];
  }> {
    const startTime = Date.now();
    const now = new Date().toISOString();

    console.log(
      `[WorkflowDO] 📥 RECEIVE updatePhaseProgress | workflowId=${this.workflowId} | phase=${phaseKey} | progress=${progress}% | timestamp=${now}`
    );

    // Get current phase from relational table
    const currentPhase = await this.db
      .select()
      .from(workflowPhases)
      .where(eq(workflowPhases.phaseKey, phaseKey))
      .get();

    if (!currentPhase) {
      throw new Error(`Phase ${phaseKey} not found`);
    }

    const newStatus = progress === 100 ? "success" : "in-progress";
    const isNowCompleted = newStatus === "success";

    // Use transaction to ensure atomicity
    await this.db.transaction(async (tx) => {
      // Update phase record
      await tx
        .update(workflowPhases)
        .set({
          progress,
          status: newStatus,
          startedAt: currentPhase.startedAt || now,
          updatedAt: now,
          completedAt: isNowCompleted ? now : undefined,
        })
        .where(eq(workflowPhases.phaseKey, phaseKey));

      // Recompute overall progress from all phases (supports hierarchical phases)
      const allPhases = await tx
        .select()
        .from(workflowPhases)
        .orderBy(asc(workflowPhases.order))
        .all();

      // Calculate progress recursively for hierarchical phases
      // Top-level phases contribute directly, parent phases compute from children
      const overallProgress = this.calculateHierarchicalProgress(allPhases);

      // Count completed phases
      const completedPhaseCount = allPhases.filter(
        (p) => p.status === "success"
      ).length;

      // Find next active phase (first non-success by order)
      const activePhase = allPhases.find((p) => p.status !== "success");
      const activePhaseKey = activePhase?.phaseKey || null;

      // Update workflow metadata
      await tx
        .update(workflowMetadata)
        .set({
          overallProgress,
          completedPhaseCount,
          activePhaseKey,
          updatedAt: now,
        })
        .where(eq(workflowMetadata.id, 1));

      // Add phase-progress event
      const historyEntry: NewWorkflowHistory = {
        workflowId: this.workflowId,
        eventType: "phase-progress",
        phaseKey,
        message: `${currentPhase.label} progress: ${progress}%`,
        progress,
        timestamp: now,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      };

      await tx.insert(workflowHistory).values(historyEntry);
    });

    const dbDuration = Date.now() - startTime;

    // Fetch updated state for response
    const [updatedWorkflow, allPhases, latestHistory] = await Promise.all([
      this.getWorkflow(),
      this.getPhases(),
      this.getHistory(10),
    ]);

    console.log(
      `[WorkflowDO] 💾 Database Write Complete | workflowId=${this.workflowId} | phase=${phaseKey} | progress=${progress}% | overallProgress=${updatedWorkflow.overallProgress}% | completedCount=${updatedWorkflow.completedPhaseCount}/${updatedWorkflow.expectedPhaseCount} | dbDuration=${dbDuration}ms`
    );

    // Broadcast update to all connected WebSocket clients
    const broadcastStart = Date.now();
    await this.broadcastUpdate({
      type: "phase-progress",
      workflowId: this.workflowId,
      phase: phaseKey,
      progress,
      overallProgress: updatedWorkflow.overallProgress,
      workflow: updatedWorkflow,
      phases: allPhases,
      timestamp: now,
    });

    const broadcastDuration = Date.now() - broadcastStart;
    const totalDuration = Date.now() - startTime;
    console.log(
      `[WorkflowDO] ✅ updatePhaseProgress Complete | workflowId=${this.workflowId} | phase=${phaseKey} | progress=${progress}% | broadcastDuration=${broadcastDuration}ms | totalDuration=${totalDuration}ms`
    );

    return {
      workflow: updatedWorkflow,
      latestHistory,
    };
  }

  /**
   * Mark phase as completed (convenience for progress=100)
   */
  async completePhase(
    phaseKey: string,
    metadata?: Record<string, unknown>
  ): Promise<{
    workflow: WorkflowMetadata;
    latestHistory: WorkflowHistory[];
  }> {
    return await this.updatePhaseProgress(phaseKey, 100, metadata);
  }

  /**
   * Mark workflow as completed
   * Returns enriched data including updated metadata and recent history
   */
  async completeWorkflow(metadata?: Record<string, unknown>): Promise<{
    workflow: WorkflowMetadata;
    latestHistory: WorkflowHistory[];
  }> {
    const now = new Date().toISOString();

    // Use transaction to ensure atomicity
    await this.db.transaction(async (tx) => {
      // Update workflow status
      await tx
        .update(workflowMetadata)
        .set({
          status: "success",
          overallProgress: 100,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(workflowMetadata.id, 1));

      // Add success event
      const historyEntry: NewWorkflowHistory = {
        workflowId: this.workflowId,
        eventType: "success",
        message: "Workflow completed successfully",
        progress: 100,
        timestamp: now,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      };

      await tx.insert(workflowHistory).values(historyEntry);
    });

    // Fetch updated metadata, phases, and recent history
    const [updatedWorkflow, allPhases, latestHistory] = await Promise.all([
      this.getWorkflow(),
      this.getPhases(),
      this.getHistory(10),
    ]);

    // Broadcast update to all connected WebSocket clients
    await this.broadcastUpdate({
      type: "complete",
      workflowId: this.workflowId,
      workflow: updatedWorkflow,
      phases: allPhases,
      timestamp: now,
    });

    return {
      workflow: updatedWorkflow,
      latestHistory,
    };
  }

  /**
   * Mark workflow as failed
   * Returns enriched data including updated metadata and recent history
   */
  async failWorkflow(
    error: string,
    metadata?: Record<string, unknown>
  ): Promise<{
    workflow: WorkflowMetadata;
    latestHistory: WorkflowHistory[];
  }> {
    const now = new Date().toISOString();

    // Use transaction to ensure atomicity
    await this.db.transaction(async (tx) => {
      // Update workflow status
      await tx
        .update(workflowMetadata)
        .set({
          status: "failed",
          failedAt: now,
          updatedAt: now,
        })
        .where(eq(workflowMetadata.id, 1));

      // Add error event
      const historyEntry: NewWorkflowHistory = {
        workflowId: this.workflowId,
        eventType: "error",
        message: error,
        timestamp: now,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      };

      await tx.insert(workflowHistory).values(historyEntry);
    });

    // Fetch updated metadata, phases, and recent history
    const [updatedWorkflow, allPhases, latestHistory] = await Promise.all([
      this.getWorkflow(),
      this.getPhases(),
      this.getHistory(10),
    ]);

    // Broadcast update to all connected WebSocket clients
    await this.broadcastUpdate({
      type: "fail",
      workflowId: this.workflowId,
      error,
      workflow: updatedWorkflow,
      phases: allPhases,
      timestamp: now,
    });

    return {
      workflow: updatedWorkflow,
      latestHistory,
    };
  }

  /**
   * Mark workflow as canceled
   * Returns enriched data including updated metadata and recent history
   */
  async cancelWorkflow(metadata?: Record<string, unknown>): Promise<{
    workflow: WorkflowMetadata;
    latestHistory: WorkflowHistory[];
  }> {
    const now = new Date().toISOString();

    // Use transaction to ensure atomicity
    await this.db.transaction(async (tx) => {
      // Update workflow status
      await tx
        .update(workflowMetadata)
        .set({
          status: "canceled",
          canceledAt: now,
          updatedAt: now,
        })
        .where(eq(workflowMetadata.id, 1));

      // Add cancel event
      const historyEntry: NewWorkflowHistory = {
        workflowId: this.workflowId,
        eventType: "cancel",
        message: "Workflow canceled",
        timestamp: now,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      };

      await tx.insert(workflowHistory).values(historyEntry);
    });

    // Fetch updated metadata, phases, and recent history
    const [updatedWorkflow, allPhases, latestHistory] = await Promise.all([
      this.getWorkflow(),
      this.getPhases(),
      this.getHistory(10),
    ]);

    // Broadcast update to all connected WebSocket clients
    await this.broadcastUpdate({
      type: "cancel",
      workflowId: this.workflowId,
      workflow: updatedWorkflow,
      phases: allPhases,
      timestamp: now,
    });

    return {
      workflow: updatedWorkflow,
      latestHistory,
    };
  }

  /**
   * Get event history (limited to most recent)
   */
  async getHistory(limit = 50): Promise<WorkflowHistory[]> {
    const results = await this.db
      .select()
      .from(workflowHistory)
      .orderBy(desc(workflowHistory.id))
      .limit(limit)
      .all();

    return results;
  }

  /**
   * Delete all workflow data and storage
   * This completely removes the Durable Object by clearing all storage
   */
  async deleteWorkflow(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }

  /**
   * Broadcast workflow update to all connected WebSocket clients
   */
  private async broadcastUpdate(event: {
    type:
      | "phase-progress"
      | "workflow-progress"
      | "complete"
      | "fail"
      | "cancel";
    workflowId: string;
    workflow: WorkflowMetadata;
    phases?: WorkflowPhase[];
    timestamp: string;
    phase?: string;
    progress?: number;
    overallProgress?: number;
    error?: string;
  }): Promise<void> {
    const broadcastStart = Date.now();
    const sessionCount = this.sessions.size;

    console.log(
      `[WorkflowDO] 📡 BROADCAST Start | workflowId=${this.workflowId} | type=${event.type} | phase=${event.phase || "N/A"} | sessions=${sessionCount} | timestamp=${event.timestamp}`
    );

    const message = JSON.stringify(event);
    let successCount = 0;
    let failCount = 0;

    this.sessions.forEach((_sessionData, ws) => {
      try {
        ws.send(message);
        successCount++;
      } catch (error) {
        console.error("Failed to send WebSocket message:", error);
        failCount++;
        // Remove failed sessions
        this.sessions.delete(ws);
      }
    });

    const broadcastDuration = Date.now() - broadcastStart;
    console.log(
      `[WorkflowDO] 📡 BROADCAST Complete | workflowId=${this.workflowId} | type=${event.type} | success=${successCount} | failed=${failCount} | duration=${broadcastDuration}ms`
    );
  }

  /**
   * Handle WebSocket upgrade request
   */
  async fetch(request: Request): Promise<Response> {
    // Check if this is a WebSocket upgrade request
    if (request.headers.get("Upgrade") === "websocket") {
      // Create WebSocket pair
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // Validate server WebSocket exists
      if (!server) {
        return new Response("Failed to create WebSocket", { status: 500 });
      }

      // Accept the WebSocket connection with hibernation support
      this.ctx.acceptWebSocket(server);

      // Generate a unique session ID
      const sessionId = crypto.randomUUID();
      const subscribedAt = new Date().toISOString();

      // Attach session metadata and serialize for hibernation
      server.serializeAttachment({ id: sessionId, subscribedAt });

      // Add to active sessions
      this.sessions.set(server, { id: sessionId, subscribedAt });

      // Return the client WebSocket
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  /**
   * Handle incoming WebSocket messages
   */
  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    const session = this.sessions.get(ws);
    if (!session) {
      ws.close(1008, "Session not found");
      return;
    }

    try {
      const data =
        typeof message === "string"
          ? message
          : new TextDecoder().decode(message);
      const parsed = JSON.parse(data);

      // Handle ping/pong for keep-alive
      if (parsed.type === "ping") {
        ws.send(
          JSON.stringify({ type: "pong", timestamp: new Date().toISOString() })
        );
        return;
      }

      // Future: Handle client-initiated requests through WebSocket
    } catch (error) {
      console.error("WebSocket message error:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        })
      );
    }
  }

  /**
   * Handle WebSocket close
   */
  async webSocketClose(
    ws: WebSocket,
    code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    this.sessions.delete(ws);
    // WebSocket is already closing - no need to call ws.close()
  }
}
