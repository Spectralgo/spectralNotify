import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { ApiClient, TaskApi, WorkflowApi } from "./api";

export interface SpectralNotifyConfig {
  /**
   * Server URL (e.g., "https://api.example.com" or "http://localhost:8094")
   */
  serverUrl: string;

  /**
   * API key for write operations (optional for read-only usage)
   * Read operations (getById, getPhases, getHistory) do not require authentication
   * Write operations (create, update, complete, fail, cancel) require an API key
   */
  apiKey?: string;

  /**
   * Optional custom headers
   */
  headers?: HeadersInit;

  /**
   * Credentials mode for fetch requests
   * @default "omit" - No credentials sent by default since API key handles auth
   */
  credentials?: RequestCredentials;

  /**
   * Optional custom QueryClient
   * If not provided, a default QueryClient will be created
   */
  queryClient?: QueryClient;
}

interface SpectralNotifyContextValue {
  config: SpectralNotifyConfig;
  apiClient: ApiClient;
  workflowApi: WorkflowApi;
  taskApi: TaskApi;
  queryClient: QueryClient;
}

const SpectralNotifyContext = createContext<
  SpectralNotifyContextValue | undefined
>(undefined);

export interface SpectralNotifyProviderProps {
  config: SpectralNotifyConfig;
  children: ReactNode;
}

/**
 * Provider component for SpectralNotify client library
 *
 * @example
 * Read-only usage (no API key required):
 * ```tsx
 * import { SpectralNotifyProvider } from '@spectralnotify/client';
 *
 * function App() {
 *   return (
 *     <SpectralNotifyProvider config={{ serverUrl: 'https://api.example.com' }}>
 *       <YourApp />
 *     </SpectralNotifyProvider>
 *   );
 * }
 * ```
 *
 * @example
 * With write operations (API key required):
 * ```tsx
 * function App() {
 *   return (
 *     <SpectralNotifyProvider config={{
 *       serverUrl: 'https://api.example.com',
 *       apiKey: 'your-api-key'
 *     }}>
 *       <YourApp />
 *     </SpectralNotifyProvider>
 *   );
 * }
 * ```
 */
export function SpectralNotifyProvider({
  config,
  children,
}: SpectralNotifyProviderProps) {
  const value = useMemo(() => {
    const apiClient = new ApiClient({
      serverUrl: config.serverUrl,
      apiKey: config.apiKey,
      headers: config.headers,
      credentials: config.credentials,
    });

    const workflowApi = new WorkflowApi(apiClient);
    const taskApi = new TaskApi(apiClient);

    const queryClient =
      config.queryClient ||
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      });

    return {
      config,
      apiClient,
      workflowApi,
      taskApi,
      queryClient,
    };
  }, [config]);

  return (
    <SpectralNotifyContext.Provider value={value}>
      <QueryClientProvider client={value.queryClient}>
        {children}
      </QueryClientProvider>
    </SpectralNotifyContext.Provider>
  );
}

/**
 * Hook to access SpectralNotify context
 * @throws Error if used outside of SpectralNotifyProvider
 */
export function useSpectralNotifyContext(): SpectralNotifyContextValue {
  const context = useContext(SpectralNotifyContext);
  if (!context) {
    throw new Error(
      "useSpectralNotifyContext must be used within SpectralNotifyProvider"
    );
  }
  return context;
}
