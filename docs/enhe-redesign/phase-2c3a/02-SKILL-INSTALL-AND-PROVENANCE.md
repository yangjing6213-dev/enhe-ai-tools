# Emil Kowalski Skills 安装与来源

## 结果

```text
SKILLS_CLI_VERSION=1.5.22
SKILLS_SOURCE_REPOSITORY=emilkowalski/skills
SKILLS_SOURCE_MAIN_COMMIT=78761e1b57f97dce65b983d640c70a68f39e8163
SKILLS_INSTALL_ACTION=INSTALLED_MISSING
SKILLS_GLOBAL_PATH=C:\Users\HU\.agents\skills
REQUIRED_SKILL_COUNT=8
REQUIRED_SKILLS_VERIFIED=8
ENHE_REPOSITORY_FILES_CHANGED_BY_INSTALL=NO
```

安装前八个目标均不在当前全局目录。CLI `--help` 验证了 `-g -a codex -y --skill`；安装只指定八个所需 Skill，没有安装 `pick-ui-library` 或 `ask-sonner`。当前 npx 进程设置 `DO_NOT_TRACK=1`，没有把凭据写入命令，也没有运行来源仓库脚本。

## 路径前提纠正

指令把 Codex 全局路径写为 `$HOME\.codex\skills`。当前 `skills` CLI 1.5.22 的实际全局存储是 `C:\Users\HU\.agents\skills`，`list -g -a codex --json` 将这八项报告为 `scope=global`、`agents=["Codex"]`，当前 Codex Skill catalog 也从该全局根加载它们。字面路径 `C:\Users\HU\.codex\skills\<skill>` 仍不存在。

因此这不是项目级回退：语义目标“全局且仅向 Codex 暴露”已满足，但原指令中的物理路径假设已过时。ENHE worktree 内没有生成 `.agents/skills`。

## 完整性表

| skillName | installPath | sourceRepository | sourceMainCommit | skillMdSize | skillMdSha256 | frontmatterName | status |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| `emil-design-eng` | `C:\Users\HU\.agents\skills\emil-design-eng` | `emilkowalski/skills` | `78761e1b57f97dce65b983d640c70a68f39e8163` | 27900 | `defffff8bea4583897b001b9173ccd6fb6f8341fffc63a1891a38372137a1848` | `emil-design-eng` | PASS |
| `improve-animations` | `C:\Users\HU\.agents\skills\improve-animations` | `emilkowalski/skills` | `78761e1b57f97dce65b983d640c70a68f39e8163` | 8016 | `f7bcd002f28be07c3c4d53a57af59950cff80645a9b4b94f59fa1f4810b66d5b` | `improve-animations` | PASS |
| `find-animation-opportunities` | `C:\Users\HU\.agents\skills\find-animation-opportunities` | `emilkowalski/skills` | `78761e1b57f97dce65b983d640c70a68f39e8163` | 9623 | `38edd3c52f6fad37a27934b947c9e807736459ba0eeebf6ccf1fc869aadc01cc` | `find-animation-opportunities` | PASS |
| `prototype` | `C:\Users\HU\.agents\skills\prototype` | `emilkowalski/skills` | `78761e1b57f97dce65b983d640c70a68f39e8163` | 7578 | `848a67552f2df8cd61cdcbacdbf7eb6f59567ae0bb79dfbb56ba7e762793a88a` | `prototype` | PASS |
| `animate` | `C:\Users\HU\.agents\skills\animate` | `emilkowalski/skills` | `78761e1b57f97dce65b983d640c70a68f39e8163` | 11726 | `6a69df885735517d091fca3085a30ac28e197ec743a645c590acf0ef4eb6394d` | `animate` | PASS |
| `review-animations` | `C:\Users\HU\.agents\skills\review-animations` | `emilkowalski/skills` | `78761e1b57f97dce65b983d640c70a68f39e8163` | 8220 | `9b9766965a0d9ca2afd0a1b44e74386810008a1afdd968c62b6aa84c150cc20f` | `review-animations` | PASS |
| `apple-design` | `C:\Users\HU\.agents\skills\apple-design` | `emilkowalski/skills` | `78761e1b57f97dce65b983d640c70a68f39e8163` | 22997 | `da9581408c2b37a49565a9c7e32f26763f78b581c7e802dfa2357738e43ba7d5` | `apple-design` | PASS |
| `animation-vocabulary` | `C:\Users\HU\.agents\skills\animation-vocabulary` | `emilkowalski/skills` | `78761e1b57f97dce65b983d640c70a68f39e8163` | 13301 | `de5828e11055239691504b288519b894fd4b355d6bfc418a88762e9d75568267` | `animation-vocabulary` | PASS |

每个 `SKILL.md` 的 YAML `name` 与目录名一致。八个目录均扫描过文件签名，没有发现 MZ/ELF 可执行二进制。完整外部 Skill 内容没有复制进 ENHE Git。

## 本阶段的调用边界

- `emil-design-eng`：定义 ENHE 克制、清晰、有重量、响应迅速的动效性格。
- `improve-animations deep`：执行 recon、八类只读审计和 missed-opportunity 复核，并在计划生成前停止。
- `find-animation-opportunities`：用 Frequency、Purpose、Speed、Function 四重门禁筛选候选。
- `prototype`、`animate`、`review-animations`、`apple-design`、`animation-vocabulary`：已完整审查，仅作为词汇/边界参考；本轮未进入实现、原型或计划生成。
