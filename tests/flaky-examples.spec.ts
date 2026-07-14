import { test, expect } from '@playwright/test';
 
/**
 * More elaborate intentionally-flaky tests - seeded for validating flaky-test
 * detector tooling against realistic, moderately sophisticated failure modes
 * (as opposed to flaky-examples.spec.ts, which covers single-mechanism basics).
 *
 * Every test here has a genuine, evidence-backed probability of failing on any
 * given run - none of them are "always fails" (that's just broken, not flaky)
 * or "always passes" (that's just stable). Patterns:
 *
 *  1. lost-update race       - classic read-then-write-after-delay concurrency bug
 *  2. rate-limiter overload  - token bucket exhausted under bursty concurrent load
 *  3. timeout-vs-work race  - Promise.race between overlapping random durations
 *  4. clock tie-breaking     - strict ordering assumption on millisecond-resolution clock
 *  5. debounce boundary      - timer-boundary edge case in a debounced function
 *  6. cross-test contamination - imperfect teardown in afterEach leaking into the next test
 *  7. producer/consumer ordering - async event delivery order not guaranteed under jitter
 */
 
test.describe('Concurrency & shared state', () => {
  test('lost-update: concurrent read-modify-write on a shared counter', async () => {
    // Classic non-atomic increment: each "worker" reads the current value, does
    // some async work, then writes back old+1. If two workers read the same
    // value before either writes back, one increment is silently lost - this
    // is THE textbook race condition behind most "the count is sometimes off
    // by one" bugs in real systems.
    let sharedCounter = 0;
 
    const incrementWithRace = async () => {
      const seenValue = sharedCounter;
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 8));
      sharedCounter = seenValue + 1;
    };
 
    const WORKERS = 4;
    await Promise.all(Array.from({ length: WORKERS }, () => incrementWithRace()));
 
    // Fails whenever two or more workers' delays overlapped enough to clobber
    // each other's update - how often depends purely on the random delays above.
    expect(sharedCounter).toBe(WORKERS);
  });
 
  test('rate-limiter: token bucket can be overrun by a concurrent burst', async () => {
    // A token bucket with 3 tokens refilling on a timer, hit by 4 concurrent
    // "requests" whose processing time is randomized. Whether the 4th request
    // finds a free token depends on exactly when the refill timer fires
    // relative to the others finishing - a real pattern in rate-limited APIs
    // and connection pools under bursty load.
    let tokens = 3;
    const refillTimer = setInterval(() => {
      tokens = Math.min(3, tokens + 1);
    }, 6);
 
    try {
      const request = async (id: number) => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 15));
        if (tokens <= 0) {
          throw new Error(`request ${id} rejected - no tokens available`);
        }
        tokens--;
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
      };
 
      const REQUESTS = 4;
      await Promise.all(Array.from({ length: REQUESTS }, (_, i) => request(i)));
    } finally {
      clearInterval(refillTimer);
    }
  });
});
 
test.describe('Timing races', () => {
  test('timeout-vs-work: a client-side timeout racing real work', async () => {
    // A very common real-world pattern: wrap a "slow dependency" call with a
    // client-side timeout using Promise.race. When the dependency's actual
    // duration and the timeout window overlap (as they do here, both drawn
    // from overlapping random ranges), which one wins is a genuine coin flip -
    // exactly the shape of "works on my machine" timeout flakiness in CI.
    const slowDependencyCall = new Promise<string>((resolve) =>
      setTimeout(() => resolve('data'), 10 + Math.random() * 20)
    );
 
    const clientTimeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('client timeout exceeded')), 20)
    );
 
    const result = await Promise.race([slowDependencyCall, clientTimeout]);
    expect(result).toBe('data');
  });
 
  test('clock-tie: strict ordering assumption on a millisecond-resolution clock', async () => {
    // Captures two timestamps and asserts strict ordering. On a fast enough
    // turn of the event loop, Date.now() can return the exact same
    // millisecond twice in a row, and a strict `>` comparison fails - a subtle,
    // real bug class in tests/logs that assume wall-clock time always ticks
    // forward between two nearby calls. Whether that happens here is a coin
    // flip: about half the time there's no gap at all between reads (almost
    // certainly the same millisecond, ties and fails), and half the time
    // there's a small delay (almost certainly a new millisecond, passes).
    const t1 = Date.now();
    if (Math.random() < 0.5) {
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    const t2 = Date.now();
 
    expect(t2).toBeGreaterThan(t1);
  });
 
  test('debounce-boundary: a call landing right on the debounce window edge', async () => {
    // Simulates a debounced function (e.g. search-as-you-type) and asserts it
    // fires exactly once for a burst of calls. A second, unintended call can
    // land just outside the debounce window when jitter pushes it over the
    // edge - the same failure mode behind "double submit" bugs in debounced
    // UI handlers.
    let callCount = 0;
    let debounceTimer: NodeJS.Timeout | null = null;
    const DEBOUNCE_MS = 20;
 
    const debouncedAction = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        callCount++;
      }, DEBOUNCE_MS);
    };
 
    debouncedAction();
    // Second call arrives near the edge of the debounce window - sometimes
    // inside it (correctly suppressed), sometimes just after the first timer
    // already fired (triggering a second, unwanted call).
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS - 5 + Math.random() * 10));
    debouncedAction();
 
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 15));
 
    expect(callCount).toBe(1);
  });
});
 
test.describe('Cross-test contamination', () => {
  // Simulates a shared in-memory cache/session that tests assume gets cleared
  // between them. Real suites hit this via shared DB fixtures, singleton
  // caches, or global mocks that aren't perfectly reset in afterEach.
  let sessionCache: Record<string, unknown> = {};
 
  test.afterEach(async () => {
    // Imperfect teardown: "usually" clears the cache, but not always - modeling
    // a real cleanup routine that itself has a race (e.g. an async flush that
    // isn't awaited, or a conditional reset path that's occasionally skipped).
    if (Math.random() < 0.5) {
      sessionCache = {};
    }
  });
 
  test('writes a value into the shared session cache', async () => {
    sessionCache.userId = 'user-123';
    expect(sessionCache.userId).toBe('user-123');
  });
 
  test('expects a clean session cache on entry', async () => {
    // Fails whenever the previous test's afterEach happened to skip the reset -
    // a genuine "test order matters" bug that only shows up depending on
    // execution order and how the previous test's cleanup behaved.
    expect(sessionCache.userId).toBeUndefined();
  });
});
 
test.describe('Producer/consumer ordering', () => {
  test('events delivered out of emission order under jitter', async () => {
    // A producer emits 3 events with independent random delays; a consumer
    // collects them via listeners as they arrive. Real event buses/queues
    // (webhooks, message brokers, DOM custom events with async handlers) don't
    // guarantee delivery order matches emission order once any handler does
    // async work - this reproduces that directly.
    const { EventEmitter } = await import('events');
    const bus = new EventEmitter();
    const received: number[] = [];
 
    const delivery = new Promise<void>((resolve) => {
      let count = 0;
      bus.on('item', (n: number) => {
        received.push(n);
        count++;
        if (count === 3) resolve();
      });
    });
 
    for (const n of [1, 2, 3]) {
      const delay = Math.random() * 15;
      setTimeout(() => bus.emit('item', n), delay);
    }
 
    await delivery;
 
    // Assumes delivery order matches emission order - not guaranteed once
    // delivery is scheduled via independent timers.
    expect(received).toEqual([1, 2, 3]);
  });
});
