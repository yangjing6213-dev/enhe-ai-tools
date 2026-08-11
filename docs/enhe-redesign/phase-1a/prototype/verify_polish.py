#!/usr/bin/env python3
"""Verify the approved Phase 1A.2 visual-polish contract with stdlib only."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


PROTOTYPE = Path(__file__).resolve().parent
PHASE = PROTOTYPE.parent
ROOT = PHASE.parents[2]
ASSETS = PROTOTYPE / "assets" / "product-media"
MANIFEST = PROTOTYPE / "assets" / "product-media-manifest.json"
NEW_COPY = "Let everyone use AI to create what once felt out of reach."
OLD_COPY = "Give every ordinary person the help of AI to create what used to be out of reach."
HOME_MEDIA = {
    "无所不能版｜AI生成视频应用": "ultimate-edition.png",
    "InfiniteTalk": "infinitetalk.png",
    "AI语音生成": "ai-voice.png",
    "Lumi-OS": "lumi-os.png",
    "FaceSwap Studio": "faceswap-studio.png",
}
SCREENSHOTS = {
    "zh-home-1440.png": 1440, "zh-home-390.png": 390,
    "zh-software-1440.png": 1440, "zh-software-390.png": 390,
    "zh-signin-1440.png": 1440, "zh-signin-390.png": 390,
    "en-home-1440.png": 1440, "en-home-390.png": 390,
    "en-software-1440.png": 1440, "en-software-390.png": 390,
    "en-signin-1440.png": 1440, "en-signin-390.png": 390,
}


class Checks:
    def __init__(self) -> None:
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.lines: list[str] = []

    def check(self, name: str, condition: bool, detail: str = "") -> None:
        self.total += 1
        if condition:
            self.passed += 1
            self.lines.append(f"PASS {name}")
        else:
            self.failed += 1
            suffix = f": {detail}" if detail else ""
            self.lines.append(f"FAIL {name}{suffix}")


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.is_file() else ""


def png_size(path: Path) -> tuple[int, int] | None:
    try:
        data = path.read_bytes()[:24]
    except OSError:
        return None
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        return None
    return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def main() -> int:
    checks = Checks()
    zh_home = read(PROTOTYPE / "zh" / "home.html")
    en_home = read(PROTOTYPE / "en" / "home.html")
    zh_software = read(PROTOTYPE / "zh" / "software.html")
    en_software = read(PROTOTYPE / "en" / "software.html")
    zh_signin = read(PROTOTYPE / "zh" / "signin.html")
    en_signin = read(PROTOTYPE / "en" / "signin.html")
    css = read(PROTOTYPE / "styles.css")
    js = read(PROTOTYPE / "prototype.js")
    polish_doc = read(PHASE / "14-PHASE-1A-2-VISUAL-POLISH.md")
    acceptance_doc = read(PHASE / "15-PHASE-1A-2-ACCEPTANCE.md")

    checks.check("exact final English value copy", NEW_COPY in en_home)
    checks.check("old English value copy absent", OLD_COPY not in "\n".join(read(path) for path in PHASE.rglob("*.md")) and OLD_COPY not in en_home)
    checks.check("Chinese value copy unchanged", "让每一个普通人，都能借助 AI，创造过去做不到的事。" in zh_home)
    checks.check("five Chinese home media nodes", zh_home.count('data-product-media') == 5)
    checks.check("five English home media nodes", en_home.count('data-product-media') == 5)
    checks.check("home media fixed dimensions", zh_home.count('width="1672" height="941"') == 5 and en_home.count('width="1672" height="941"') == 5)
    checks.check("home and card media reserve 16:9", ".product-cover{aspect-ratio:16/9" in css and ".card-cover{aspect-ratio:16/9" in css)
    checks.check("media fallback behavior", "showFallback" in js and "media-failed" in js and "image.hidden = true" in js)

    for product, filename in HOME_MEDIA.items():
        local_url = f"../assets/product-media/{filename}"
        checks.check(f"home media path: {product}", local_url in zh_home and local_url in en_home)
        checks.check(f"home media file: {product}", (ASSETS / filename).is_file())

    try:
        manifest = json.loads(read(MANIFEST))
    except (json.JSONDecodeError, OSError) as exc:
        manifest = []
        checks.check("media manifest parses", False, str(exc))
    else:
        checks.check("media manifest parses", isinstance(manifest, list))
    checks.check("media manifest has seven entries", len(manifest) == 7, f"count={len(manifest)}")
    manifest_names = " ".join(str(item.get("productName", "")) for item in manifest)
    checks.check("manifest includes all five home products", all(name in manifest_names for name in HOME_MEDIA))
    checks.check("manifest publicAsset flags", bool(manifest) and all(item.get("publicAsset") is True for item in manifest))
    checks.check("manifest delivery-data flags", bool(manifest) and all(item.get("containsDeliveryData") is False for item in manifest))
    checks.check("manifest source allowlist", bool(manifest) and all(str(item.get("sourcePathOrUrl", "")).startswith("https://www.enhe-tech.com.cn/") for item in manifest))
    manifest_files_ok = True
    manifest_hashes_ok = True
    for item in manifest:
        path = PHASE / str(item.get("localPath", ""))
        manifest_files_ok &= path.is_file()
        manifest_hashes_ok &= path.is_file() and sha256(path) == str(item.get("sha256", "")).upper()
    checks.check("manifest local files exist", manifest_files_ok)
    checks.check("manifest SHA-256 values", manifest_hashes_ok)

    source_surface = "\n".join((zh_home, en_home, zh_software, en_software, zh_signin, en_signin, css, js))
    lower_surface = source_surface.lower()
    checks.check("no TypeShare remote assets", "typeshare.co" not in lower_surface)
    checks.check("no fileUrl field", "fileurl" not in lower_surface)
    checks.check("no filePath field", "filepath" not in lower_surface)
    checks.check("forbidden delivery strings absent", not any(value in lower_surface for value in ("privatekey", "signedurl", "/api/download", "oauth/callback")))
    checks.check("all prototype image URLs are local", "https://www.enhe-tech.com.cn/api/uploads/" not in source_surface)

    checks.check("desktop label contract documented", "P1" in polish_doc and "桌面端" in polish_doc and "品牌区域" in polish_doc)
    checks.check("mobile label contract documented", "移动端" in polish_doc and "H1 上方" in polish_doc)
    checks.check("label DOM copies marked", all(page.count('data-brand-label="header"') == 1 and page.count('data-brand-label="hero"') == 1 for page in (zh_home, en_home)))
    checks.check("label state synchronized by matchMedia", "mobilePolishQuery" in js and "aria-hidden" in js and "label.hidden" in js)
    checks.check("label breakpoint is below 768", "matchMedia('(max-width: 767px)')" in js and "@media(max-width:767px)" in css)

    for locale, signin in (("zh", zh_signin), ("en", en_signin)):
        checks.check(f"Google inline icon: {locale}", "Google" in signin and 'class="provider-icon"' in signin and 'aria-hidden="true"' in signin)
        checks.check(f"GitHub inline icon: {locale}", "GitHub" in signin and signin.count('class="provider-icon"') == 2)
        checks.check(f"provider button accessible text: {locale}", signin.count('<button class="provider-button" type="button">') == 2 and signin.count("<span>") >= 2)
    checks.check("provider icons use no CDN", "<script" not in zh_signin.split('<script src="../prototype.js"')[0].lower() and "http" not in "".join(part for part in zh_signin.split() if "provider-icon" in part))
    checks.check("provider icon size token", ".provider-icon{width:20px;height:20px" in css)

    for locale, software in (("zh", zh_software), ("en", en_software)):
        checks.check(f"new-release horizontal marker: {locale}", 'data-horizontal-cards="new"' in software)
        checks.check(f"featured horizontal marker: {locale}", 'data-horizontal-cards="featured"' in software)
        checks.check(f"all-products single-column marker: {locale}", 'data-mobile-layout="single-column"' in software)
        checks.check(f"new-release real media count: {locale}", software.split('data-horizontal-cards="new"', 1)[1].split("</section>", 1)[0].count('data-product-media') == 4)
        checks.check(f"featured real media count: {locale}", software.split('data-horizontal-cards="featured"', 1)[1].split("</section>", 1)[0].count('data-product-media') == 3)
    checks.check("mobile overflow-x marker", "overflow-x:auto" in css)
    checks.check("mobile scroll-snap container", "scroll-snap-type:x mandatory" in css)
    checks.check("mobile scroll-snap cards", "scroll-snap-align:start" in css)
    checks.check("mobile card width ranges", "flex:0 0 80vw" in css and "flex:0 0 84vw" in css)
    checks.check("mobile all-products one column", "@media(max-width:767px)" in css and ".all-products-grid{grid-template-columns:1fr}" in css)
    checks.check("horizontal cards keyboard support", "data-horizontal-cards" in js and "ArrowLeft" in js and "ArrowRight" in js and "scrollBy" in js)
    checks.check("horizontal cards do not auto-scroll", "setInterval(() =>" not in js.split("data-horizontal-cards", 1)[1].split("const menuButton", 1)[0])

    contract = subprocess.run([sys.executable, str(PROTOTYPE / "verify_contract.py")], cwd=ROOT, capture_output=True, text=True)
    checks.check("original contract verifier passes", contract.returncode == 0 and "FAILED=0" in contract.stdout, contract.stdout[-300:])
    checks.check("Phase 1A.2 polish document exists", bool(polish_doc))
    checks.check("Phase 1A.2 acceptance document exists", bool(acceptance_doc))
    checks.check("user and Phase 1B gates retained", all(value in polish_doc + acceptance_doc for value in ("PHASE_1A_USER_APPROVAL=PENDING", "PHASE_1B_STATUS=NOT_READY")))

    screenshot_sizes: dict[str, tuple[int, int] | None] = {}
    for name, expected_width in SCREENSHOTS.items():
        size = png_size(PHASE / "screenshots" / name)
        screenshot_sizes[name] = size
        checks.check(f"screenshot exists: {name}", size is not None)
        checks.check(f"screenshot width: {name}", size is not None and size[0] == expected_width, str(size))
    checks.check("all 12 screenshots present", len(screenshot_sizes) == 12 and all(screenshot_sizes.values()))

    try:
        diff = subprocess.run(["git", "diff", "--exit-code", "--", "docs/enhe-redesign/phase-1a-input"], cwd=ROOT, capture_output=True, text=True)
        status = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"], cwd=ROOT, capture_output=True, text=True).stdout.splitlines()
        input_changes = [line for line in status if "docs/enhe-redesign/phase-1a-input/" in line.replace("\\", "/")]
        unauthorized = [line for line in status if line[3:] and not line[3:].replace("\\", "/").startswith("docs/enhe-redesign/phase-1a/")]
        checks.check("input directory tracked diff zero", diff.returncode == 0, diff.stdout + diff.stderr)
        checks.check("input directory worktree zero", not input_changes, str(input_changes))
        checks.check("worktree changes remain in phase-1a", not unauthorized, str(unauthorized))
    except OSError as exc:
        checks.check("Git scope checks", False, str(exc))

    for line in checks.lines:
        print(line)
    print(f"TOTAL_POLISH_CHECKS={checks.total}")
    print(f"PASSED={checks.passed}")
    print(f"FAILED={checks.failed}")
    return 0 if checks.failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
