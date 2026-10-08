import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SemanticSearchClient,
  type SemanticSearchWorker,
} from "../../src/search/semantic-search-client.js";

class WorkerDouble implements SemanticSearchWorker {
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }
}

describe("semantic search worker lifecycle", () => {
  afterEach(() => vi.useRealTimers());

  it("rejects initialization and terminates on a fatal worker error", async () => {
    const worker = new WorkerDouble();
    const client = new SemanticSearchClient({ worker, requestTimeoutMs: 1_000 });
    const initialization = client.initialize(() => undefined);
    const preventDefault = vi.fn();
    const event = { message: "worker exploded", preventDefault } as unknown as ErrorEvent;
    const rejection = expect(initialization).rejects.toThrow("worker exploded");

    worker.onerror?.(event);

    await rejection;
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(worker.terminated).toBe(true);
  });

  it("settles a request that never receives a worker response", async () => {
    vi.useFakeTimers();
    const worker = new WorkerDouble();
    const client = new SemanticSearchClient({ worker, requestTimeoutMs: 50 });
    const initialization = client.initialize(() => undefined);
    const rejection = expect(initialization).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(50);

    await rejection;
    expect(worker.terminated).toBe(true);
  });

  it("rejects unreadable messages instead of leaving requests pending", async () => {
    const worker = new WorkerDouble();
    const client = new SemanticSearchClient({ worker, requestTimeoutMs: 1_000 });
    const initialization = client.initialize(() => undefined);
    const rejection = expect(initialization).rejects.toThrow("unreadable message");

    worker.onmessageerror?.({} as MessageEvent);

    await rejection;
    expect(worker.terminated).toBe(true);
  });

  it("rejects malformed messages without waiting for the timeout", async () => {
    const worker = new WorkerDouble();
    const client = new SemanticSearchClient({ worker, requestTimeoutMs: 1_000 });
    const initialization = client.initialize(() => undefined);
    const rejection = expect(initialization).rejects.toThrow("invalid message");

    worker.onmessage?.({ data: { type: "ready" } } as MessageEvent);

    await rejection;
    expect(worker.terminated).toBe(true);
  });
});
