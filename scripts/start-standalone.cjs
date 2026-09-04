const { cpSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");

function copyStandaloneAsset(relativePath) {
  const source = join(root, relativePath);
  const target = join(standaloneDir, relativePath);

  if (!existsSync(source)) {
    throw new Error(`Missing standalone asset source: ${relativePath}. Run npm run build first.`);
  }

  cpSync(source, target, { recursive: true, force: true });
}

if (!existsSync(join(standaloneDir, "server.js"))) {
  throw new Error("Missing .next/standalone/server.js. Run npm run build before npm run start.");
}

copyStandaloneAsset(".next/static");
copyStandaloneAsset("public");

require(join(standaloneDir, "server.js"));
