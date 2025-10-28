import { DurableObject } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import {
  type DrizzleSqliteDODatabase,
  drizzle,
} from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import migrations from "./task-migrations/migrations.js";
import {
  type NewTaskHistory,
  type NewTaskMetadata,
  type TaskHistory,
  type TaskMetadata,
  taskHistory,
  taskMetadata,
} from "./task-schema";

export class Task extends DurableObject {
  private db: DrizzleSqliteDODatabase<{
    taskMetadata: typeof taskMetadata;
    taskHistory: typeof taskHistory;
  }>;
  private taskId = "";
  // Track WebSocket sessions for broadcasting updates
  private sessions: Map<WebSocket, { id: string; subscribedAt: string }> =
    new Map();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Initialize Drizzle with Durable Object storage
    this.db = drizzle(ctx.storage, {
      schema: { taskMetadata, taskHistory },
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
   * Initialize task with metadata (called once per task instance)
   */
  async initialize(input: {
    taskId: string;
    status: string;
    progress?: number;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const existing = await this.db
      .select()
      .from(taskMetadata)
      .where(eq(taskMetadata.id, 1))
      .get();

    if (existing) {
      this.taskId = existing.taskId;
    } else {
      const now = new Date().toISOString();
      const newTask: NewTaskMetadata = {
        id: 1,
        taskId: input.taskId,
        status: input.status,
        progress: input.progress ?? 0,
        createdAt: now,
        updatedAt: now,
        metadata: JSON.stringify(input.metadata),
      };

      await this.db.insert(taskMetadata).values(newTask);
      this.taskId = input.taskId;

      // Add initial event
      const initialEvent: NewTaskHistory = {
        eventType: "log",
        message: "Task created",
        timestamp: now,
        metadata: JSON.stringify(input.metadata),
      };

      await this.db.insert(taskHistory).values(initialEvent);
    }
  }

  /**
   * Get task metadata
   */
  async getTask(): Promise<TaskMetadata> {
    const result = await this.db
      .select()
      .from(taskMetadata)
      .where(eq(taskMetadata.id, 1))
      .get();

    if (!result) {
      throw new Error("Task not initialized");
    }

    return result;
  }

  /**
   * Add an event to the task
   * Returns enriched data including updated metadata and recent history
   */
  async addEvent(event: {
    eventType: string;
    message: string;
    progress?: number;
    metadata?: Record<string, unknown>;
  }): Promise<{
    task: TaskMetadata;
    latestHistory: TaskHistory[];
  }> {
    const task = await this.getTask();
    const now = new Date().toISOString();

    // Use transaction to ensure atomicity
    await this.db.transaction(async (tx) => {
      // Add event to history
      const historyEntry: NewTaskHistory = {
        eventType: event.eventType,
        message: event.message,
        progress: event.progress,
        timestamp: now,
        metadata: event.metadata ? JSON.stringify(event.metadata) : undefined,
      };

      await tx.insert(taskHistory).values(historyEntry);

      // Update task metadata if progress provided
      if (event.progress !== undefined) {
        await tx
          .update(taskMetadata)
          .set({
            progress: event.progress,
            updatedAt: now,
          })
          .where(eq(taskMetadata.id, 1));
      }
    });

    // Fetch updated metadata and recent history
    const [updatedTask, latestHistory] = await Promise.all([
      this.getTask(),
      this.getHistory(10),
    ]);

    // Broadcast update to all connected WebSocket clients
    await this.broadcastUpdate({
      type: "event",
      taskId: this.taskId,
      event: {
        eventType: event.eventType,
        message: event.message,
        progress: event.progress,
        timestamp: now,
      },
      task: updatedTask,
      timestamp: now,
    });

    return {
      task: updatedTask,
      latestHistory,
    };
  }

  /**
   * Update task progress
   * Returns enriched data including updated metadata and recent history
   */
  async updateProgress(progress: number): Promise<{
    task: TaskMetadata;
    latestHistory: TaskHistory[];
  }> {
    const task = await this.getTask();
    const now = new Date().toISOString();

    // Use transaction to ensure atomicity
    await this.db.transaction(async (tx) => {
      // Update progress
      await tx
        .update(taskMetadata)
        .set({
          progress,
          updatedAt: now,
        })
        .where(eq(taskMetadata.id, 1));

      // Add progress event
      const historyEntry: NewTaskHistory = {
        eventType: "progress",
        message: `Progress updated to ${progress}%`,
        progress,
        timestamp: now,
      };

      await tx.insert(taskHistory).values(historyEntry);
    });

    // Fetch updated metadata and recent history
    const [updatedTask, latestHistory] = await Promise.all([
      this.getTask(),
      this.getHistory(10),
    ]);

    // Broadcast update to all connected WebSocket clients
    await this.broadcastUpdate({
      type: "progress",
      taskId: this.taskId,
      progress,
      task: updatedTask,
      timestamp: now,
    });

    return {
      task: updatedTask,
      latestHistory,
    };
  }

  /**
   * Mark task as completed
   * Returns enriched data including updated metadata and recent history
   */
  async completeTask(metadata?: Record<string, unknown>): Promise<{
    task: TaskMetadata;
    latestHistory: TaskHistory[];
  }> {
    const task = await this.getTask();
    const now = new Date().toISOString();

    // Use transaction to ensure atomicity
    await this.db.transaction(async (tx) => {
      // Update task status
      await tx
        .update(taskMetadata)
        .set({
          status: "success",
          progress: 100,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(taskMetadata.id, 1));

      // Add success event
      const historyEntry: NewTaskHistory = {
        eventType: "success",
        message: "Task completed successfully",
        progress: 100,
        timestamp: now,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      };

      await tx.insert(taskHistory).values(historyEntry);
    });

    // Fetch updated metadata and recent history
    const [updatedTask, latestHistory] = await Promise.all([
      this.getTask(),
      this.getHistory(10),
    ]);

    // Broadcast update to all connected WebSocket clients
    await this.broadcastUpdate({
      type: "complete",
      taskId: this.taskId,
      task: updatedTask,
      timestamp: now,
    });

    return {
      task: updatedTask,
      latestHistory,
    };
  }

  /**
   * Mark task as failed
   * Returns enriched data including updated metadata and recent history
   */
  async failTask(
    error: string,
    metadata?: Record<string, unknown>
  ): Promise<{
    task: TaskMetadata;
    latestHistory: TaskHistory[];
  }> {
    const task = await this.getTask();
    const now = new Date().toISOString();

    // Use transaction to ensure atomicity
    await this.db.transaction(async (tx) => {
      // Update task status
      await tx
        .update(taskMetadata)
        .set({
          status: "failed",
          failedAt: now,
          updatedAt: now,
        })
        .where(eq(taskMetadata.id, 1));

      // Add error event
      const historyEntry: NewTaskHistory = {
        eventType: "error",
        message: error,
        timestamp: now,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      };

      await tx.insert(taskHistory).values(historyEntry);
    });

    // Fetch updated metadata and recent history
    const [updatedTask, latestHistory] = await Promise.all([
      this.getTask(),
      this.getHistory(10),
    ]);

    // Broadcast update to all connected WebSocket clients
    await this.broadcastUpdate({
      type: "fail",
      taskId: this.taskId,
      error,
      task: updatedTask,
      timestamp: now,
    });

    return {
      task: updatedTask,
      latestHistory,
    };
  }

  /**
   * Mark task as canceled
   * Returns enriched data including updated metadata and recent history
   */
  async cancelTask(metadata?: Record<string, unknown>): Promise<{
    task: TaskMetadata;
    latestHistory: TaskHistory[];
  }> {
    const task = await this.getTask();
    const now = new Date().toISOString();

    // Use transaction to ensure atomicity
    await this.db.transaction(async (tx) => {
      // Update task status
      await tx
        .update(taskMetadata)
        .set({
          status: "canceled",
          canceledAt: now,
          updatedAt: now,
        })
        .where(eq(taskMetadata.id, 1));

      // Add error event (canceled)
      const historyEntry: NewTaskHistory = {
        eventType: "error",
        message: "Task canceled",
        timestamp: now,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      };

      await tx.insert(taskHistory).values(historyEntry);
    });

    // Fetch updated metadata and recent history
    const [updatedTask, latestHistory] = await Promise.all([
      this.getTask(),
      this.getHistory(10),
    ]);

    // Broadcast update to all connected WebSocket clients
    await this.broadcastUpdate({
      type: "cancel",
      taskId: this.taskId,
      task: updatedTask,
      timestamp: now,
    });

    return {
      task: updatedTask,
      latestHistory,
    };
  }

  /**
   * Get event history (limited to most recent)
   */
  async getHistory(limit = 50): Promise<TaskHistory[]> {
    const results = await this.db
      .select()
      .from(taskHistory)
      .orderBy(desc(taskHistory.id))
      .limit(limit)
      .all();

    return results;
  }

  /**
   * Delete all task data and storage
   * This completely removes the Durable Object by clearing all storage,
   * including Drizzle tables and migration metadata.
   */
  async deleteTask(): Promise<void> {
    // Delete ALL storage associated with this DO instance
    // This includes Drizzle tables, migrations table, and any other data
    await this.ctx.storage.deleteAll();
  }

  /**
   * Broadcast task update to all connected WebSocket clients
   */
  private async broadcastUpdate(event: {
    type: "event" | "progress" | "complete" | "fail" | "cancel";
    taskId: string;
    task: TaskMetadata;
    timestamp: string;
    event?: {
      eventType: string;
      message: string;
      progress?: number;
      timestamp: string;
    };
    progress?: number;
    error?: string;
  }): Promise<void> {
    const message = JSON.stringify(event);

    this.sessions.forEach((_sessionData, ws) => {
      try {
        ws.send(message);
      } catch (error) {
        console.error("Failed to send WebSocket message:", error);
        // Remove failed sessions
        this.sessions.delete(ws);
      }
    });
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
    ws.close(code, "Task WebSocket closed");
  }
}
