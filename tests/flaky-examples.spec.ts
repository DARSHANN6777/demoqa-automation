import { test, expect } from '@playwright/test';
 
/**
 * Intentionally flaky tests — seeded for validating flaky-test detector tooling.
 *
 * Each test below is a deliberate, well-known flakiness pattern. None of them
 * always pass or always fail — each has a genuine probability of failing on
 * any given run, so running the suite N times should produce a mix of
 * PASS/FAIL per test (not 0% or 100% fail rate). That intermittency is what a
 * flaky-test detector should flag.
 *
 * Patterns covered:
 *  1. random-assertion       — outcome depends on Math.random()
 *  2. race-condition         — two async ops racing, order not guaranteed
 *  3. order/state-dependent  — shared module-level mutable state across tests
 *  4. timing-threshold       — assertion against a tight time budget with jitter
 *  5. dangling-promise       — assertion runs before a fire-and-forget async op resolves
 *  6. unstable-external-call — simulated flaky network/IO dependency
 *
 * Do NOT "fix" these by adding retries — that hides the flake rate rather
 * than removing the nondeterminism. They're meant to stay flaky.
 */
 
test.describe('Flaky examples (seeded for detector testing)', () => {
  test('random-assertion: coin flip threshold', async () => {
    // Fails ~50% of the time. Classic nondeterministic-assertion flake.
    const roll = Math.random();
    expect(roll).toBeGreaterThan(0.5);
  });
 
  test('race-condition: two timers racing for a shared flag', async () => {
    // Two async operations start "simultaneously" with random delays and
    // write to a shared value. The test assumes a fixed ordering that isn't
    // actually guaranteed — a textbook race condition.
    let winner = '';
 
    const opA = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (winner === '') winner = 'A';
        resolve();
      }, Math.random() * 20);
    });
 
    const opB = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (winner === '') winner = 'B';
        resolve();
      }, Math.random() * 20);
    });
 
    await Promise.all([opA, opB]);
 
    // Test wrongly assumes A always wins the race.
    expect(winner).toBe('A');
  });
 
  test('timing-threshold: operation must finish under a tight budget', async () => {
    // Simulates work with random jitter, then asserts against a budget that's
    // only wide enough to pass most, not all, of the time.
    const start = Date.now();
    const jitterMs = Math.random() * 50; // 0–50ms of "system load"
    await new Promise((resolve) => setTimeout(resolve, jitterMs));
    const elapsed = Date.now() - start;
 
    expect(elapsed).toBeLessThan(30); // budget too tight for the full jitter range
  });
 
  test('dangling-promise: assertion runs ahead of a fire-and-forget update', async () => {
    // Kicks off an async update WITHOUT awaiting it (a common real-world bug:
    // a forgotten `await`), then immediately asserts on state it modifies.
    let ready = false;
 
    const backgroundWork = async () => {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
      ready = true;
    };
 
    // Bug: not awaited.
    void backgroundWork();
 
    // Small, but not always sufficient, grace period before checking.
    await new Promise((resolve) => setTimeout(resolve, 5));
 
    expect(ready).toBe(true);
  });
 
  test('unstable-external-call: simulated flaky dependency', async () => {
    // Stands in for a real network/DB call that intermittently errors —
    // no retry/backoff logic, so the test's success rides on the dependency.
    const simulateExternalCall = () =>
      new Promise<string>((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.3) {
            reject(new Error('simulated transient upstream failure'));
          } else {
            resolve('ok');
          }
        }, 5);
      });
 
    const result = await simulateExternalCall();
    expect(result).toBe('ok');
  });
});
 
// Leftover state from a previous run persisted on disk — a very common
// real-world source of order-dependent flakiness: a fixture, lockfile, or
// counter that one run leaves behind and the next run doesn't reset,
// so pass/fail depends on execution history rather than the code under test.
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
 
const counterFile = path.join(os.tmpdir(), 'flaky-examples-shared-counter.txt');
 
test.describe('Order-dependent flaky example', () => {
  test('order-dependent: counter left over from a prior run must be even', async () => {
    let count = 0;
    if (fs.existsSync(counterFile)) {
      count = parseInt(fs.readFileSync(counterFile, 'utf-8'), 10) || 0;
    }
    count += 1;
    fs.writeFileSync(counterFile, String(count));
 
    // Passes or fails depending on how many times this has run before —
    // state bleeding across runs/workers instead of being isolated per test.
    expect(count % 2).toBe(0);
  });
});
