import type { EbosDateWindow } from "./types";

const oneDayMs = 24 * 60 * 60 * 1000;

function cloneDate(value: Date) {
  return new Date(value.getTime());
}

/**
 * EBOS v1.0 uses the server/local JavaScript timezone as the reporting
 * boundary. In the current ENHE operating environment this is expected to map
 * to Asia/Shanghai. If the server timezone changes, callers should pass dates
 * already normalized to the intended business timezone.
 */
export function getWeeklyWindow(date: Date): EbosDateWindow {
  const cursor = cloneDate(date);
  cursor.setHours(0, 0, 0, 0);

  const day = cursor.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const start = new Date(cursor.getTime() - daysSinceMonday * oneDayMs);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start.getTime() + 6 * oneDayMs);
  end.setHours(23, 59, 59, 999);

  return { start, end, timezone: "local" };
}

/**
 * EBOS v1.0 monthly windows also use local time boundaries.
 */
export function getMonthlyWindow(date: Date): EbosDateWindow {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

  return { start, end, timezone: "local" };
}

