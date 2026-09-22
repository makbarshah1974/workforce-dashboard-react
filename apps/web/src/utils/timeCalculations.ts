// Time calculation utilities mirroring Flask app's logic
// UAE timezone: UTC+4
const UAE_TZ_OFFSET = 4 * 60 * 60 * 1000; // 4 hours in ms

// Shift times (UAE local time)
const DAY_SHIFT_START_HOUR = 7;  // 07:00
const DAY_SHIFT_END_HOUR = 19;   // 19:00
const HOUR_MS = 60 * 60 * 1000;
const RUN_BREAK_THRESHOLD = 6 * HOUR_MS;    // 6h
const RUN_BREAK_MS = 1 * HOUR_MS;           // 1h break
const DAY_WORK_MS = 9 * HOUR_MS;            // 9h max for downtimes

/**
 * Get current UAE time as Date object
 */
export function nowUAE(): Date {
  return new Date(Date.now() + UAE_TZ_OFFSET);
}

/**
 * Determine shift for a given datetime (UAE local)
 */
export function shiftOf(date: Date | string): 'day' | 'night' {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hour = d.getUTCHours() + 4; // UAE is UTC+4
  if (hour < 0) return 'night';
  if (hour >= 24) return 'night';
  return hour >= DAY_SHIFT_START_HOUR && hour < DAY_SHIFT_END_HOUR ? 'day' : 'night';
}

/**
 * Format duration in milliseconds as H:MM:SS or Dd H:MM:SS
 */
export function formatDurationMs(ms: number): string {
  if (ms < 0) ms = 0;
  const days = Math.floor(ms / (24 * HOUR_MS));
  let rem = ms % (24 * HOUR_MS);
  const hours = Math.floor(rem / HOUR_MS);
  rem = rem % HOUR_MS;
  const minutes = Math.floor(rem / 60000);
  const seconds = Math.floor((rem % 60000) / 1000);
  if (days > 0) return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Split interval [start, end) into day/night seconds (UAE shift boundaries)
 * Returns { daySeconds, nightSeconds }
 */
export function splitDayNight(start: Date, end: Date): { daySeconds: number; nightSeconds: number } {
  let dayS = 0;
  let nightS = 0;
  let cur = new Date(start);

  while (cur < end) {
    // Get day shift boundaries for current date (UAE)
    const dayStart = new Date(cur);
    dayStart.setUTCHours(DAY_SHIFT_START_HOUR - 4, 0, 0, 0); // 07:00 UAE = 03:00 UTC
    const dayEnd = new Date(cur);
    dayEnd.setUTCHours(DAY_SHIFT_END_HOUR - 4, 0, 0, 0);     // 19:00 UAE = 15:00 UTC

    if (cur < dayStart) {
      // In night before day shift
      const segEnd = dayStart < end ? dayStart : end;
      nightS += segEnd.getTime() - cur.getTime();
      cur = segEnd;
    } else if (cur < dayEnd) {
      // In day shift
      const segEnd = dayEnd < end ? dayEnd : end;
      dayS += segEnd.getTime() - cur.getTime();
      cur = segEnd;
    } else {
      // In night after day shift, until next 07:00
      const nextDayStart = new Date(dayStart);
      nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
      const segEnd = nextDayStart < end ? nextDayStart : end;
      nightS += segEnd.getTime() - cur.getTime();
      cur = segEnd;
    }
  }

  return { daySeconds: dayS, nightSeconds: nightS };
}

/**
 * Effective running time per shift half: -1h break if >6h (max 11h)
 * No 9h cap on running time ever.
 */
export function effRunHalf(seconds: number): number {
  if (seconds > RUN_BREAK_THRESHOLD) {
    return seconds - RUN_BREAK_MS;
  }
  return seconds;
}

/**
 * Effective downtime (idle/breakdown/maintenance): day shift only, max 9h per shift-day
 */
export function effDownDay(seconds: number): number {
  return Math.min(seconds, DAY_WORK_MS);
}

/**
 * Get shift-day bounds for a given date
 * Shift-day D: 07:00 (D) -> 07:00 (D+1)
 * Returns { dayStart, dayEnd, nextDayStart } as Date objects (UTC)
 */
export function shiftDayBounds(date: Date): { dayStart: Date; dayEnd: Date; nextDayStart: Date } {
  const dayStart = new Date(date);
  dayStart.setUTCHours(DAY_SHIFT_START_HOUR - 4, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(DAY_SHIFT_END_HOUR - 4, 0, 0, 0);
  const nextDayStart = new Date(dayStart);
  nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
  return { dayStart, dayEnd, nextDayStart };
}

/**
 * Split interval into per-shift-day buckets
 * Returns Map<shiftDayDateISO, { daySeconds, nightSeconds }>
 */
export function splitShiftDay(segStart: Date, segEnd: Date): Map<string, { daySeconds: number; nightSeconds: number }> {
  const out = new Map<string, { daySeconds: number; nightSeconds: number }>();
  let cur = new Date(segStart);

  while (cur < segEnd) {
    // Shift-day containing `cur`
    const base = new Date(cur);
    let { dayStart, dayEnd, nextDayStart } = shiftDayBounds(base);

    if (cur < dayStart) {
      const prev = new Date(base);
      prev.setUTCDate(prev.getUTCDate() - 1);
      const prevBounds = shiftDayBounds(prev);
      dayStart = prevBounds.dayStart;
      dayEnd = prevBounds.dayEnd;
      nextDayStart = prevBounds.nextDayStart;
    }

    const segEnd2 = nextDayStart < segEnd ? nextDayStart : segEnd;
    const key = dayStart.toISOString().split('T')[0];
    const { daySeconds, nightSeconds } = splitDayNight(cur, segEnd2);

    const existing = out.get(key) || { daySeconds: 0, nightSeconds: 0 };
    existing.daySeconds += daySeconds;
    existing.nightSeconds += nightSeconds;
    out.set(key, existing);

    cur = segEnd2;
  }

  return out;
}

/**
 * Correct a raw bucket into effective seconds (SIMPLE rules)
 * Running: day_eff + night_eff (each half -1h if >6h)
 * Idle/out_of_order/maintenance: only day shift, capped at 9h per shift-day
 */
export function correctBucket(raw: {
  running_day: number;
  running_night: number;
  idle: number;
  out_of_order: number;
  maintenance: number;
}): { running: number; idle: number; out_of_order: number; maintenance: number } {
  return {
    running: effRunHalf(raw.running_day) + effRunHalf(raw.running_night),
    idle: effDownDay(raw.idle),
    out_of_order: effDownDay(raw.out_of_order),
    maintenance: effDownDay(raw.maintenance),
  };
}

/**
 * Format date as dd/mm/yyyy
 */
export function formatDateDDMMYYYY(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parse dd/mm/yyyy or yyyy-mm-dd to Date (UAE midnight)
 */
export function parseDateFlexible(s: string): Date | null {
  if (!s) return null;
  const parts = s.replace('-', '/').split('/');
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      // dd/mm/yyyy
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day, -4, 0, 0)); // 00:00 UAE = 20:00 UTC previous day
      return isNaN(d.getTime()) ? null : d;
    }
    // yyyy-mm-dd
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(Date.UTC(year, month, day, -4, 0, 0));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Coerce to int
 */
export function toInt(v: unknown, defaultVal = 0): number {
  if (v === null || v === undefined || v === '') return defaultVal;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? defaultVal : n;
}

/**
 * Coerce to float
 */
export function toFloat(v: unknown, defaultVal = 0): number {
  if (v === null || v === undefined || v === '') return defaultVal;
  const s = String(v).replace(',', '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? defaultVal : n;
}

/**
 * Round to 2 decimals
 */
export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}