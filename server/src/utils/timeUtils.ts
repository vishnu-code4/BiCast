// ============================================================
// Time utilities
// ============================================================

/**
 * Parse a "HH:MM" time string and apply it to a given date (UTC)
 */
export function applyTimeToDate(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0);
  return result;
}

/**
 * Add seconds to a Date object.
 */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

/**
 * Format a Date to ISO string rounded to the nearest hour (for weather lookup).
 */
export function roundToNearestHour(date: Date): Date {
  const rounded = new Date(date);
  rounded.setMinutes(0, 0, 0);
  // Round up if past 30 min mark
  if (date.getMinutes() >= 30) {
    rounded.setHours(rounded.getHours() + 1);
  }
  return rounded;
}

/**
 * Format datetime to YYYY-MM-DD
 */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

/**
 * Format datetime to HH:MM
 */
export function toTimeString(date: Date): string {
  return date.toISOString().split('T')[1]?.substring(0, 5) ?? '00:00';
}
