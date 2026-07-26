/**
 * Per-key write queue that coalesces instead of racing.
 *
 * For an API that replaces a whole collection on every edit: two requests built
 * from the same base silently lose one another's change, and a plain debounce
 * only narrows the window. This queue closes it:
 *
 *   - **one request per key in flight.** A `mark` during a request doesn't start
 *     a second; it flags the key and the running loop sends again afterwards.
 *   - **`send` reads the current state itself.** The queue never carries a
 *     payload, so what goes out is always the latest value, never a snapshot
 *     that some caller closed over.
 *   - **the debounce lives here**, so typing coalesces while structural edits
 *     (`delayMs: 0`) go immediately.
 *
 * No React, no store, no domain types — drive it with fake timers and a stub
 * `send` to test it.
 */

interface Entry {
  timer: ReturnType<typeof setTimeout> | null;
  /** There are changes `send` has not been told about yet. */
  dirty: boolean;
  running: boolean;
}

export interface CoalescingQueue {
  /**
   * Record that `key` changed and schedule a send. Repeated calls inside
   * `delayMs`, or during an in-flight send, collapse into one later send.
   */
  mark(key: string, delayMs?: number): void;
  /** Send every key with a pending timer right now. For unmount. */
  flushPending(): void;
}

/**
 * `send` must read the current state for `key` and write it. It is never called
 * concurrently for the same key. It should not throw for recoverable failures —
 * a rejection stops that key's loop, so handle and recover inside it.
 */
export function createCoalescingQueue(send: (key: string) => Promise<void>): CoalescingQueue {
  const entries = new Map<string, Entry>();

  const entryFor = (key: string): Entry => {
    let entry = entries.get(key);
    if (!entry) {
      entry = {timer: null, dirty: false, running: false};
      entries.set(key, entry);
    }
    return entry;
  };

  const run = async (key: string) => {
    const entry = entryFor(key);
    entry.timer = null;
    if (entry.running) {
      // The loop below will pick up `dirty` before it exits.
      return;
    }
    entry.running = true;
    try {
      while (entry.dirty) {
        entry.dirty = false;
        await send(key);
      }
    } catch {
      // `send` owns recovery; drop the backlog rather than retry into the same
      // failure. The next edit starts a fresh attempt.
      entry.dirty = false;
    } finally {
      entry.running = false;
    }
  };

  const start = (key: string) => {
    run(key).catch(() => undefined);
  };

  return {
    mark(key, delayMs = 0) {
      const entry = entryFor(key);
      entry.dirty = true;
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      if (delayMs === 0) {
        start(key);
      } else {
        entry.timer = setTimeout(() => start(key), delayMs);
      }
    },

    flushPending() {
      for (const [key, entry] of entries) {
        if (entry.timer) {
          clearTimeout(entry.timer);
          entry.timer = null;
          start(key);
        }
      }
    },
  };
}
