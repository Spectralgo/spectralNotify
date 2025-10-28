import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Text, View } from "react-native";
import { orpc } from "@/utils/orpc";
import { useCounterWebSocket } from "../hooks/use-counter-websocket";

interface LiveCounterProps {
  counterName: string;
  showMetadata?: boolean;
}

export function LiveCounter({
  counterName,
  showMetadata = false,
}: LiveCounterProps) {
  // Fetch counter metadata (initial load and cache updates)
  const { data: metadata, isLoading } = useQuery(
    orpc.counter.getMetadata.queryOptions({ input: { name: counterName } })
  );

  // WebSocket connection for real-time updates
  const { isConnected, isConnecting, error, lastUpdate } = useCounterWebSocket(
    counterName,
    {
      enabled: true,
      reconnectInterval: 3000,
      pingInterval: 30_000,
    }
  );

  if (isLoading) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text className="mt-2 text-muted-foreground">Loading counter...</Text>
      </View>
    );
  }

  if (!metadata) {
    return (
      <View className="items-center justify-center rounded-lg border border-destructive bg-destructive/10 p-4">
        <Text className="text-destructive">Counter not found</Text>
      </View>
    );
  }

  return (
    <View className="rounded-lg border border-border bg-card p-6">
      {/* Header with connection status */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-semibold text-foreground text-lg">
          {counterName}
        </Text>
        <View className="flex-row items-center gap-2">
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
          {error && (
            <View className="rounded-full bg-destructive/20 px-2 py-1">
              <Text className="font-medium text-destructive text-xs">
                Error
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Counter value display */}
      <View className="items-center border-border border-t py-8">
        <Text className="font-bold text-6xl text-foreground">
          {metadata.value}
        </Text>
        <Text className="mt-2 text-muted-foreground text-sm">
          {metadata.operationCount} operations
        </Text>
      </View>

      {/* Metadata (optional) */}
      {showMetadata && (
        <View className="mt-4 space-y-2 border-border border-t pt-4">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-xs">Created:</Text>
            <Text className="text-foreground text-xs">
              {new Date(metadata.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-xs">Updated:</Text>
            <Text className="text-foreground text-xs">
              {new Date(metadata.updatedAt).toLocaleString()}
            </Text>
          </View>
          {lastUpdate && (
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground text-xs">
                Last WS Update:
              </Text>
              <Text className="text-foreground text-xs">
                {lastUpdate.toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
