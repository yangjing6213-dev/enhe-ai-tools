import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(relativePath: string) {
  const path = join(projectRoot, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const componentPath =
  "src/components/redesign/home/EnheRedesignProductShowcase.tsx";
describe("production home product instant carousel", () => {
  it("switches products immediately and removes the old slide animation", () => {
    const component = readProjectFile(componentPath);

    expect(component).toContain("indexRef.current");
    expect(component).toContain("setIndex(nextIndex)");
    expect(component).toContain("key={product.id}");
    expect(component).not.toContain('from "motion/react"');
    expect(component).not.toContain("animate(");
    expect(component).not.toContain("data-motion-variant=");
    expect(component).not.toContain("previousIndex");
    expect(component).toContain("data-product-current");
    expect(component).not.toMatch(/setInterval/i);
    expect(component).toContain("window.clearTimeout(timer)");
    expect(component).toContain("[index, isAutoRotating, move]");
  });

  it("keeps formal SSR, keyboard focus, and live-region semantics scoped to the stage", () => {
    const component = readProjectFile(componentPath);

    expect(component).toContain("aria-controls={panelId}");
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain('aria-atomic="true"');
    expect(component).toContain('event.key === "ArrowLeft"');
    expect(component).toContain('event.key === "ArrowRight"');
    expect(component).toContain("window.matchMedia(REDUCED_MOTION_QUERY)");
    expect(component).toContain("redesign-home-product-indicators");
    expect(component).not.toContain("redesign-preview/motion");
  });

  it("does not apply presentation motion or hidden animation layers", () => {
    const component = readProjectFile(componentPath);

    expect(component).not.toContain("useLayoutEffect");
    expect(component).not.toContain("data-product-previous");
    expect(component).not.toContain("interruptedIncomingStyle");
  });
});
