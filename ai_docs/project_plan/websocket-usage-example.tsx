/**
 * Example Component: Counter with Real-Time WebSocket Updates
 *
 * This example demonstrates how to integrate the useCounterWebSocket hook
 * into a React component for real-time counter updates.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCounterWebSocket } from "@/hooks/use-counter-websocket";
import {
  useCounterMetadata,
  useDecrementCounter,
  useIncrementCounter,
} from "@/hooks/use-counters";

interface LiveCounterProps {
  counterName: string;
}

export function LiveCounter({ counterName }: LiveCounterProps) {
  const [liveEnabled, setLiveEnabled] = useState(true);

  // Fetch counter metadata (initial load and cache updates)
  const { data: metadata, isLoading } = useCounterMetadata(counterName);

  // WebSocket connection for real-time updates
  const {
    isConnected,
    isConnecting,
    error,
    lastUpdate,
    reconnect,
    disconnect,
  } = useCounterWebSocket(counterName, {
    enabled: liveEnabled,
    onUpdate: (event) => {
      // Show toast notification when counter is updated by someone else
      toast.info(
        `Counter ${event.type}: ${event.previousValue} → ${event.value}`,
        {
          description: `Updated at ${new Date(event.timestamp).toLocaleTimeString()}`,
        }
      );
    },
    reconnectInterval: 3000, // Reconnect after 3 seconds on disconnect
    pingInterval: 30_000, // Send ping every 30 seconds
  });

  // Mutations for counter operations
  const incrementMutation = useIncrementCounter();
  const decrementMutation = useDecrementCounter();

  if (isLoading) {
    return <div>Loading counter...</div>;
  }

  if (!metadata) {
    return <div>Counter not found</div>;
  }

  const handleIncrement = () => {
    incrementMutation.mutate({ name: counterName, amount: 1 });
  };

  const handleDecrement = () => {
    decrementMutation.mutate({ name: counterName, amount: 1 });
  };

  const toggleLive = () => {
    if (liveEnabled) {
      disconnect();
      setLiveEnabled(false);
    } else {
      reconnect();
      setLiveEnabled(true);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-6">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-2xl">{counterName}</h2>
        <div className="flex items-center gap-2">
          {isConnecting && <Badge variant="outline">Connecting...</Badge>}
          {isConnected && <Badge variant="default">Live</Badge>}
          {!(isConnected || isConnecting) && (
            <Badge variant="destructive">Disconnected</Badge>
          )}
          {error && <Badge variant="destructive">{error}</Badge>}
        </div>
      </div>

      {/* Counter value display */}
      <div className="py-8 text-center">
        <div className="font-bold text-6xl">{metadata.value}</div>
        <p className="mt-2 text-muted-foreground text-sm">
          {metadata.operationCount} operations
        </p>
      </div>

      {/* Counter controls */}
      <div className="flex justify-center gap-2">
        <Button
          disabled={decrementMutation.isPending}
          onClick={handleDecrement}
          size="lg"
          variant="outline"
        >
          -
        </Button>
        <Button
          disabled={incrementMutation.isPending}
          onClick={handleIncrement}
          size="lg"
        >
          +
        </Button>
      </div>

      {/* Live updates toggle */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="space-y-1">
          <p className="font-medium text-sm">Live Updates</p>
          {lastUpdate && (
            <p className="text-muted-foreground text-xs">
              Last update: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button onClick={toggleLive} size="sm" variant="outline">
          {liveEnabled ? "Disable" : "Enable"} Live
        </Button>
      </div>

      {/* Metadata */}
      <div className="space-y-1 border-t pt-4 text-muted-foreground text-xs">
        <p>Created: {new Date(metadata.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(metadata.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

/**
 * Example Usage in a Route:
 *
 * ```tsx
 * import { LiveCounter } from "@/components/live-counter";
 *
 * export function CounterPage() {
 *   return (
 *     <div className="container mx-auto py-8">
 *       <LiveCounter counterName="my-counter" />
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * Multi-Counter Dashboard Example:
 *
 * This demonstrates multiple counters with independent WebSocket connections
 */

export function MultiCounterDashboard() {
  const { data: counters } = useListAllCounters();

  return (
    <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
      {counters?.counters.map((counter) => (
        <LiveCounter counterName={counter.name} key={counter.name} />
      ))}
    </div>
  );
}

/**
 * Advanced Example: Counter with Custom Event Handling
 */

export function AdvancedLiveCounter({ counterName }: LiveCounterProps) {
  const [eventLog, setEventLog] = useState<
    Array<{
      type: string;
      timestamp: string;
      value: number;
    }>
  >([]);

  const { isConnected } = useCounterWebSocket(counterName, {
    onUpdate: (event) => {
      // Log all events
      setEventLog((prev) => [
        {
          type: event.type,
          timestamp: event.timestamp,
          value: event.value,
        },
        ...prev.slice(0, 9), // Keep last 10 events
      ]);
    },
  });

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <h3 className="font-semibold">Event Log</h3>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {eventLog.length === 0 && (
          <p className="text-muted-foreground text-sm">No events yet</p>
        )}
        {eventLog.map((event, index) => (
          <div
            className="flex justify-between rounded bg-muted p-2 text-xs"
            key={index}
          >
            <span className="font-mono">{event.type}</span>
            <span>Value: {event.value}</span>
            <span className="text-muted-foreground">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
