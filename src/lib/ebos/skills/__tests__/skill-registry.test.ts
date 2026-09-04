import { describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import skillRegistryJson from "../../../../../skills/ebos/skill-registry.json";
import { EBOS_SKILL_REGISTRY } from "../skill-registry";

describe("EBOS_SKILL_REGISTRY", () => {
  test("contains at least the ten v1 EBOS skills", () => {
    expect(EBOS_SKILL_REGISTRY).toHaveLength(10);
  });

  test("uses unique skill ids", () => {
    const ids = EBOS_SKILL_REGISTRY.map((skill) => skill.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test("defines required evidence kinds for every skill", () => {
    for (const skill of EBOS_SKILL_REGISTRY) {
      expect(Array.isArray(skill.requiredEvidenceKinds)).toBe(true);
    }
  });

  test("matches the JSON skill registry ids", () => {
    const tsIds = EBOS_SKILL_REGISTRY.map((skill) => skill.id).sort();
    const jsonIds = skillRegistryJson.skills.map((skill) => skill.id).sort();

    expect(tsIds).toEqual(jsonIds);
  });

  test("points every skill path at a SKILL.md file", () => {
    for (const skill of EBOS_SKILL_REGISTRY) {
      expect(skill.skillPath).toMatch(/^skills\/ebos\/.+\/SKILL\.md$/);
      expect(existsSync(join(process.cwd(), skill.skillPath))).toBe(true);
    }
  });
});
