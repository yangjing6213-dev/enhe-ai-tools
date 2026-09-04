import { describe, expect, test } from "vitest";
import { getMonthlyWindow, getWeeklyWindow } from "../date-window";

describe("EBOS date windows", () => {
  test("builds a local-time weekly window from Monday start to Sunday end", () => {
    const window = getWeeklyWindow(new Date(2026, 6, 2, 15, 30));

    expect(window.start).toEqual(new Date(2026, 5, 29, 0, 0, 0, 0));
    expect(window.end).toEqual(new Date(2026, 6, 5, 23, 59, 59, 999));
    expect(window.timezone).toBe("local");
  });

  test("keeps Sunday dates in the week that starts on the previous Monday", () => {
    const window = getWeeklyWindow(new Date(2026, 6, 5, 8, 0));

    expect(window.start).toEqual(new Date(2026, 5, 29, 0, 0, 0, 0));
    expect(window.end).toEqual(new Date(2026, 6, 5, 23, 59, 59, 999));
  });

  test("builds a local-time monthly window for the full calendar month", () => {
    const window = getMonthlyWindow(new Date(2026, 1, 12, 11, 0));

    expect(window.start).toEqual(new Date(2026, 1, 1, 0, 0, 0, 0));
    expect(window.end).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999));
    expect(window.timezone).toBe("local");
  });
});

