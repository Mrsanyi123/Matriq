import type { Reminder, UpcomingReminder } from '@matriq/validation';
import { addDays, dayOfWeek, toLocalDate, zonedTimeToUtc } from './dates';

/** The next time a reminder fires after `now`, or null if disabled. */
export function nextOccurrence(
  reminder: Pick<Reminder, 'daysOfWeek' | 'localTime' | 'timeZone' | 'enabled'>,
  now: Date,
): Date | null {
  if (!reminder.enabled || reminder.daysOfWeek.length === 0) return null;
  const today = toLocalDate(now, reminder.timeZone);
  for (let i = 0; i <= 7; i++) {
    const date = addDays(today, i);
    if (!reminder.daysOfWeek.includes(dayOfWeek(date))) continue;
    const at = zonedTimeToUtc(date, reminder.localTime, reminder.timeZone);
    if (at.getTime() > now.getTime()) return at;
  }
  return null;
}

/** The soonest upcoming reminder across a student's schedule. */
export function nextReminder(reminders: readonly Reminder[], now: Date): UpcomingReminder | null {
  let best: UpcomingReminder | null = null;
  let bestTime = Infinity;
  for (const r of reminders) {
    const at = nextOccurrence(r, now);
    if (at && at.getTime() < bestTime) {
      bestTime = at.getTime();
      best = { id: r.id, title: r.title, subjectSlug: r.subjectSlug, nextAt: at.toISOString() };
    }
  }
  return best;
}
