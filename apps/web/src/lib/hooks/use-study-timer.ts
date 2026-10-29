'use client';

import { useEffect, useRef } from 'react';
import { useMatriq } from '../api';
import { ActiveTimeTracker } from '../study-time';

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'wheel', 'touchstart'] as const;

/**
 * Records active study time for a chapter via `api.recordStudyTime`. Time only
 * counts while the tab is visible and the student is active; pending time is
 * flushed periodically, when the tab is hidden and when the screen unmounts.
 */
export function useStudyTimer(chapterId: string | undefined) {
  const { api, invalidateLearnerData } = useMatriq();
  const latest = useRef({ api, invalidateLearnerData });
  useEffect(() => {
    latest.current = { api, invalidateLearnerData };
  }, [api, invalidateLearnerData]);

  useEffect(() => {
    if (!chapterId) return;
    const tracker = new ActiveTimeTracker();

    const flush = () => {
      const chunks = tracker.take();
      if (chunks.length === 0) return;
      const { api: current, invalidateLearnerData: invalidate } = latest.current;
      void Promise.all(chunks.map((seconds) => current.recordStudyTime({ seconds, chapterId })))
        // Mark stale without refetching the lesson the student is reading.
        .then(() => invalidate({ refetch: false }))
        .catch(() => undefined);
    };

    const onActivity = () => tracker.activity();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
      else tracker.activity();
    };

    const interval = window.setInterval(() => {
      if (tracker.tick(document.visibilityState === 'visible')) flush();
    }, 1000);
    for (const e of ACTIVITY_EVENTS) window.addEventListener(e, onActivity, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      window.clearInterval(interval);
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, onActivity);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [chapterId]);
}
