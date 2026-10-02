const { lstatSync, realpathSync, rmSync } = require("node:fs");
const { isAbsolute, join, relative, resolve, sep } = require("node:path");

function isWithinDirectory(parent, candidate) {
  const rel = relative(parent, candidate);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}

function hasOnlyRealPathComponents(root, target) {
  if (!isWithinDirectory(root, target)) {
    throw new Error("Refusing to clear a cache outside the standalone build.");
  }

  let current = root;
  for (const segment of relative(root, target).split(sep).filter(Boolean)) {
    current = join(current, segment);
    let stat;
    try {
      stat = lstatSync(current);
    } catch (error) {
      if (error && error.code === "ENOENT") return false;
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error("Refusing to clear a cache through a symbolic link or junction.");
    }
  }

  return true;
}

function configureStandaloneEnvironment(environment = process.env) {
  const databaseUrlKeys = [
    "DATABASE_URL",
    "DIRECT_URL",
    "SEO_AUDIT_TEST_DATABASE_URL",
  ];

  if (databaseUrlKeys.some((key) => environment[key]?.trim())) {
    throw new Error(
      "The standalone E2E server requires empty database URL variables.",
    );
  }

  for (const key of databaseUrlKeys) {
    environment[key] = "";
  }
  environment.HOSTNAME = "127.0.0.1";
}

function clearStandaloneDataCache(root = process.cwd()) {
  const rootDir = resolve(root);
  const standaloneDir = resolve(rootDir, ".next", "standalone");
  const fetchCacheDir = resolve(
    standaloneDir,
    ".next",
    "cache",
    "fetch-cache",
  );

  if (!hasOnlyRealPathComponents(rootDir, fetchCacheDir)) return fetchCacheDir;

  const standaloneRealDir = realpathSync(standaloneDir);
  const cacheParentRealDir = realpathSync(resolve(fetchCacheDir, ".."));
  if (!isWithinDirectory(standaloneRealDir, cacheParentRealDir)) {
    throw new Error("Refusing to clear a cache outside the standalone build.");
  }

  rmSync(fetchCacheDir, { recursive: true, force: true });
  return fetchCacheDir;
}

module.exports = {
  clearStandaloneDataCache,
  configureStandaloneEnvironment,
};

if (require.main === module) {
  const root = resolve(__dirname, "..");
  configureStandaloneEnvironment(process.env);
  process.chdir(root);
  clearStandaloneDataCache(root);
  require(join(__dirname, "start-standalone.cjs"));
}
