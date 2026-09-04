import { describe, expect, test } from "vitest";
import { calculateWeightedScore, getScoreGrade, normalizeScore } from "../score";

describe("EBOS score helpers", () => {
  test("normalizes scores into the 0-100 interval and rejects invalid values", () => {
    expect(normalizeScore(120)).toBe(100);
    expect(normalizeScore(-5)).toBe(0);
    expect(normalizeScore(72.5)).toBe(72.5);
    expect(normalizeScore(Number.NaN)).toBeNull();
    expect(normalizeScore(null)).toBeNull();
  });

  test("maps normalized scores to EBOS health grades", () => {
    expect(getScoreGrade(92)).toBe("excellent");
    expect(getScoreGrade(74)).toBe("good");
    expect(getScoreGrade(55)).toBe("warning");
    expect(getScoreGrade(24)).toBe("critical");
    expect(getScoreGrade(null)).toBe("unknown");
  });

  test("calculates weighted scores while ignoring unknown sections", () => {
    expect(
      calculateWeightedScore([
        { score: 80, weight: 2 },
        { score: 40, weight: 1 },
        { score: null, weight: 10 }
      ])
    ).toBeCloseTo(66.67, 2);
  });

  test("returns null when no valid weighted score can be calculated", () => {
    expect(calculateWeightedScore([{ score: null, weight: 1 }])).toBeNull();
    expect(calculateWeightedScore([{ score: 50, weight: 0 }])).toBeNull();
  });
});

