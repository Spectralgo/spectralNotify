import { useEffect, useState } from "react";

interface LiveUpdateOptions {
  enabled?: boolean;
  interval?: number; // milliseconds
  onUpdate?: () => void;
}

/**
 * Hook to simulate live updates with polling
 * Toggles between Live and Poll modes
 */
export function useLiveUpdates({
  enabled = true,
  interval = 3000,
  onUpdate,
}: LiveUpdateOptions = {}) {
  const [isLive, setIsLive] = useState(enabled);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!isLive) return;

    const timer = setInterval(() => {
      setLastUpdate(new Date());
      onUpdate?.();
    }, interval);

    return () => clearInterval(timer);
  }, [isLive, interval, onUpdate]);

  const toggleLive = (enabled: boolean) => {
    setIsLive(enabled);
    if (enabled) {
      setLastUpdate(new Date());
      onUpdate?.();
    }
  };

  return {
    isLive,
    toggleLive,
    lastUpdate,
  };
}

/**
 * Hook to simulate progress updates for active tasks
 * Increments progress over time
 */
export function useProgressSimulation(initialProgress = 0, enabled = true) {
  const [progress, setProgress] = useState(initialProgress);

  useEffect(() => {
    if (!enabled || progress >= 100) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const increment = Math.random() * 15 + 5; // Random increment between 5-20%
        const newProgress = Math.min(prev + increment, 100);
        return Math.round(newProgress);
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(timer);
  }, [enabled, progress]);

  const resetProgress = () => {
    setProgress(initialProgress);
  };

  return {
    progress,
    resetProgress,
    isComplete: progress >= 100,
  };
}

/**
 * Hook to track connection status for live updates
 */
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    // Simulate occasional disconnections (for demo purposes)
    const disconnectChance = 0.05; // 5% chance every 30 seconds
    const timer = setInterval(() => {
      if (Math.random() < disconnectChance) {
        setIsConnected(false);
        setReconnectAttempts((prev) => prev + 1);

        // Reconnect after 2-5 seconds
        setTimeout(
          () => {
            setIsConnected(true);
          },
          2000 + Math.random() * 3000
        );
      }
    }, 30_000);

    return () => clearInterval(timer);
  }, []);

  return {
    isConnected,
    reconnectAttempts,
  };
}
