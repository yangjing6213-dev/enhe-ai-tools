# 源码与操作范围

## 唯一 Git 写入范围

`docs/enhe-redesign/phase-2c3a/**`

本阶段没有修改应用、测试、配置或历史文档。全局 Skill 安装发生在 `C:\Users\HU\.agents\skills`，不在 ENHE 仓库内。

## 已只读检查

- Phase 1A 设计 Token、公共壳、首页、软件页、响应式/A11y/motion 和最终批准合同。
- Phase 2C.1、2C.1.1、2C.1.2、2C.2 与 R4 正式接线/验收证据。
- R4 五个 CSV 的全部行，经 `Import-Csv` 聚合，而非抽样冒充完整读取。
- 正式公共 UI 组件、styles、四条路由和相关 Vitest/Playwright 源码。
- R4 既有 320/390/484/1440 关键截图。
- 当前 Git 历史与 R-008/Heartbeat/Writer 祖先关系。

## 明确未修改

```text
src/**
public/**
package.json
package-lock.json
next.config.*
prisma/**
middleware.*
sitemap
robots
tests/**
docs/enhe-redesign/phase-2c2-1-r4/**
```

产品数据、12/页服务端分页、分类 query、canonical/hreflang、详情链接、下载、支付、OAuth、客服 44×44、52/104px reserve、483/484 边界、safe area、R-008、Heartbeat Seam 和 Writer fix 均未修改。

## 未执行

- `npm ci` / `npm install`
- `npm test` / `npm run build`
- formatter
- Prisma migration / seed
- 生产数据库访问
- Prototype、MotionConfig、GSAP timeline、ScrollTrigger、新 keyframes、新 transition
- deploy、push、remote 修改

测试和 build 未执行是本阶段的明确禁止项，不是遗漏。R4 历史 PASS 只作为读取基线。

## 安全

未读取、创建或修改 `.env`；未读取或输出 secret、Git 凭据、私有交付文件、用户、订单、支付或生产业务数据。网络只用于 `npx skills` 元数据/安装、无凭据 `git ls-remote` 来源确认，以及只读核对 W3C APG carousel 官方指导；没有向 ENHE 应用添加网络调用。

```text
APPLICATION_SOURCE_CHANGED=NO
NEW_DEPENDENCY_ADDED=NO
SUPPORT_EXCLUSION_GEOMETRY_CHANGED=NO
CATALOG_PAGINATION_CHANGED=NO
SEO_SSR_CHANGED=NO
UNAUTHORIZED_PATHS=NONE
```
