# ENHE comprehensive audit remediation — 2026-10-18

## Contract
User authorized optimization of all 22 findings, ordinary commit/push, and production deployment. Source baseline: 7bc60da65492b85208065b9cad3952fd6f07ff1b, branch codex/full-audit-remediation-20261018. Work only in the existing clean release worktree, preserve unrelated recovery worktree. No speculative EBOS work, no broad cleanup of data, no credentials in artifacts. Keep existing layout and mascot requirements. User explicitly approved a visually similar, browser-valid rounded font on 2026-10-18; preserve the complete character set and OFL license, no unlicensed font modifications.

## Execution
1. Fix root causes with focused tests and isolated infrastructure rehearsal.
2. Integrate, review actual diff, run lint/type/unit/build/browser checks and release-shell/migration-path checks.
3. Back up production, apply reversible infrastructure changes and release, verify exact image/runtime SHA, restore/permissions/privacy behavior, and publish per-finding receipt.

## Verification boundaries
Browser simulations are not iPhone/Safari real-device acceptance. Backups require both archive verification and a restore into an isolated database. Next scheduled daily run must be observed separately; do not invent next-day evidence. No actual payments or user-content deletion. Existing private-object ACL updates and session invalidation must be narrowly scoped and logged without personal data. No secrets edited or rotated. Real Google provider logins remain manual if unavailable.

## Owners
- Security: SEC-01 to SEC-05 (audit_security).
- UI/SEO/performance: A11Y-001..003, SEO-01..005, PERF-01 (audit_seo).
- Infrastructure: OPS-001..005, local scripts/preparation (audit_operations); production changes executed by root.
- Root: SEC-06, INFO-01/02, integration, independent verification, release.

## Findings
|ID|Requirement|State|Evidence / remaining|
|---|---|---|---|
|OPS-001|每日数据库自动备份因文件所有权冲突失败|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|SEC-01|匿名视频接口可为同一存储桶内的私有文件签发下载链接|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|SEC-02|Google 登录自动关联未验证邮箱账号，原有密码继续有效|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|A11Y-001|指定中文圆体在本次Chromium检查中无法加载|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|A11Y-002|AI资讯页“用户中心”按钮黑字蓝底对比度不足|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|INFO-01|隐私说明需要补充Google登录及内容保存、删除流程|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|OPS-002|生产入口仍依赖旧项目目录和旧命名网关|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|OPS-003|SSH及主机网络防护需要进一步收紧|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|OPS-004|应用以root运行且未设置容器资源和日志上限|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|PERF-01|首页本地样本的主要内容出现偏慢|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|SEC-03|用户改密或管理员重置密码后，旧登录会话没有撤销|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|SEC-04|应用层注册没有限流，登录按 IP 的限制条件实际失效|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|SEC-05|付款截图上传没有明确指定私有存储策略|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|SEO-01|部分资讯搜索/分享标题被截成不完整语句|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|SEO-04|首页用户头像直接下载约 594 KB PNG|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|A11Y-003|共享组件的无障碍语义仍有改进项|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|INFO-02|规则页面缺少更新日期，多个联系渠道用途不够清楚|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|OPS-005|多套历史演练容器长期运行，增加维护负担|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|SEC-06|浏览器内容安全策略仍为只报告模式|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|SEO-02|英文趋势页仍有中文视频标题|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|SEO-03|资讯专题合集入口未列入 sitemap|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |
|SEO-05|部分 404 HTML 同时输出 noindex 与 index, follow|local_verified|Scoped implementation and focused tests passed; final production execution/acceptance pending. |

## Evidence log
- Initial source worktree clean, exact deployed baseline identified.
- Release/push/deploy authority comes from current user request; do not ask ritual reapproval.

## Integration evidence 2026-10-18 (before production)
- Initial integration Vitest:3177 PASS/0 FAIL/110 skipped; final superseding run:3182 PASS/0 FAIL/110 skipped, release-final-unit-bounded.json.
- Dedicated local PostgreSQL security transactions: 7/7 PASS including real advisory locks, concurrent account/IP reservations, and atomic session invalidation. All57 migrations applied to that newly created local test DB.
- Production candidate build passed; a final rebuild includes the subsequently repaired current payment-upload notification path.
- Root independent operations execution: 21 Python tests PASS; backup monitoring/runtime-user/release shell tests PASS in Debian (GNU tools). Running GNU-specific backup-monitor shell in Alpine was rejected as an environment mismatch and not treated as a production defect.
- CSP production browser: unique nonce/private-no-store confirmed; hostile parser-inserted HTML script blocked while login password toggles hydrate. The initial debugger-evaluate injection harness was replaced because that privileged context is not an untrusted HTML parser.
- Existing auth shell and public contrast production browser checks:20 PASS. UI/SEO fixture checks:8 PASS.
- ESLint whole repository PASS before latest equivalent test/notification changes; repeat affected check before release. Typecheck whole repository PASS. Dependency audit0 known vulnerabilities.
- Independent CSP and operations reviews completed; identified emergency rollback/global-lock contention fixed and reverified.
- A11Y-001: user explicitly approved replacement. Complete ChillRound F Regular v3.200 converted under OFL and renamed ENHE Rounded to respect reserved font names: 15865 glyphs/14304 Unicode mappings preserved, 2612604 bytes. Actual Chromium FontFace loading passed;33 focused font checks passed; final application browser checks pending.

- Final font-inclusive production build and final whole-repository ESLint PASS. Full production E2E initial run:390 PASS/188 SKIP/4 FAIL, all four contain cancelled 200 RSC prefetches (net::ERR_ABORTED), reproduced separately. Corrected nonce scope so actual RSC data responses do not receive document CSP; document requests remain strict even with a forged prefetch header. New red/green unit check PASS; related browser reproduction is running.
- Migration-path drill: fresh install and upgrade from deployed origin baseline passed,57 migrations with no schema difference.

- Final combined unit run with bounded workers:3182 PASS/0 FAIL/110 SKIP;596 test files PASS. Two SSR import checks exceeded5s only while the preceding unbounded run competed with the build; unchanged assertions pass in the full bounded run.
- Nonce is generated only for actual HTML documents, not RSC data; official Next CSP guidance checked. The four initial browser failures were confirmed200 RSC prefetch responses cancelled by the client. The test now strictly separates those from real failures and verifies every excluded initial target with real visible Link clicks, target-specific heading/URL and200 HTTP proof. Independent security review accepted the boundary; final full browser run is pending.
- Approved font and auth decoration:12 final real-page screenshots PASS; mobile Google buttons and bottom auth links visible, homepage mascot preserved. Final combined build including auth decoration PASS.

- Shared public-request test audit now distinguishes only confirmed same-origin GET200 text/x-component RSC-prefetch cancellations. Every excluded initial source/target/viewport receives an actual visible Link click, target200/URL/heading proof and JSON attachment. Extra proof navigation only permits non-document ERR_ABORTED; other failures remain strict. Topic viewport loops became independent tests to avoid self-cancelling responsive images. Final targeted runs5 and6 both28/28 PASS,0 retry/skip, ESLint and full tsc PASS. Last full browser run is underway against the unchanged final application build.
- Release operation package independently reviewed and uploaded with matchingSHA2560fadcd7548c9ccb9d96d8b7ab861d6950524030a9bd310022d63718e74e2a411. All repository operations will run as its original ubuntu owner while root holds the shared deployment lock; no production permission broadening was required. Production remains NOT_RUN at this pre-release snapshot.

- FINAL LOCAL ACCEPTANCE: full production browser run404 PASS/0 FAIL/188 SKIP (6.1min), release-accepted-browser.log. Final code build/lint/type/unit3182/security PostgreSQL7/migration57/operations isolated checks all PASS. All22 scoped code changes are ready; actual deployment, backup restoration and production acceptance remain the next authorized phase, recorded in the external final receipt rather than fabricated in this pre-release commit.
