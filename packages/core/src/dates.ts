import { DEFAULT_TIME_ZONE, type LocalDate } from '@matriq/types';

const MS_PER_DAY = 86_400_000;
/** Fixed UTC offset used if the runtime lacks Intl time-zone data. */
const FALLBACK_OFFSET_MS: Record<string, number> = { [DEFAULT_TIME_ZONE]: 3 * 3_600_000 };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** Offset of `timeZone` from UTC at the given instant, in milliseconds. */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  try {
    const parts = partsFormatter(timeZone).formatToParts(instant);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const asUtc = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') % 24,
      get('minute'),
      get('second'),
    );
    const offset = asUtc - Math.floor(instant.getTime() / 1000) * 1000;
    if (Number.isFinite(offset)) return offset;
  } catch {
    // Fall through to the fixed fallback below.
  }
  return FALLBACK_OFFSET_MS[timeZone] ?? 0;
}

/** The calendar date of `instant` in `timeZone`, as `YYYY-MM-DD`. */
export function toLocalDate(instant: Date, timeZone: string = DEFAULT_TIME_ZONE): LocalDate {
  const shifted = new Date(instant.getTime() + timeZoneOffsetMs(instant, timeZone));
  return shifted.toISOString().slice(0, 10);
}

/** Adds whole days to a `YYYY-MM-DD` date. */
export function addDays(date: LocalDate, days: number): LocalDate {
  const ms = Date.parse(`${date}T00:00:00Z`) + days * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday for a `YYYY-MM-DD` date. */
export function dayOfWeek(date: LocalDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Converts a wall-clock time in `timeZone` to a UTC instant. */
export function zonedTimeToUtc(date: LocalDate, time: string, timeZone: string): Date {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const wallClockAsUtc = Date.parse(`${date}T00:00:00Z`) + (hours * 60 + minutes) * 60_000;
  let utc = wallClockAsUtc - timeZoneOffsetMs(new Date(wallClockAsUtc), timeZone);
  // Re-check once in case the guess crossed a daylight-saving boundary.
  const corrected = wallClockAsUtc - timeZoneOffsetMs(new Date(utc), timeZone);
  if (corrected !== utc) utc = corrected;
  return new Date(utc);
}

/** Part of the day, used for greetings. */
export function partOfDay(instant: Date, timeZone: string): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date(instant.getTime() + timeZoneOffsetMs(instant, timeZone)).getUTCHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
