import type { CounterMetadata, CounterOperation } from "../../types/counter";

interface CounterBinding {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): CounterStub;
}

// Enriched response type for counter operations
export interface EnrichedCounterResponse {
  value: number;
  metadata: CounterMetadata;
  latestHistory: CounterOperation[];
}

interface CounterStub {
  initialize(name: string): Promise<void>;
  getCounterValue(): Promise<number>;
  getMetadata(): Promise<CounterMetadata>;
  increment(amount?: number): Promise<EnrichedCounterResponse>;
  decrement(amount?: number): Promise<EnrichedCounterResponse>;
  setValue(value: number): Promise<EnrichedCounterResponse>;
  reset(): Promise<EnrichedCounterResponse>;
  getHistory(limit?: number): Promise<CounterOperation[]>;
  deleteCounter(): Promise<void>;
}

/**
 * Get counter stub by name
 */
function getCounterStub(
  counterBinding: CounterBinding,
  name: string
): CounterStub {
  const id = counterBinding.idFromName(name);
  return counterBinding.get(id);
}

/**
 * Initialize a new counter
 */
export async function handleInitializeCounter(
  counterBinding: CounterBinding,
  name: string
): Promise<void> {
  const stub = getCounterStub(counterBinding, name);
  await stub.initialize(name);
}

/**
 * Get counter value by name
 */
export async function handleGetCounterValue(
  counterBinding: CounterBinding,
  name: string
): Promise<number> {
  const stub = getCounterStub(counterBinding, name);
  return await stub.getCounterValue();
}

/**
 * Get counter metadata by name
 */
export async function handleGetCounterMetadata(
  counterBinding: CounterBinding,
  name: string
): Promise<CounterMetadata> {
  const stub = getCounterStub(counterBinding, name);
  return await stub.getMetadata();
}

/**
 * Increment counter
 * Returns enriched response with metadata and recent history
 */
export async function handleIncrementCounter(
  counterBinding: CounterBinding,
  name: string,
  amount?: number
): Promise<EnrichedCounterResponse> {
  const stub = getCounterStub(counterBinding, name);
  return await stub.increment(amount);
}

/**
 * Decrement counter
 * Returns enriched response with metadata and recent history
 */
export async function handleDecrementCounter(
  counterBinding: CounterBinding,
  name: string,
  amount?: number
): Promise<EnrichedCounterResponse> {
  const stub = getCounterStub(counterBinding, name);
  return await stub.decrement(amount);
}

/**
 * Set counter to specific value
 * Returns enriched response with metadata and recent history
 */
export async function handleSetCounterValue(
  counterBinding: CounterBinding,
  name: string,
  value: number
): Promise<EnrichedCounterResponse> {
  const stub = getCounterStub(counterBinding, name);
  return await stub.setValue(value);
}

/**
 * Reset counter to zero
 * Returns enriched response with metadata and recent history
 */
export async function handleResetCounter(
  counterBinding: CounterBinding,
  name: string
): Promise<EnrichedCounterResponse> {
  const stub = getCounterStub(counterBinding, name);
  return await stub.reset();
}

/**
 * Get counter operation history
 */
export async function handleGetCounterHistory(
  counterBinding: CounterBinding,
  name: string,
  limit?: number
): Promise<CounterOperation[]> {
  const stub = getCounterStub(counterBinding, name);
  return await stub.getHistory(limit);
}

/**
 * Delete counter
 */
export async function handleDeleteCounter(
  counterBinding: CounterBinding,
  name: string
): Promise<void> {
  const stub = getCounterStub(counterBinding, name);
  await stub.deleteCounter();
}
