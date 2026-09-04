import { describe, expect, test } from "vitest";
import {
  createEvidenceFileName,
  getEvidenceDirectory,
  isEvidenceJsonFile,
  parseEvidenceFileName
} from "../evidence-file-naming";

describe("evidence file naming", () => {
  test("creates evidence file names using the contract naming rule", () => {
    expect(createEvidenceFileName("health_snapshot", "2026-07-03", "json")).toBe("2026-07-03-health_snapshot.json");
    expect(createEvidenceFileName("weekly_report", new Date("2026-07-03T12:00:00+08:00"), ".json")).toBe("2026-07-03-weekly_report.json");
  });

  test("parses evidence file names", () => {
    expect(parseEvidenceFileName("2026-07-03-health_snapshot.json")).toEqual({
      targetDate: "2026-07-03",
      kind: "health_snapshot",
      ext: "json"
    });
  });

  test("identifies json evidence files", () => {
    expect(isEvidenceJsonFile("2026-07-03-health_snapshot.json")).toBe(true);
    expect(isEvidenceJsonFile("2026-07-03-weekly_report.md")).toBe(false);
    expect(isEvidenceJsonFile("not-evidence.json")).toBe(false);
  });

  test("returns the evidence directory for a kind", () => {
    expect(getEvidenceDirectory("data_source_readiness")).toBe("reports/ebos/evidence/data_source_readiness");
  });
});
