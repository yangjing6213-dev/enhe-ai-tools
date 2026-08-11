# ENHE Phase 1A.1 command log

Worktree: C:/Users/HU/Documents/New project 2/.worktrees/redesign-typeshare-v1
Branch: redesign/typeshare-v1
Start HEAD: 98807cd6fbd13327b66b567d8a4de7f70393670e
Date: 2026-08-10

## Scope and preflight

The preflight confirmed the required worktree, branch and start HEAD. The only earlier untracked artifact was docs/enhe-redesign/phase-1a.zip; it was moved to the Desktop without deletion or modification. Source and destination size were 1274097 bytes and the SHA-256 was 0725552836973A642B68B3D4D5A58389000581355E79C7461E08054CC548934C at both locations. The source path no longer exists.

No input files were changed: git diff --exit-code -- docs/enhe-redesign/phase-1a-input returned exit code 0. No application, schema, package, lockfile, environment, database, payment, OAuth, deployment or remote operation was performed.

## Public product source snapshot

Read-only browser route snapshot on 2026-08-10:

~~~text
SOURCE=https://www.enhe-tech.com.cn/software
HTTP_STATUS=200
ROUTE_MATCH_COUNT=10
ROUTES=/software/ultimate-edition-ai-video-generation-suite | /software/infinitetalk-ai | /software/local-ai-voice-generator-for-voiceover-materials | /software/windows-ai | /software/faceswap-studio-ai | /software/ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation | /software/codex-api | /software/zfb-transfer-link-qr-code-generator | /software/no-code-chat-screenshot-maker | /online-tools/seo-geo-audit
SOURCE=https://www.enhe-tech.com.cn/skill-learning
HTTP_STATUS=200
ROUTE_MATCH_COUNT=3
ROUTES=/skill-learning/ai-monetization-side-hustle-course | /skill-learning/high-frequency-ai-prompts-for-work-learning-and-teaching | /skill-learning/ai-prompt-management
SEO_DETAIL_STATUS=200
SEO_DETAIL_TITLE=独立站 SEO/GEO 智能巡检 | ENHE AI
SEO_DETAIL_H1=独立站 SEO/GEO 智能巡检
~~~

The two permitted directory pages are the only source directories used. The /ai-skills page was not used as a product source.

## Static and browser commands

Commands run (through the local RTK command wrapper):

~~~text
rtk node --check docs/enhe-redesign/phase-1a/prototype/prototype.js
rtk python docs/enhe-redesign/phase-1a/prototype/verify_contract.py
python -m http.server 8787 --directory docs/enhe-redesign/phase-1a/prototype
~~~

Browser acceptance used Playwright with local HTTP pages at 1440, 1024, 768, 390 and 320 CSS pixels. It opened all six pages at each width, checked HTTP 200, one H1 and no horizontal overflow, then checked product keyboard/touch controls, review autoplay/pause/fade/manual controls, reduced-motion, 200% page scale, category keyboard/Escape/bottom-sheet swipe and mobile menu Escape. The corrected full run was:

~~~text
BROWSER_TOTAL=114
BROWSER_PASSED=114
BROWSER_FAILED=0
~~~

An initial harness run reported two false negatives: it focused the non-focusable review section instead of a review button, and did not wait for the category selection state. A minimal reproduction showed the implementation behaves correctly; the full run was repeated with the real button focus path and explicit aria-selected assertion, with 114/114 passing. No source change was made for that diagnostic.

The server process used for the browser run was PID 94108. It was stopped after the run; Get-Process PID 94108 and Get-NetTCPConnection -LocalPort 8787 -State Listen both returned False.

## Screenshot dimensions

PNG IHDR reads using the Python standard library:

| filename | width | height |
|---|---:|---:|
| zh-home-1440.png | 1440 | 2648 |
| zh-home-390.png | 390 | 3151 |
| zh-software-1440.png | 1440 | 3224 |
| zh-software-390.png | 390 | 9177 |
| zh-signin-1440.png | 1440 | 900 |
| zh-signin-390.png | 390 | 844 |
| en-home-1440.png | 1440 | 2742 |
| en-home-390.png | 390 | 3375 |
| en-software-1440.png | 1440 | 3346 |
| en-software-390.png | 390 | 9849 |
| en-signin-1440.png | 1440 | 900 |
| en-signin-390.png | 390 | 844 |

All 12 files were opened and visually checked after capture. No blank, loading, clipping, overlap, overflow, wrong-language, wrong-copy, wrong-product or wrong-footer state was observed.

## Complete contract verifier output

The complete output of rtk python docs/enhe-redesign/phase-1a/prototype/verify_contract.py follows:

~~~text
PASS page exists: zh-home
PASS page exists: zh-software
PASS page exists: zh-signin
PASS page exists: en-home
PASS page exists: en-software
PASS page exists: en-signin
PASS phase 1A document set
PASS self-owned ENHE logo asset
PASS one H1: zh-home
PASS logo used: zh-home
PASS no wrong ENHE domain: zh-home
PASS no TypeShare asset/text: zh-home
PASS no forbidden safety string: zh-home
PASS visible copy allowlist: zh-home
PASS local src exists: zh-home:../assets/enhe-logo.svg
PASS local src exists: zh-home:../assets/avatar-1.svg
PASS local src exists: zh-home:../assets/avatar-2.svg
PASS local src exists: zh-home:../assets/avatar-3.svg
PASS local src exists: zh-home:../assets/avatar-4.svg
PASS local src exists: zh-home:../assets/avatar-5.svg
PASS local src exists: zh-home:../prototype.js
PASS local href exists: zh-home:../assets/enhe-logo.svg
PASS local href exists: zh-home:../styles.css
PASS local href exists: zh-home:home.html
PASS local href exists: zh-home:software.html
PASS local href exists: zh-home:home.html
PASS local href exists: zh-home:../en/home.html
PASS local href exists: zh-home:signin.html
PASS local href exists: zh-home:home.html
PASS local href exists: zh-home:../en/home.html
PASS local href exists: zh-home:home.html
PASS local href exists: zh-home:software.html
PASS local href exists: zh-home:signin.html
PASS local href exists: zh-home:software.html
PASS local href exists: zh-home:software.html
PASS one H1: zh-software
PASS logo used: zh-software
PASS no wrong ENHE domain: zh-software
PASS no TypeShare asset/text: zh-software
PASS no forbidden safety string: zh-software
PASS visible copy allowlist: zh-software
PASS local src exists: zh-software:../assets/enhe-logo.svg
PASS local src exists: zh-software:../prototype.js
PASS local href exists: zh-software:../assets/enhe-logo.svg
PASS local href exists: zh-software:../styles.css
PASS local href exists: zh-software:home.html
PASS local href exists: zh-software:software.html
PASS local href exists: zh-software:software.html
PASS local href exists: zh-software:../en/software.html
PASS local href exists: zh-software:signin.html
PASS local href exists: zh-software:software.html
PASS local href exists: zh-software:../en/software.html
PASS local href exists: zh-software:home.html
PASS local href exists: zh-software:software.html
PASS local href exists: zh-software:signin.html
PASS one H1: zh-signin
PASS logo used: zh-signin
PASS no wrong ENHE domain: zh-signin
PASS no TypeShare asset/text: zh-signin
PASS no forbidden safety string: zh-signin
PASS visible copy allowlist: zh-signin
PASS local src exists: zh-signin:../assets/enhe-logo.svg
PASS local src exists: zh-signin:../prototype.js
PASS local href exists: zh-signin:../assets/enhe-logo.svg
PASS local href exists: zh-signin:../styles.css
PASS local href exists: zh-signin:home.html
PASS local href exists: zh-signin:signin.html
PASS local href exists: zh-signin:../en/signin.html
PASS one H1: en-home
PASS logo used: en-home
PASS no wrong ENHE domain: en-home
PASS no TypeShare asset/text: en-home
PASS no forbidden safety string: en-home
PASS visible copy allowlist: en-home
PASS local src exists: en-home:../assets/enhe-logo.svg
PASS local src exists: en-home:../assets/avatar-1.svg
PASS local src exists: en-home:../assets/avatar-2.svg
PASS local src exists: en-home:../assets/avatar-3.svg
PASS local src exists: en-home:../assets/avatar-4.svg
PASS local src exists: en-home:../assets/avatar-5.svg
PASS local src exists: en-home:../prototype.js
PASS local href exists: en-home:../assets/enhe-logo.svg
PASS local href exists: en-home:../styles.css
PASS local href exists: en-home:home.html
PASS local href exists: en-home:software.html
PASS local href exists: en-home:../zh/home.html
PASS local href exists: en-home:home.html
PASS local href exists: en-home:signin.html
PASS local href exists: en-home:../zh/home.html
PASS local href exists: en-home:home.html
PASS local href exists: en-home:home.html
PASS local href exists: en-home:software.html
PASS local href exists: en-home:signin.html
PASS local href exists: en-home:software.html
PASS local href exists: en-home:software.html
PASS one H1: en-software
PASS logo used: en-software
PASS no wrong ENHE domain: en-software
PASS no TypeShare asset/text: en-software
PASS no forbidden safety string: en-software
PASS visible copy allowlist: en-software
PASS local src exists: en-software:../assets/enhe-logo.svg
PASS local src exists: en-software:../prototype.js
PASS local href exists: en-software:../assets/enhe-logo.svg
PASS local href exists: en-software:../styles.css
PASS local href exists: en-software:home.html
PASS local href exists: en-software:software.html
PASS local href exists: en-software:../zh/software.html
PASS local href exists: en-software:software.html
PASS local href exists: en-software:signin.html
PASS local href exists: en-software:../zh/software.html
PASS local href exists: en-software:software.html
PASS local href exists: en-software:home.html
PASS local href exists: en-software:software.html
PASS local href exists: en-software:signin.html
PASS one H1: en-signin
PASS logo used: en-signin
PASS no wrong ENHE domain: en-signin
PASS no TypeShare asset/text: en-signin
PASS no forbidden safety string: en-signin
PASS visible copy allowlist: en-signin
PASS local src exists: en-signin:../assets/enhe-logo.svg
PASS local src exists: en-signin:../prototype.js
PASS local href exists: en-signin:../assets/enhe-logo.svg
PASS local href exists: en-signin:../styles.css
PASS local href exists: en-signin:home.html
PASS local href exists: en-signin:../zh/signin.html
PASS local href exists: en-signin:signin.html
PASS Chinese locked home copy
PASS Chinese five product order
PASS Chinese locked product descriptions
PASS five semantic product records
PASS five distinct product detail links
PASS Chinese five review names
PASS Chinese exact review stars
PASS Chinese locked review copy
PASS five original review avatars
PASS Chinese CTA production route
PASS English five product order
PASS English CTA production route
PASS header order: zh-home
PASS strict header text indexes: zh-home
PASS desktop header brand label: zh-home
PASS header order: zh-software
PASS strict header text indexes: zh-software
PASS desktop header brand label: zh-software
PASS category order: zh-software
PASS three catalog sections: zh-software
PASS twelve all-product cards: zh-software
PASS distinct product routes: zh-software
PASS distinct product names: zh-software
PASS confirmed product order: zh-software
PASS card details and price: zh-software
PASS at most one card tag: zh-software
PASS crawlable pagination: zh-software
PASS full card links: zh-software
PASS catalog section card counts: zh-software
PASS custom category control: zh-software
PASS no software sidebar: zh-software
PASS header order: en-home
PASS strict header text indexes: en-home
PASS desktop header brand label: en-home
PASS header order: en-software
PASS strict header text indexes: en-software
PASS desktop header brand label: en-software
PASS category order: en-software
PASS three catalog sections: en-software
PASS twelve all-product cards: en-software
PASS distinct product routes: en-software
PASS distinct product names: en-software
PASS confirmed product order: en-software
PASS card details and price: en-software
PASS at most one card tag: en-software
PASS crawlable pagination: en-software
PASS full card links: en-software
PASS catalog section card counts: en-software
PASS custom category control: en-software
PASS no software sidebar: en-software
PASS sign-in default copy: zh-signin
PASS sign-in has no diagnostics: zh-signin
PASS sign-in has no product navigation: zh-signin
PASS sign-in legal links: zh-signin
PASS sign-in default copy: en-signin
PASS sign-in has no diagnostics: en-signin
PASS sign-in has no product navigation: en-signin
PASS sign-in legal links: en-signin
PASS footer columns: zh-home
PASS footer has no locale column: zh-home
PASS footer required content: zh-home
PASS footer has no repeated main navigation: zh-home
PASS footer columns: zh-software
PASS footer has no locale column: zh-software
PASS footer required content: zh-software
PASS footer has no repeated main navigation: zh-software
PASS footer columns: en-home
PASS footer has no locale column: en-home
PASS footer required content: en-home
PASS footer has no repeated main navigation: en-home
PASS footer columns: en-software
PASS footer has no locale column: en-software
PASS footer required content: en-software
PASS footer has no repeated main navigation: en-software
PASS JS source exists
PASS CSS source exists
PASS CSS and JS safety strings
PASS CSS review timing tokens
PASS review interval 5000ms
PASS manual review resume 6000ms
PASS reduced motion uses matchMedia
PASS reduced motion gates review timer
PASS dynamic reduced motion clears resume
PASS review pause controls
PASS review side fade
PASS review starts with both side cards
PASS focus-visible contrast guard
PASS 44px touch target declarations
PASS product controls bind all buttons
PASS product has no automatic interval
PASS mobile category downward close
PASS responsive grid contract
PASS mobile header hides brand label
PASS scrollbar width guard
PASS viewport meta on every page
PASS screenshot zh-home-1440.png
PASS screenshot zh-home-390.png
PASS screenshot zh-software-1440.png
PASS screenshot zh-software-390.png
PASS screenshot zh-signin-1440.png
PASS screenshot zh-signin-390.png
PASS screenshot en-home-1440.png
PASS screenshot en-home-390.png
PASS screenshot en-software-1440.png
PASS screenshot en-software-390.png
PASS screenshot en-signin-1440.png
PASS screenshot en-signin-390.png
PASS phase-1a-input tracked diff is zero
PASS phase-1a-input worktree is zero
PASS worktree scope is phase-1a only
PASS Phase 1B gate document: 08-R006-URL-BASELINE-FREEZE-PLAN.md
PASS Phase 1B gate document: 09-R008-EXTERNAL-SCRIPT-DECISION.md
PASS Phase 1B gate document: 10-R001-PUBLIC-PRIVATE-FILE-BOUNDARY.md
PASS C1-C12 correction records
PASS C1-C12 marked closed
TOTAL_CHECKS=243
PASSED=243
FAILED=0
~~~

The required terminal lines are TOTAL_CHECKS=243, PASSED=243 and FAILED=0.

## Final gates and delivery

Before staging, the following gates were run:

~~~text
rtk git diff --check
rtk git diff --exit-code -- docs/enhe-redesign/phase-1a-input
rtk git status --short --branch
rtk git diff --stat
~~~

Only docs/enhe-redesign/phase-1a/** was allowed to appear. The exact staging command was git add -- docs/enhe-redesign/phase-1a; git add . was not used. The required commit message is docs(design): align phase 1A prototypes with approved contract. No push was performed.

The result ZIP is created outside the worktree at C:/Users/HU/Desktop/ENHE-Phase1A.1-Results.zip and contains only docs/enhe-redesign/phase-1a/**.

## Phase 1A.2 final command log and evidence

The Phase 1A.2 worktree was started at `eaba93e700ce025e577c25dbe881160c5d63c9fe` on `redesign/typeshare-v1`. All changes remained under `docs/enhe-redesign/phase-1a/**`; the input directory stayed unchanged.

### Static gates

```text
rtk node --check docs/enhe-redesign/phase-1a/prototype/prototype.js       PASS
rtk python docs/enhe-redesign/phase-1a/prototype/verify_contract.py      TOTAL_CHECKS=283 / PASSED=283 / FAILED=0
rtk python docs/enhe-redesign/phase-1a/prototype/verify_polish.py        TOTAL_POLISH_CHECKS=93 / PASSED=93 / FAILED=0
rtk git diff --check                                                    PASS
rtk git diff --exit-code -- docs/enhe-redesign/phase-1a-input             exit=0
```

`verify_polish.py` uses only the Python standard library and also confirms the seven-entry media manifest, local SHA-256 values, publicAsset/containsDeliveryData flags, no TypeShare/fileUrl/filePath/private-delivery strings, responsive markers, screenshot presence and input-directory zero diff.

### Browser gate (local server)

The final matrix opened all six prototype routes at 1440x900, 1024x900, 768x900, 390x844 and 320x800. It recorded `BROWSER_TOTAL=195`, `BROWSER_PASSED=195`, `BROWSER_FAILED=0`. Evidence includes label placement/accessibility, five home media loads, 15 software media nodes, mobile horizontal scroll and keyboard controls, 1/2/3/4 all-product columns, Google/GitHub icon geometry, English copy, locked-copy regressions, 5000ms/6000ms review timing, reduced motion, 200% zoom, request safety and console errors.

```text
SERVER=http://127.0.0.1:8792
SERVER_PID=95712
UNIQUE_REQUESTS=21
TYPEShare_REQUESTS=0
PRIVATE_DELIVERY_REQUESTS=0
EXTERNAL_HOTLINK_REQUESTS=0
CONSOLE_ERRORS=0
SERVER_STOPPED=YES
```

### Screenshot gate

All 12 full-page PNGs were regenerated at the required 1440px desktop or 390px mobile width, opened individually, and their dimensions, byte sizes and SHA-256 values are recorded in `11-FIRST-BATCH-ACCEPTANCE-RESULT.md` and `15-PHASE-1A-2-ACCEPTANCE.md`.

### Final scope gate

```text
git diff --exit-code -- docs/enhe-redesign/phase-1a-input  exit=0
INPUT_FILES_UNCHANGED=YES
UNAUTHORIZED_PATHS=0
APPLICATION_CODE_CHANGED=NO
SCHEMA_CHANGED=NO
PRODUCTION_CHANGED=NO
REMOTE_CHANGED=NO
PUSHED=NO
```

The required precise staging command is `git add -- docs/enhe-redesign/phase-1a`; `git add .` was not used. The required commit message is `docs(design): polish phase 1A visual details`. The result archive is generated on the Desktop only after the commit and clean-worktree check.
