import type { MatriqApi } from '@matriq/api-client';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState } from 'react-native';

/** `recordStudyTime` accepts at most this many seconds per call. */
export const MAX_SECONDS_PER_CALL = 1800;
/** Long reading sessions are saved periodically, not only when leaving. */
export const FLUSH_INTERVAL_MS = 5 * 60_000;

export interface StudyTimer {
  /** The screen is visible and the app is in the foreground. */
  resume(): void;
  /** Leaving the screen or the app going to the background. */
  pause(): void;
  /** Report accumulated whole seconds (split into ≤1800s chunks). */
  flush(): void;
}

/**
 * Counts active study time. Only time between `resume` and `pause` counts,
 * so a backgrounded app or a screen hidden under another never inflates it.
 */
export function createStudyTimer(
  record: (seconds: number) => void,
  now: () => number = Date.now,
): StudyTimer {
  let startedAt: number | null = null;
  let pendingMs = 0;

  function collect() {
    if (startedAt !== null) {
      const t = now();
      pendingMs += Math.max(0, t - startedAt);
      startedAt = t;
    }
  }

  return {
    resume() {
      if (startedAt === null) startedAt = now();
    },
    pause() {
      collect();
      startedAt = null;
      this.flush();
    },
    flush() {
      collect();
      let seconds = Math.floor(pendingMs / 1000);
      pendingMs -= seconds * 1000;
      while (seconds > 0) {
        const chunk = Math.min(MAX_SECONDS_PER_CALL, seconds);
        seconds -= chunk;
        record(chunk);
      }
    },
  };
}

/**
 * Records active study time on the focused screen via `api.recordStudyTime`;
 * pauses when the screen loses focus or the app leaves the foreground.
 */
export function useStudyTimer(
  api: MatriqApi,
  chapterId: string | undefined,
  onRecorded?: () => void,
) {
  useFocusEffect(
    useCallback(() => {
      if (!chapterId) return undefined;
      const timer = createStudyTimer((seconds) => {
        api
          .recordStudyTime({ seconds, chapterId })
          .then(() => onRecorded?.())
          .catch(() => undefined);
      });
      if (AppState.currentState === 'active' || AppState.currentState == null) timer.resume();
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') timer.resume();
        else timer.pause();
      });
      const interval = setInterval(() => timer.flush(), FLUSH_INTERVAL_MS);
      return () => {
        sub.remove();
        clearInterval(interval);
        timer.pause();
      };
    }, [api, chapterId, onRecorded]),
  );
}
