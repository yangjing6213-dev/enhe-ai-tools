#!/usr/bin/env python3
"""Exercise the real runner permission step against restrictive Linux COPY modes.

Requires a local node:24-alpine image and Docker; never pulls or uses the network.
The small synthetic image contains no application data or production mounts.
"""

import json
import argparse
import pathlib
import re
import subprocess
import tempfile
import uuid


ROOT = pathlib.Path(__file__).resolve().parents[1]
RUN_ID = uuid.uuid4().hex
IMAGE = f"enhe-runtime-permissions-test:{RUN_ID}"
LABEL = "com.enhe.runtime-permissions-test"


def docker(*args, check=True):
    return subprocess.run(["docker", *args], check=check, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dockerfile", type=pathlib.Path,
                        default=ROOT / "deploy/enhe-ai-tools/Dockerfile")
    source = parser.parse_args().dockerfile.read_text(encoding="utf-8")
    runner = source.split("FROM node:24-alpine AS runner", 1)[1]
    # Execute the actual final RUN instruction, rather than reimplement its fix.
    steps = re.findall(r"^RUN (?:[^\n]*\\\n)*[^\n]*", runner, re.MULTILINE)
    permission_step = steps[-1]
    assert "app-entrypoint.sh" in permission_step and "chown" in permission_step
    assert re.search(r"^USER node$", runner, re.MULTILINE), "runtime must remain non-root"
    base = "node:24-alpine"
    docker("image", "inspect", base)  # Fail before build when the local base is absent.
    with tempfile.TemporaryDirectory(prefix="enhe-runtime-permissions-") as temp:
        context = pathlib.Path(temp)
        app = context / "fixture-app"
        readable = [
            "deploy/enhe-ai-tools/scripts/seo-audit-worker.mjs",
            "deploy/enhe-ai-tools/scripts/seo-audit-scheduler.mjs",
            "public/fonts/rounded.woff2", "public/cover.webp",
            ".next/static/chunks/site.js", ".next/server/app/page.js",
            "src/lib/runtime.ts", "scripts/maintenance.mjs",
            "prisma/schema.prisma", "node_modules/example/index.js",
            "package.json", "package-lock.json", "tsconfig.json", "app-entrypoint.sh",
        ]
        for name in readable:
            path = app / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("{}\n" if name.endswith(".json") else "fixture\n", encoding="utf-8")
        for role in ["worker", "scheduler"]:
            (app / f"deploy/enhe-ai-tools/scripts/seo-audit-{role}.mjs").write_text(
                f"console.log('{role} program readable');\n", encoding="utf-8")
        (app / "app-entrypoint.sh").write_text(
            (ROOT / "deploy/enhe-ai-tools/scripts/app-entrypoint.sh").read_text(encoding="utf-8"),
            encoding="utf-8", newline="\n")
        tool = app / "node_modules/.bin/fixture-tool"
        tool.parent.mkdir(parents=True)
        tool.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8", newline="\n")
        writable = [".next/cache", "runtime", "logs", "public/uploads",
                    "private-uploads", "private-uploads/forum-media"]
        # .next retains its pre-existing writable ISR cache contract; all source,
        # dependencies and public assets must remain owned by root and unwritable.
        immutable = [p for p in readable if not p.startswith(".next/")]
        verification = """const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
assert.equal(process.getuid(), 1000);
for (const name of READABLE) fs.readFileSync('/app/' + name);
for (const name of IMMUTABLE) {
  const path = '/app/' + name;
  assert.equal(fs.statSync(path).uid, 0, 'source owner: ' + name);
  assert.throws(() => fs.accessSync(path, fs.constants.W_OK), 'source writable: ' + name);
}
for (const name of WRITABLE) {
  const path = '/app/' + name + '/fixture-write';
  fs.writeFileSync(path, 'ok'); fs.unlinkSync(path);
}
for (const role of ['worker', 'scheduler']) {
  const result = execFileSync(process.execPath,
    ['/app/deploy/enhe-ai-tools/scripts/seo-audit-' + role + '.mjs'], {encoding: 'utf8'});
  assert.match(result, /program readable/);
}
execFileSync('/app/node_modules/.bin/fixture-tool');
console.log('PASS: UID 1000 reads restrictive COPY artifacts; source stays root-owned/read-only; cache and uploads writable');
"""
        verification = verification.replace("READABLE", json.dumps(readable))
        verification = verification.replace("IMMUTABLE", json.dumps(immutable))
        verification = verification.replace("WRITABLE", json.dumps(writable))
        (app / "server.js").write_text(verification, encoding="utf-8")
        dockerfile = f"""FROM {base} AS restrictive
WORKDIR /app
COPY fixture-app /app
RUN find /app -type d -exec chmod 700 {{}} + \\
    && find /app -type f -exec chmod 600 {{}} + \\
    && chmod 700 /app/node_modules/.bin/fixture-tool
FROM {base}
WORKDIR /app
LABEL {LABEL}={RUN_ID}
COPY --from=restrictive /app /app
{permission_step}
USER node
CMD ["./app-entrypoint.sh"]
"""
        (context / "Dockerfile").write_text(dockerfile, encoding="utf-8")
        try:
            built = docker("build", "--pull=false", "--network=none", "--quiet", "-t", IMAGE, str(context), check=False)
            if built.returncode:
                raise RuntimeError(built.stderr)
            result = docker("run", "--rm", "--network=none", "--cap-drop=ALL",
                            "--security-opt=no-new-privileges:true", "--pids-limit=64",
                            "--memory=128m", IMAGE, check=False)
            print(result.stdout, end="")
            if result.returncode:
                raise RuntimeError(result.stderr or f"fixture exited {result.returncode}")
        finally:
            owned = docker("image", "inspect", IMAGE, check=False)
            if owned.returncode == 0:
                metadata = json.loads(owned.stdout)[0]
                if metadata["Config"]["Labels"].get(LABEL) == RUN_ID:
                    docker("image", "rm", IMAGE)


if __name__ == "__main__":
    main()
