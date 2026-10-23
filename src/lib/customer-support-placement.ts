type SupportRect = { x: number; y: number; width: number; height: number };

// Keep the approved resting position whenever it is clear. Only lift the
// launcher into a visible gap; never change the surrounding page layout.
export function getSupportLauncherOffset(
  resting: SupportRect,
  obstacles: SupportRect[],
  viewportHeight: number,
): number {
  const gap = 8;
  const relevant = obstacles.filter((rect) =>
    rect.width > 0 && rect.height > 0 &&
    rect.y < viewportHeight && rect.y + rect.height > 0 &&
    rect.x < resting.x + resting.width && rect.x + rect.width > resting.x,
  );
  const candidates = [resting.y, ...relevant.map((rect) => rect.y - resting.height - gap)]
    .filter((top) => top >= gap && top <= resting.y)
    .sort((left, right) => right - left);

  for (const top of candidates) {
    if (relevant.every((rect) => top + resting.height <= rect.y || top >= rect.y + rect.height)) {
      return resting.y - top;
    }
  }
  return 0;
}
