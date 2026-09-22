import { format, formatDistanceToNow, parseISO, isToday, isYesterday, startOfDay } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kolkata';

export function formatDate(date: string | Date, pattern = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const zoned = toZonedTime(d, TIMEZONE);
  return formatTz(zoned, pattern, { timeZone: TIMEZONE });
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd MMM yyyy, HH:mm');
}

export function formatTime(date: string | Date): string {
  return formatDate(date, 'HH:mm');
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDayHeader(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const zoned = toZonedTime(d, TIMEZONE);
  const today = startOfDay(toZonedTime(new Date(), TIMEZONE));
  const target = startOfDay(zoned);

  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === today.getTime() - 86400000) return 'Yesterday';
  return formatTz(zoned, 'EEEE, dd MMM', { timeZone: TIMEZONE });
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}