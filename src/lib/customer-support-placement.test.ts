import { describe, expect, it } from "vitest";
import { getSupportLauncherOffset } from "./customer-support-placement";

const resting = { x: 423, y: 784, width: 44, height: 44 };

describe("customer support launcher placement", () => {
  it("keeps its resting position when controls are clear", () => {
    expect(getSupportLauncherOffset(resting, [{ x: 20, y: 784, width: 300, height: 44 }], 844)).toBe(0);
  });

  it("clears the reproduced mobile arrow overlap and the other floating buttons", () => {
    const obstacles = [
      { x: 431, y: 804.046875, width: 32, height: 40 },
      { x: 415, y: 720, width: 44, height: 44 },
      { x: 415, y: 668, width: 44, height: 44 },
    ];
    expect(getSupportLauncherOffset(resting, obstacles, 844)).toBe(168);
  });

  it("chooses the nearest clear gap above a footer entry", () => {
    expect(getSupportLauncherOffset(resting, [{ x: 376, y: 799.9, width: 88, height: 44 }], 844))
      .toBeCloseTo(36.1);
  });

  it("ignores hidden-size and offscreen targets", () => {
    expect(getSupportLauncherOffset(resting, [
      { x: 423, y: 784, width: 0, height: 44 },
      { x: 423, y: 845, width: 44, height: 44 },
      { x: 423, y: -80, width: 44, height: 44 },
    ], 844)).toBe(0);
  });

  it("returns to the resting position as soon as the obstacle leaves", () => {
    const obstacle = { x: 431, y: 804, width: 32, height: 40 };
    expect(getSupportLauncherOffset(resting, [obstacle], 844)).toBeGreaterThan(0);
    expect(getSupportLauncherOffset(resting, [{ ...obstacle, y: 700 }], 844)).toBe(0);
  });

  it("never lifts the button beyond the viewport when there is no available gap", () => {
    expect(getSupportLauncherOffset(resting, [{ x: 420, y: 0, width: 60, height: 844 }], 844)).toBe(0);
  });
});
