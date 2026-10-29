/** Upper bound accepted by `recordStudyTime` per call. */
export const MAX_STUDY_SECONDS_PER_CALL = 1800;
/** Without input for this long, the student is treated as away. */
export const IDLE_AFTER_MS = 90_000;
/** Accumulated active time is flushed at least this often. */
export const FLUSH_EVERY_SECONDS = 120;

/**
 * Counts active study seconds: one per tick while the tab is visible and the
 * student interacted recently. Pure and clock-injectable for tests.
 */
export class ActiveTimeTracker {
  private pending = 0;
  private lastActivity: number;

  constructor(
    private readonly now: () => number = Date.now,
    private readonly idleAfterMs: number = IDLE_AFTER_MS,
  ) {
    this.lastActivity = now();
  }

  activity() {
    this.lastActivity = this.now();
  }

  /** Call once per second. Returns true when a flush is due. */
  tick(visible: boolean): boolean {
    if (visible && this.now() - this.lastActivity <= this.idleAfterMs) this.pending += 1;
    return this.pending >= FLUSH_EVERY_SECONDS;
  }

  get pendingSeconds() {
    return this.pending;
  }

  /** Takes the pending seconds, split into API-sized chunks. */
  take(): number[] {
    let left = this.pending;
    this.pending = 0;
    const chunks: number[] = [];
    while (left > 0) {
      const chunk = Math.min(left, MAX_STUDY_SECONDS_PER_CALL);
      chunks.push(chunk);
      left -= chunk;
    }
    return chunks;
  }
}
