import { DurableObject } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import {
  type DrizzleSqliteDODatabase,
  drizzle,
} from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import migrations from "./counter-migrations/migrations.js";
import {
  type CounterHistory,
  type CounterMetadata,
  counterHistory,
  counterMetadata,
  type NewCounterHistory,
  type NewCounterMetadata,
} from "./counter-schema";

export class Counter extends DurableObject {
  private db: DrizzleSqliteDODatabase<{
    counterMetadata: typeof counterMetadata;
    counterHistory: typeof counterHistory;
  }>;
  private name = "";
  // Track WebSocket sessions for broadcasting updates
  private sessions: Map<WebSocket, { id: string; subscribedAt: string }> =
    new Map();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Initialize Drizzle with Durable Object storage
    this.db = drizzle(ctx.storage, {
      schema: { counterMetadata, counterHistory },
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
   * Initialize counter with a name (called once per counter instance)
   */
  async initialize(name: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(counterMetadata)
      .where(eq(counterMetadata.id, 1))
      .get();

    if (existing) {
      this.name = existing.name;
    } else {
      const now = new Date().toISOString();
      const newCounter: NewCounterMetadata = {
        id: 1,
        name,
        value: 0,
        createdAt: now,
        updatedAt: now,
        operationCount: 0,
      };

      await this.db.insert(counterMetadata).values(newCounter);
      this.name = name;
    }
  }

  /**
   * Get current counter value
   */
  async getCounterValue(): Promise<number> {
    const result = await this.db
      .select({ value: counterMetadata.value })
      .from(counterMetadata)
      .where(eq(counterMetadata.id, 1))
      .get();

    return result?.value ?? 0;
  }

  /**
   * Get counter metadata
   */
  async getMetadata(): Promise<CounterMetadata> {
    const result = await this.db
      .select()
      .from(counterMetadata)
      .where(eq(counterMetadata.id, 1))
      .get();

    if (!result) {
      throw new Error("Counter not initialized");
    }

    return result;
  }

  /**
   * Increment counter by amount
   * Returns enriched data including updated metadata and recent history
   */
  async increment(amount = 1): Promise<{
    value: number;
    metadata: CounterMetadata;
    latestHistory: CounterHistory[];
  }> {
    const metadata = await this.getMetadata();
    const previousValue = metadata.value;
    const newValue = previousValue + amount;
    const now = new Date().toISOString();

    // Use transaction to ensure atomicity
    await this.db.transaction(async (tx) => {
      // Update counter value
      await tx
        .update(counterMetadata)
        .set({
          value: newValue,
          updatedAt: now,
          operationCount: metadata.operationCount + 1,
        })
        .where(eq(counterMetadata.id, 1));

      // Log operation to history
      const historyEntry: NewCounterHistory = {
        operation: `increment(${amount})`,
        previousValue,
        newValue,
        timestamp: now,
      };

      await tx.insert(counterHistory).values(historyEntry);
    });

    // Fetch updated metadata and recent history in single round-trip
    const [updatedMetadata, latestHistory] = await Promise.all([
      this.getMetadata(),
      this.getHistory(5),
    ]);

    // Broadcast update to all connected WebSocket clients
    await this.broadcastUpdate({
      type: "increment",
      value: newValue,
      previousValue,
      metadata: updatedMetadata,
      timestamp: now,
    });

    return {
      value: newValue,
      metadata: updatedMetadata,
      latestHistory,
    };
  }

  /**
   * Decrement counter by amount
   * Returns enriched data including updated metadata and recent history
   */
  async decrement(amount = 1): Promise<{
    value: number;
    metadata: CounterMetadata;
    latestHistory: CounterHistory[];
  }> {
    const metadata = await this.getMetadata();
    const previousValue = metadata.value;
    const newValue = previousValue - amount;
    const now = new Date().toISOString();

    // Use transaction to ensure atomicity
    await this.db.transaction(async (tx) => {
      // Update counter value
      await tx
        .update(counterMetadata)
        .set({
          value: newValue,
          updatedAt: now,
          operationCount: metadata.operationCount + 1,
        })
        .where(eq(counterMetadata.id, 1));

      // Log operation to history
      const historyEntry: NewCounterHistory = {
        operation: `decrement(${amount})`,
        previousValue,
        newValue,
        timestamp: now,
      };

      await tx.insert(counterHistory).values(historyEntry);
    });

    // Fetch updated metadata and recent history in single round-trip
    const [updatedMetadata, latestHistory] = await Promise.all([
      this.getMetadata(),
      this.getHistory(5),
    ]);

    // Broadcast update to all connected WebSocket clients
    await this.broadcastUpdate({
      type: "decrement",
      value: newValue,
      previousValue,
      metadata: updatedMetadata,
      timestamp: now,
    });

    return {
      value: newValue,
      metadata: updatedMetadata,
      latestHistory,
    };
  }

  /**
   * Set counter to a specific value
   * Returns enriched data including updated metadata and recent history
   */
  async setValue(value: number): Promise<{
    value: number;
    metadata: CounterMetadata;
    latestHistory: CounterHistory[];
  }> {
    const metadata = await this.getMetadata();
    const previousValue = metadata.value;
    const now = new Date().toISOString();

    // Use transaction to ensure atomicity
    await this.db.transaction(async (tx) => {
      // Update counter value
      await tx
        .update(counterMetadata)
        .set({
          value,
          updatedAt: now,
          operationCount: metadata.operationCount + 1,
        })
        .where(eq(counterMetadata.id, 1));

      // Log operation to history
      const historyEntry: NewCounterHistory = {
        operation: `setValue(${value})`,
        previousValue,
        newValue: value,
        timestamp: now,
      };

      await tx.insert(counterHistory).values(historyEntry);
    });

    // Fetch updated metadata and recent history in single round-trip
    const [updatedMetadata, latestHistory] = await Promise.all([
      this.getMetadata(),
      this.getHistory(5),
    ]);

    // Broadcast update to all connected WebSocket clients
    await this.broadcastUpdate({
      type: "setValue",
      value,
      previousValue,
      metadata: updatedMetadata,
      timestamp: now,
    });

    return {
      value,
      metadata: updatedMetadata,
      latestHistory,
    };
  }

  /**
   * Reset counter to zero
   * Returns enriched data including updated metadata and recent history
   */
  async reset(): Promise<{
    value: number;
    metadata: CounterMetadata;
    latestHistory: CounterHistory[];
  }> {
    return await this.setValue(0);
  }

  /**
   * Get operation history (limited to most recent)
   */
  async getHistory(limit = 50): Promise<CounterHistory[]> {
    const results = await this.db
      .select()
      .from(counterHistory)
      .orderBy(desc(counterHistory.id))
      .limit(limit)
      .all();

    return results;
  }

  /**
   * Delete all counter data and storage
   * This completely removes the Durable Object by clearing all storage,
   * including Drizzle tables and migration metadata.
   */
  async deleteCounter(): Promise<void> {
    // Delete ALL storage associated with this DO instance
    // This includes Drizzle tables, migrations table, and any other data
    await this.ctx.storage.deleteAll();
  }

  /**
   * Broadcast counter update to all connected WebSocket clients
   */
  private async broadcastUpdate(event: {
    type: "increment" | "decrement" | "setValue" | "reset";
    value: number;
    previousValue: number;
    metadata: CounterMetadata;
    timestamp: string;
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
    ws.close(code, "Counter WebSocket closed");
  }
}
