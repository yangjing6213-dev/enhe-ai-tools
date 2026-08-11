# AI tools page contract

Routes are `/software` and `/en/software`. The centered category trigger opens a custom ink-green layer on desktop and a bottom sheet on mobile. Categories, in order: `全部产品`, `AI Skill`, `视频生成`, `图片处理`, `语音音频`, `AI智能体`, `效率工具`. Keyboard arrows, Enter, Escape, outside click, and a downward mobile swipe close are supported.

The page has exactly three named sections: `新品推荐` (four large cards), `精选产品` (three horizontal cards), and `全部产品` (twelve cards). The all-products grid is 4 columns at 1440px, 3 at 1024px, 2 at 768px, and 1 at 390px/320px. `加载更多` is paired with a `?page=2` crawlable link contract.

Phase 1A.2 replaces text-only covers in the four new-release and three featured cards with locally copied public ENHE media. Below 768px, new releases and featured products become focusable horizontal regions using `overflow-x:auto`, mandatory x scroll snap, start-aligned cards, 18px gaps and visible next-card peeks. Arrow keys scroll only after user input; there is no automatic movement. The all-products section remains a vertical one-column list on mobile and keeps all twelve semantic links and pagination contracts.

## Confirmed records

The twelve unique records below were read from the two permitted public ENHE directory pages on 2026-08-10: `https://www.enhe-tech.com.cn/software` (HTTP 200; ten matching records) and `https://www.enhe-tech.com.cn/skill-learning` (HTTP 200; three matching records, one overlap). Their de-duplicated union is twelve names. Feature and featured sections reuse these records for presentation, while the all-products section contains one card per record. Prices/free labels and detail routes are copied from the observed public entries; the prototype does not expose delivery URLs. The source check used a read-only UTF-8 HTML fetch and visible-name/link matching; no TypeShare asset or source was copied.

| # | Chinese record | English record | Type | Price/status | Detail route |
|---:|---|---|---|---|---|
| 1 | 无所不能版｜AI生成视频应用 | Ultimate Edition \| AI Video Generation Suite | 视频生成 | ¥35.00 | `/software/ultimate-edition-ai-video-generation-suite` |
| 2 | InfiniteTalk | InfiniteTalk | 视频生成 | ¥9.90 | `/software/infinitetalk-ai` |
| 3 | AI语音生成 | Local AI Voice Generator for Voiceover Materials | 语音音频 | ¥30.00 | `/software/local-ai-voice-generator-for-voiceover-materials` |
| 4 | Lumi-OS | LumiOS Personal AI Operating Companion | AI智能体 | ¥50.00 | `/software/windows-ai` |
| 5 | FaceSwap Studio | FaceSwap Studio Local Portrait Synthesis Lab | 图片处理 | ¥30.00 | `/software/faceswap-studio-ai` |
| 6 | AI提示词管理系统 | AI Prompt Management System | 效率工具 | ¥1.00 | `/software/ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation` |
| 7 | Codex智能切换助手 | Codex Provider Switcher | 效率工具 | 免费 | `/software/codex-api` |
| 8 | 转账链接二维码生成器 | Transfer Link QR Code Organizer | 效率工具 | 免费 | `/software/zfb-transfer-link-qr-code-generator` |
| 9 | 聊天截图素材制作 | No-Code Chat Screenshot Maker | 图片处理 | ¥9.90 | `/software/no-code-chat-screenshot-maker` |
| 10 | AI副业实操课 | Practical AI Side Project Course | AI Skill | 免费 | `/skill-learning/ai-monetization-side-hustle-course` |
| 11 | 高频AI提示词 | High-Frequency AI Prompts for Work, Learning, and Teaching | AI Skill | 免费 | `/skill-learning/high-frequency-ai-prompts-for-work-learning-and-teaching` |
| 12 | 独立站 SEO/GEO 智能巡检 | Independent-site SEO/GEO Audit | 效率工具 | 免费巡检 10 页 | `/online-tools/seo-geo-audit` |

All detail routes are distinct public pages as observed in the source snapshot. The English prototype uses the `/en` mirror of each route. The self-owned logo source is recorded separately in `02-GLOBAL-SHELL-CONTRACT.md` and materialized at `prototype/assets/enhe-logo.svg`.
