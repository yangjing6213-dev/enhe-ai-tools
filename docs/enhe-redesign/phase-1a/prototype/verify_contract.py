"""Phase 1A.1 contract checks; Python standard library only."""
from __future__ import annotations

import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[4]
PHASE = ROOT / "docs" / "enhe-redesign" / "phase-1a"
PROTOTYPE = PHASE / "prototype"
INPUT = ROOT / "docs" / "enhe-redesign" / "phase-1a-input"
PAGES = {
    "zh-home": PROTOTYPE / "zh" / "home.html",
    "zh-software": PROTOTYPE / "zh" / "software.html",
    "zh-signin": PROTOTYPE / "zh" / "signin.html",
    "en-home": PROTOTYPE / "en" / "home.html",
    "en-software": PROTOTYPE / "en" / "software.html",
    "en-signin": PROTOTYPE / "en" / "signin.html",
}
SCREENSHOTS = {
    "zh-home-1440.png": 1440,
    "zh-home-390.png": 390,
    "zh-software-1440.png": 1440,
    "zh-software-390.png": 390,
    "zh-signin-1440.png": 1440,
    "zh-signin-390.png": 390,
    "en-home-1440.png": 1440,
    "en-home-390.png": 390,
    "en-software-1440.png": 1440,
    "en-software-390.png": 390,
    "en-signin-1440.png": 1440,
    "en-signin-390.png": 390,
}
FORBIDDEN_VISIBLE = (
    "Swiss", "Swiss / grid", "outcome window", "Outcome window", "Phase 1A",
    "静态设计原型", "static design prototype", "设计原型", "设计占位", "设计占位符",
    "设计中", "Design study", "内容工作台", "数据整理器", "关键词地图", "周度复盘",
    "媒体简报", "风险清单", "语义摘要", "机会扫描", "证据卡片", "非客户引言",
    "验收提醒", "状态演示", "State demonstration", "Default", "Hover", "Focus",
    "Loading...", "Disabled", "Invalid email", "工作台（作为顶部导航栏目）",
    "从任务出发，不从功能堆砌开始", "先选择任务，再选择工具",
    "把重复工作，交给更好的工具",
)
FORBIDDEN_SAFETY = (
    "fileUrl", "filePath", "ZPAY_KEY", "DATABASE_URL", "永久下载地址", "私有对象 key",
    "真实支付密钥", "真实数据库地址",
)
CATALOG_PRODUCTS = {
    "zh": [
        "无所不能版｜AI生成视频应用", "InfiniteTalk", "AI语音生成", "Lumi-OS",
        "FaceSwap Studio", "AI提示词管理系统", "Codex智能切换助手",
        "转账链接二维码生成器", "聊天截图素材制作", "AI副业实操课",
        "高频AI提示词", "独立站 SEO/GEO 智能巡检",
    ],
    "en": [
        "Ultimate Edition | AI Video Generation Suite", "InfiniteTalk",
        "Local AI Voice Generator", "LumiOS", "FaceSwap Studio",
        "AI Prompt Management System", "Codex Provider Switcher",
        "Transfer Link QR Code Organizer", "No-Code Chat Screenshot Maker",
        "Practical AI Side Project Course", "High-Frequency AI Prompts",
        "Independent-site SEO/GEO Audit",
    ],
}
HOME_PRODUCT_COPY_ZH = [
    "本地完成文生视频、图生视频与视频增强，不受在线平台限制，打造更自由、更接近“无所不能”的视频创作体验。",
    "使用人物图片与音频，生成自然流畅的数字人口播视频。",
    "本地生成旁白、配音和多角色对话，不受在线次数与平台流程限制，打造更自由、更接近“无所不能”的声音创作体验。",
    "AI智能体不仅能够作为你的情感陪伴，还能协助整理任务、记忆信息和完成日常工作。",
    "本地完成人物素材合成、效果预览与创作处理，不受在线平台限制，打造更自由、更接近“无所不能”的人像创作体验。",
]
REVIEW_RECORDS_ZH = [
    ("林小满", "★★★★★", "以前看到本地 AI 视频工具就觉得很复杂，按照教程操作了一遍，第一次就生成出了可以使用的视频。最明显的感受是，不需要在多个平台之间来回切换，创作自由了很多。"),
    ("周一然", "★★★★☆", "上传一张人物图片和准备好的音频，就能生成数字人口播视频。整个流程比我原来想象得简单，做产品介绍和短视频内容方便了很多。"),
    ("陈知夏", "★★★★★", "我平时要为短视频制作旁白，以前经常需要反复更换平台。现在可以在本地完成配音和多角色对话，调整起来更直接，也不用担心生成次数突然不够。"),
    ("Mia Carter", "★★★★★", "它不只是一个回答问题的 AI。平时可以陪我聊聊，也能帮助整理待办、记录重要信息。使用一段时间后，更像是电脑里一直在身边的 AI 助手。"),
    ("Ethan Brooks", "★★★★☆", "导入素材后就能在本地预览和调整效果，不需要反复上传文件。操作路径比较清楚，对经常制作人物类图片和视频内容的人很实用。"),
]


class Element:
    def __init__(self, tag: str, attrs: dict[str, str | None], parent: "Element | None", hidden: bool):
        self.tag = tag
        self.attrs = attrs
        self.parent = parent
        self.hidden = hidden
        self.children: list[Element | str] = []

    def text(self) -> str:
        return "".join(child.text() if isinstance(child, Element) else child for child in self.children).strip()

    def has_class(self, name: str) -> bool:
        return name in (self.attrs.get("class") or "").split()

    def descendants(self, tag: str | None = None, class_name: str | None = None) -> list["Element"]:
        found: list[Element] = []
        for child in self.children:
            if not isinstance(child, Element):
                continue
            if (tag is None or child.tag == tag) and (class_name is None or child.has_class(class_name)):
                found.append(child)
            found.extend(child.descendants(tag, class_name))
        return found


class DocumentParser(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Element("document", {}, None, False)
        self.stack = [self.root]
        self.visible_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        parent = self.stack[-1]
        hidden = parent.hidden or tag in {"script", "style", "template"} or "hidden" in values or values.get("aria-hidden") == "true" or "visually-hidden" in (values.get("class") or "").split()
        element = Element(tag, values, parent, hidden)
        parent.children.append(element)
        if not hidden and tag == "img" and values.get("alt"):
            self.visible_parts.append(values["alt"] or "")
        if tag not in self.VOID:
            self.stack.append(element)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag: str) -> None:
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data: str) -> None:
        self.stack[-1].children.append(data)
        if not self.stack[-1].hidden and data.strip():
            self.visible_parts.append(data)

    @property
    def visible_text(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self.visible_parts)).strip()


def parse(path: Path) -> tuple[str, DocumentParser]:
    raw = path.read_text(encoding="utf-8")
    parser = DocumentParser()
    parser.feed(raw)
    return raw, parser


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


def first(root: Element, tag: str | None = None, class_name: str | None = None) -> Element | None:
    values = root.descendants(tag, class_name)
    return values[0] if values else None


def png_size(path: Path) -> tuple[int, int] | None:
    try:
        data = path.read_bytes()
        if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
            return None
        return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
    except OSError:
        return None


def main() -> int:
    checks = Checks()
    parsed: dict[str, tuple[str, DocumentParser]] = {}
    for key, path in PAGES.items():
        checks.check(f"page exists: {key}", path.is_file(), str(path))
        if path.is_file():
            parsed[key] = parse(path)

    expected_docs = [PHASE / f"{number:02d}-{name}" for number, name in (
        (0, "PHASE-1A-MANIFEST.md"), (1, "DESIGN-TOKENS.md"), (2, "GLOBAL-SHELL-CONTRACT.md"),
        (3, "HOMEPAGE-HIFI-SPEC.md"), (4, "SOFTWARE-LIST-HIFI-SPEC.md"), (5, "AUTH-HIFI-SPEC.md"),
        (6, "RESPONSIVE-A11Y-MOTION.md"), (7, "SEO-GEO-SEMANTIC-CONTRACT.md"),
        (8, "R006-URL-BASELINE-FREEZE-PLAN.md"), (9, "R008-EXTERNAL-SCRIPT-DECISION.md"),
        (10, "R001-PUBLIC-PRIVATE-FILE-BOUNDARY.md"), (11, "FIRST-BATCH-ACCEPTANCE-RESULT.md"),
        (12, "COMMAND-LOG.md"), (13, "PHASE-1A-USER-REVIEW-CORRECTIONS.md"),
    )]
    checks.check("phase 1A document set", all(path.is_file() for path in expected_docs))
    logo = PROTOTYPE / "assets" / "enhe-logo.svg"
    checks.check("self-owned ENHE logo asset", logo.is_file() and logo.stat().st_size > 100)

    for key, (raw, doc) in parsed.items():
        h1s = doc.root.descendants("h1")
        checks.check(f"one H1: {key}", len(h1s) == 1, f"count={len(h1s)}")
        checks.check(f"logo used: {key}", raw.count("../assets/enhe-logo.svg") >= 1)
        checks.check(f"no wrong ENHE domain: {key}", "www.enhe-tech.cn" not in raw)
        checks.check(f"no TypeShare asset/text: {key}", "TypeShare" not in raw)
        checks.check(f"no forbidden safety string: {key}", not any(item in raw for item in FORBIDDEN_SAFETY))
        visible = doc.visible_text
        forbidden = [item for item in FORBIDDEN_VISIBLE if item.lower() in visible.lower()]
        checks.check(f"visible copy allowlist: {key}", not forbidden, ", ".join(forbidden))
        for attr in ("src", "href", "poster"):
            for element in doc.root.descendants():
                value = element.attrs.get(attr)
                if not value or value.startswith(("#", "?", "http:", "https:", "mailto:", "tel:", "data:", "javascript:")):
                    continue
                target = (path := PAGES[key]).parent / urlsplit(value).path
                checks.check(f"local {attr} exists: {key}:{value}", target.resolve().is_file(), str(target))

    locked_zh = {
        "给人生加一个 AI 外挂", "一站式AI平台",
        "发现真正好用的 AI 工具、智能体与实战方法，让工作更快、创作更自由，把每个灵感变成看得见的成果。",
        "开始探索AI", "让每一个普通人，都能借助 AI，创造过去做不到的事。",
    }
    zh_home = parsed.get("zh-home")
    en_home = parsed.get("en-home")
    if zh_home:
        text = zh_home[1].visible_text
        checks.check("Chinese locked home copy", all(item in text for item in locked_zh))
        panels = zh_home[1].root.descendants(class_name="product-panel")
        names = [first(panel, class_name="cover-name").text() for panel in panels if first(panel, class_name="cover-name")]
        checks.check("Chinese five product order", names == ["无所不能版｜AI生成视频应用", "InfiniteTalk", "AI语音生成", "Lumi-OS", "FaceSwap Studio"], str(names))
        product_copy = [first(panel, "p").text() for panel in panels if first(panel, "p")]
        product_links = [first(panel, "a").attrs.get("href", "") for panel in panels if first(panel, "a")]
        checks.check("Chinese locked product descriptions", product_copy == HOME_PRODUCT_COPY_ZH, str(product_copy))
        checks.check("five semantic product records", len(panels) == 5 and all(panel.tag == "article" for panel in panels))
        checks.check("five distinct product detail links", len(product_links) == 5 and len(set(product_links)) == 5 and all(link.startswith("https://www.enhe-tech.com.cn/") for link in product_links), str(product_links))
        reviews = zh_home[1].root.descendants(class_name="review-card")
        review_names = [first(card, "strong").text() for card in reviews if first(card, "strong")]
        stars = [first(card, class_name="stars").text() for card in reviews if first(card, class_name="stars")]
        review_copy = [first(card, "blockquote").text() for card in reviews if first(card, "blockquote")]
        expected_names = [item[0] for item in REVIEW_RECORDS_ZH]
        expected_stars = [item[1] for item in REVIEW_RECORDS_ZH]
        expected_copy = [item[2] for item in REVIEW_RECORDS_ZH]
        avatar_sources = [first(card, "img").attrs.get("src", "") for card in reviews if first(card, "img")]
        ctas = zh_home[1].root.descendants("a", "primary-button")
        checks.check("Chinese five review names", review_names == expected_names, str(review_names))
        checks.check("Chinese exact review stars", stars == expected_stars, str(stars))
        checks.check("Chinese locked review copy", review_copy == expected_copy)
        checks.check("five original review avatars", avatar_sources == [f"../assets/avatar-{index}.svg" for index in range(1, 6)], str(avatar_sources))
        checks.check("Chinese CTA production route", len(ctas) == 2 and all(item.attrs.get("data-production-href") == "/software" for item in ctas))
    if en_home:
        panels = en_home[1].root.descendants(class_name="product-panel")
        names = [first(panel, class_name="cover-name").text() for panel in panels if first(panel, class_name="cover-name")]
        checks.check("English five product order", names == ["Ultimate Edition | AI Video Generation Suite", "InfiniteTalk", "Local AI Voice Generator", "LumiOS Personal AI Operating Companion", "FaceSwap Studio"], str(names))
        ctas = en_home[1].root.descendants("a", "primary-button")
        checks.check("English CTA production route", len(ctas) == 2 and all(item.attrs.get("data-production-href") == "/en/software" for item in ctas))

    nav_expected = {
        "zh": ["AI工具", "AI Skill", "AI资讯", "AI趋势", "关于我们", "搜索"],
        "en": ["AI tools", "AI Skill", "AI news", "AI trends", "About us", "Search"],
    }
    for key, (raw, _) in parsed.items():
        lang = "zh" if key.startswith("zh-") else "en"
        match = re.search(r'<nav[^>]*class="desktop-nav"[^>]*>(.*?)</nav>', raw, re.S)
        nav_html = match.group(1) if match else ""
        labels = re.findall(r'data-nav-label="([^"]+)"', nav_html)
        if not key.endswith("signin"):
            checks.check(f"header order: {key}", labels == nav_expected[lang], str(labels))
            sequence = nav_expected[lang] + ["中文", "EN"]
            positions = [nav_html.find(label) for label in sequence]
            checks.check(f"strict header text indexes: {key}", all(index >= 0 for index in positions) and all(left < right for left, right in zip(positions, positions[1:])), str(positions))
            header_label = first(parsed[key][1].root, class_name="header-brand-label")
            expected_label = "给人生加一个 AI 外挂" if lang == "zh" else "An AI upgrade for everyday life"
            checks.check(f"desktop header brand label: {key}", header_label is not None and header_label.text() == expected_label)
        if key.endswith("software"):
            checks.check(f"category order: {key}", [item.text() for item in parsed[key][1].root.descendants(class_name="category-option")] == (['全部产品', 'AI Skill', '视频生成', '图片处理', '语音音频', 'AI智能体', '效率工具'] if lang == 'zh' else ['All products', 'AI Skill', 'Video generation', 'Image processing', 'Voice & audio', 'AI agents', 'Productivity']))
            sections = parsed[key][1].root.descendants(class_name="catalog-section")
            headings = [first(section, "h2").text() for section in sections if first(section, "h2")]
            checks.check(f"three catalog sections: {key}", headings == (['新品推荐', '精选产品', '全部产品'] if lang == 'zh' else ['New releases', 'Featured products', 'All products']), str(headings))
            all_grid = first(parsed[key][1].root, class_name="all-products-grid")
            cards = all_grid.descendants(class_name="catalog-card") if all_grid else []
            urls = [card.attrs.get("href", "") for card in cards]
            names = [first(card, "h3").text() for card in cards if first(card, "h3")]
            cover_names = [first(card, class_name="card-cover").text() for card in cards if first(card, class_name="card-cover")]
            checks.check(f"twelve all-product cards: {key}", len(cards) == 12, f"count={len(cards)}")
            checks.check(f"distinct product routes: {key}", len(set(urls)) == 12 and all(url and not url.startswith("#") for url in urls))
            checks.check(f"distinct product names: {key}", len(set(names)) == 12, str(names))
            checks.check(f"confirmed product order: {key}", cover_names == CATALOG_PRODUCTS[lang], str(cover_names))
            checks.check(f"card details and price: {key}", all(card.attrs.get("href") and first(card, class_name="card-type") and first(card, "h3") and first(card, "p") and ("¥" in card.text() or "免费" in card.text() or "Free" in card.text()) for card in cards))
            checks.check(f"at most one card tag: {key}", all(len(card.descendants(class_name="card-tag")) <= 1 for card in cards))
            checks.check(f"crawlable pagination: {key}", '?page=2' in raw and 'rel="next"' in raw and 'data-load-more' in raw)
            checks.check(f"full card links: {key}", all(card.tag == "a" for card in cards))
            section_counts = [len(section.descendants(class_name="catalog-card")) for section in sections]
            checks.check(f"catalog section card counts: {key}", section_counts == [4, 3, 12], str(section_counts))
            checks.check(f"custom category control: {key}", 'data-category-trigger' in raw and 'data-category-layer' in raw and '<select' not in raw.lower())
            checks.check(f"no software sidebar: {key}", "sidebar" not in raw.lower())
    for key in ("zh-signin", "en-signin"):
        if key in parsed:
            text = parsed[key][1].visible_text
            required = (['欢迎来到 ENHE AI', '一站式AI平台', '使用 Google 继续', '使用 GitHub 继续', '电子邮箱', '用户协议', '隐私政策'] if key.startswith('zh') else ['Welcome to ENHE AI.', 'The All-in-One AI Platform.', 'Continue with Google', 'Continue with GitHub', 'Email address', 'Terms of Use', 'Privacy Policy'])
            checks.check(f"sign-in default copy: {key}", all(item in text for item in required))
            checks.check(f"sign-in has no diagnostics: {key}", not any(item.lower() in text.lower() for item in ("debug", "loading", "error", "invalid")))
            checks.check(f"sign-in has no product navigation: {key}", not parsed[key][1].root.descendants(class_name="desktop-nav"))
            terms = first(parsed[key][1].root, class_name="terms")
            legal_links = terms.descendants("a") if terms else []
            checks.check(f"sign-in legal links: {key}", len(legal_links) == 2 and len({link.attrs.get("href") for link in legal_links}) == 2)

    for key, (raw, doc) in parsed.items():
        if key.endswith("signin"):
            continue
        footer = first(doc.root, class_name="site-footer")
        headings = [item.text() for item in footer.descendants("h2") + footer.descendants("h3")] if footer else []
        expected = (["ENHE AI", "帮助与服务", "合规条款", "公司信息"] if key.startswith("zh") else ["ENHE AI", "Help & support", "Terms & policies", "Company"])
        checks.check(f"footer columns: {key}", headings == expected, str(headings))
        footer_text = footer.text() if footer else ""
        checks.check(f"footer has no locale column: {key}", not any(word in footer_text for word in ("中文", "English", "语言", "Language")))
        required_footer = (["一站式AI平台", "给人生加一个 AI 外挂", "帮助支持", "使用教程", "购买与下载", "产品更新", "用户协议", "隐私政策", "退款规则", "版权投诉", "未成年人保护", "公司名称", "品牌档案", "联系邮箱", "© ENHE AI", "ICP备案", "公安备案"] if key.startswith("zh") else ["The All-in-One AI Platform.", "An AI upgrade for everyday life", "Support", "Tutorials", "Purchase & download", "Updates", "Terms of Use", "Privacy Policy", "Refund rules", "Copyright complaints", "Minor protection", "Company information", "Brand profile", "Email", "© ENHE AI", "ICP filing", "Public-security filing"])
        checks.check(f"footer required content: {key}", all(item in footer_text for item in required_footer))
        forbidden_footer = (["AI工具", "AI Skill", "AI资讯", "AI趋势", "工作台"] if key.startswith("zh") else ["AI tools", "AI Skill", "AI news", "AI trends", "Workspace"])
        checks.check(f"footer has no repeated main navigation: {key}", not any(item in footer_text for item in forbidden_footer))

    js_path = PROTOTYPE / "prototype.js"
    css_path = PROTOTYPE / "styles.css"
    js = js_path.read_text(encoding="utf-8") if js_path.is_file() else ""
    css = css_path.read_text(encoding="utf-8") if css_path.is_file() else ""
    checks.check("JS source exists", js_path.is_file())
    checks.check("CSS source exists", css_path.is_file())
    checks.check("CSS and JS safety strings", not any(item in js or item in css for item in FORBIDDEN_SAFETY))
    checks.check("CSS review timing tokens", "--motion-review:5000ms" in css and "--motion-resume:6000ms" in css)
    checks.check("review interval 5000ms", "cssMilliseconds('--motion-review', 5000)" in js and "setInterval(() => moveReview(1), reviewInterval)" in js)
    checks.check("manual review resume 6000ms", "setTimeout(() =>" in js and "6000" in js)
    checks.check("reduced motion uses matchMedia", "matchMedia('(prefers-reduced-motion: reduce)')" in js)
    checks.check("reduced motion gates review timer", "if (reduced)" in js and "stopReviewTimer()" in js and "reviewTimer = window.setInterval" in js)
    checks.check("dynamic reduced motion clears resume", "addEventListener?.('change'" in js and "window.clearTimeout(reviewResumeTimer)" in js and "reviewResumeTimer = null" in js)
    checks.check("review pause controls", all(item in js for item in ("mouseenter", "focusin", "pointerdown", "visibilitychange", "touchstart", "ArrowLeft", "ArrowRight")))
    checks.check("review side fade", "mask-image:linear-gradient" in css and "transparent 0" in css)
    checks.check("review starts with both side cards", "let reviewIndex = 2" in js)
    checks.check("focus-visible contrast guard", ":focus-visible" in css and "box-shadow:0 0 0 7px var(--text)" in css)
    checks.check("44px touch target declarations", all(item in css for item in (".brand{", ".desktop-nav a:not(.search-link)", ".locale-switch a", ".mobile-menu a", ".site-footer a,.crawl-link,.terms a,a.text-link", "min-height:44px")))
    checks.check("product controls bind all buttons", "querySelectorAll('[data-product-prev]')" in js and "querySelectorAll('[data-product-next]')" in js)
    checks.check("product has no automatic interval", "setInterval(() => moveProduct" not in js and "setTimeout(() => moveProduct" not in js)
    checks.check("mobile category downward close", "changedTouches[0].clientY - categoryTouchStart > 40" in js)
    checks.check("responsive grid contract", "@media(max-width:1100px)" in css and "@media(max-width:800px)" in css and "@media(max-width:520px)" in css and "grid-template-columns:repeat(3" in css and "grid-template-columns:repeat(2" in css and "grid-template-columns:1fr" in css)
    checks.check("mobile header hides brand label", "@media(max-width:800px)" in css and ".header-brand-label{display:none}" in css)
    checks.check("scrollbar width guard", "scrollbar-width:none" in css and "::-webkit-scrollbar" in css)
    checks.check("viewport meta on every page", all('name="viewport"' in raw for raw, _ in parsed.values()))

    for name, width in SCREENSHOTS.items():
        path = PHASE / "screenshots" / name
        size = png_size(path)
        checks.check(f"screenshot {name}", size is not None and size[0] == width, f"size={size}")

    try:
        result = subprocess.run(["git", "diff", "--exit-code", "--", "docs/enhe-redesign/phase-1a-input"], cwd=ROOT, capture_output=True, text=True)
        checks.check("phase-1a-input tracked diff is zero", result.returncode == 0)
        status = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"], cwd=ROOT, capture_output=True, text=True).stdout.splitlines()
        input_changes = [line for line in status if "docs/enhe-redesign/phase-1a-input/" in line]
        checks.check("phase-1a-input worktree is zero", not input_changes, str(input_changes))
        unauthorized = [line for line in status if line[3:] and not line[3:].replace('\\', '/').startswith("docs/enhe-redesign/phase-1a/")]
        checks.check("worktree scope is phase-1a only", not unauthorized, str(unauthorized))
    except OSError as exc:
        checks.check("git scope checks", False, str(exc))

    for doc_name, required in {
        "08-R006-URL-BASELINE-FREEZE-PLAN.md": ["R006_STATUS=OPEN", "R006_PHASE1B_GATE=BLOCKED"],
        "09-R008-EXTERNAL-SCRIPT-DECISION.md": ["R008_DESIGN_DECISION=REMOVE_FROM_GLOBAL_BEFOREINTERACTIVE", "R008_IMPLEMENTATION_STATUS=OPEN", "R008_PHASE1B_GATE=BLOCKED"],
        "10-R001-PUBLIC-PRIVATE-FILE-BOUNDARY.md": ["R001_PHASE1A_PUBLIC_DESIGN_BOUNDARY=PASS", "R001_PRODUCTION_FILE_INVENTORY=OPEN", "R001_PRODUCT_DETAIL_AND_DOWNLOAD=BLOCKED"],
    }.items():
        path = PHASE / doc_name
        content = path.read_text(encoding="utf-8") if path.is_file() else ""
        checks.check(f"Phase 1B gate document: {doc_name}", all(item in content for item in required))

    corrections_path = PHASE / "13-PHASE-1A-USER-REVIEW-CORRECTIONS.md"
    corrections = corrections_path.read_text(encoding="utf-8") if corrections_path.is_file() else ""
    correction_ids = re.findall(r"\| C(\d+) \|", corrections)
    checks.check("C1-C12 correction records", correction_ids == [str(index) for index in range(1, 13)], str(correction_ids))
    checks.check("C1-C12 marked closed", corrections.count("| CLOSED |") == 12, f"count={corrections.count('| CLOSED |')}")

    for line in checks.lines:
        print(line)
    print(f"TOTAL_CHECKS={checks.total}")
    print(f"PASSED={checks.passed}")
    print(f"FAILED={checks.failed}")
    return 0 if checks.failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
