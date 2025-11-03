import * as Crypto from "expo-crypto";

/**
 * Base configuration for API client
 */
export interface ApiClientConfig {
  serverUrl: string;
  /**
   * API key for write operations (optional for read operations)
   */
  apiKey?: string;
  /**
   * Additional headers to include in requests
   */
  headers?: HeadersInit;
  /**
   * Credentials mode for fetch requests
   * @default 'omit' - No credentials sent by default since API key handles auth
   */
  credentials?: RequestCredentials;
}

/**
 * Base API client with fetch
 */
export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = {
      credentials: "omit",
      ...config,
    };
  }

  /**
   * Determine if an operation is a write operation that requires API key
   */
  private isWriteOperation(endpoint: string): boolean {
    const writeOperations = [
      "create",
      "update",
      "complete",
      "fail",
      "cancel",
      "updatePhaseProgress",
      "completePhase",
      "updateProgress",
    ];
    return writeOperations.some((op) => endpoint.includes(op));
  }

  /**
   * Build headers for the request
   */
  private buildHeaders(endpoint: string): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...this.config.headers,
    };

    // Add API key for write operations
    if (this.isWriteOperation(endpoint) && this.config.apiKey) {
      (headers as Record<string, string>)["X-API-Key"] = this.config.apiKey;
    }

    return headers;
  }

  /**
   * Generates a deterministic idempotency key from operation signature
   * Uses SHA-256 hash to ensure the same operation always produces the same key
   */
  private async generateIdempotencyKey(
    path: string,
    body: unknown
  ): Promise<string> {
    // Sort object keys for consistent hashing regardless of key order
    const sortKeys = (obj: unknown): unknown => {
      if (obj === null || typeof obj !== "object") return obj;
      if (Array.isArray(obj)) return obj.map(sortKeys);
      return Object.keys(obj)
        .sort()
        .reduce(
          (sorted, key) => {
            sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
            return sorted;
          },
          {} as Record<string, unknown>
        );
    };

    const sortedData = {
      path,
      body: sortKeys(body),
    };

    const signature = JSON.stringify(sortedData);

    // Use expo-crypto for SHA-256 hash (React Native compatible)
    const hashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      signature
    );

    return hashHex;
  }

  /**
   * Make a POST request to a REST endpoint
   * Automatically generates deterministic Idempotency-Key for write operations
   * API key is only required for write operations
   */
  async post<TInput, TOutput>(
    endpoint: string,
    input: TInput
  ): Promise<TOutput> {
    // Ensure endpoint starts with /
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${this.config.serverUrl}${path}`;

    const isWrite = this.isWriteOperation(endpoint);

    // Validate API key for write operations
    if (isWrite && !this.config.apiKey) {
      throw new Error(
        `API key required for write operation: ${endpoint}. Pass apiKey in ApiClientConfig.`
      );
    }

    const headers = this.buildHeaders(endpoint) as Record<string, string>;

    // Generate deterministic idempotency key for write operations
    if (isWrite) {
      const idempotencyKey = await this.generateIdempotencyKey(path, input);
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      credentials: this.config.credentials,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    return data;
  }

  /**
   * Make a GET request to a REST endpoint
   * For GET requests, input is serialized as query parameters
   */
  async get<TInput, TOutput>(
    endpoint: string,
    input?: TInput
  ): Promise<TOutput> {
    // Ensure endpoint starts with /
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    let url = `${this.config.serverUrl}${path}`;

    if (input) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.config.headers,
      },
      credentials: this.config.credentials,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    return data;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ApiClientConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current server URL
   */
  getServerUrl(): string {
    return this.config.serverUrl;
  }
}
