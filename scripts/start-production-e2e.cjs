const { rmSync } = require("node:fs");
const { join, resolve, sep } = require("node:path");

function clearStandaloneDataCache(root = process.cwd()) {
  const standaloneDir = resolve(root, ".next", "standalone");
  const fetchCacheDir = resolve(
    standaloneDir,
    ".next",
    "cache",
    "fetch-cache",
  );

  if (!fetchCacheDir.startsWith(`${standaloneDir}${sep}`)) {
    throw new Error("Refusing to clear a cache outside the standalone build.");
  }

  rmSync(fetchCacheDir, { recursive: true, force: true });
  return fetchCacheDir;
}

module.exports = { clearStandaloneDataCache };

if (require.main === module) {
  clearStandaloneDataCache();
  require(join(__dirname, "start-standalone.cjs"));
}
