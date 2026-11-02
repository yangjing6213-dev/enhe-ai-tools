# 恩禾 ENHE AI 工具站

> 一个仍在开发中的会员软件与网页工具站代码库，正在搭建工具目录、用户中心和后台管理的基础结构。

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)


![恩禾 ENHE AI 工具站项目封面](assets/portfolio-promo-2026-11-02/cover-zh.jpg)

[English cover](assets/portfolio-promo-2026-11-02/cover-en.jpg) · [English overview](assets/portfolio-promo-2026-11-02/overview-en.jpg)

这个仓库保存会员软件与网页工具站的当前代码和运行说明。它面向想检查或继续开发网站的协作者，不是已经对外开放、可直接注册使用的成品服务；具体能力以当前代码为准。

[安装与运行](#六安装与快速开始) · [项目结构](#九项目目录结构) · [当前状态](#十一版本说明)

## 一、这个项目是什么？

这是一个 Next.js 网站代码库，目标方向是汇集电脑软件和在线网页工具，并提供用户中心、会员状态和管理员入口等页面与路由。仓库 README 将其定位为开发中的项目；不能据此推断网站已经正式上线，也不能把开发计划当成现有功能。

## 二、先看效果

![会员软件与网页工具站概念流程图](assets/portfolio-promo-2026-11-02/overview-zh.jpg)

> AI 概念插画：表现用户浏览工具目录与站点管理的想法，不代表真实上线页面、付费会员或运行数据。

开发者提供本地代码、环境配置和数据库；运行后得到本地开发站点，可查看当前页面与代码实现。当前 README 未提供可核验的公开产品实例或用户案例。

## 三、适合谁用？

### 特别适合
- 想研究会员工具站结构，并具备基础 JavaScript/TypeScript、命令行和数据库使用经验的开发者。
- 需要从现有代码继续搭建网站的项目协作者。

### 不适合
- 想立即注册并使用已正式运营的会员平台的普通访客。
- 不准备配置 Node.js、环境变量和 PostgreSQL，却希望点开就能使用的人。

## 四、你会得到什么？

你会得到本地开发代码、数据库模型与运行/部署配置。按仓库中的开发步骤配置环境后，可以启动本地应用查看当前实现；它不是已确认可下载的桌面软件，也不等于线上服务。

## 五、它能帮你解决什么问题？

从空目录开始搭建工具站，需要先决定页面、用户身份、会员权限、内容目录与后台入口如何组织。这个仓库提供可继续检查和开发的起点。

当前文档仍包含开发计划；没有在代码和运行环境中确认的计划内容，不应理解为已实现。线上支付、正式运营、用户数据和服务可用性都需要部署者另行验证与维护。

## 六、安装与快速开始

本地开发需要 Node.js/npm、可用的 PostgreSQL 数据库，以及根据 <code>.env.example</code> 配置的环境变量。启动前先检查模板中的必填项。仓库未声明项目许可证，使用与再分发权限请先自行核实。

在项目根目录打开 PowerShell，复制环境模板，填写自己的数据库连接信息，再安装并启动：

```powershell
Copy-Item .env.example .env
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

浏览器打开终端显示的本地地址。若成功，应能看到当前开发版首页；若数据库未连接，先检查 <code>.env</code> 和 PostgreSQL 状态。种子数据只供本地开发核对，不应用于生产环境。

Docker 方式见 [部署说明](deploy/enhe-ai-tools/README.md)。首次使用建议先确认本地版本可启动，再考虑部署。

## 七、如何使用？

本项目当前面向开发者，而非普通站点访客。从 <code>src/app/</code> 查看现有页面和 API 路由；修改数据库结构前先检查 Prisma schema 与迁移文件。完成本地变更后，在自己的环境中验证页面、权限和数据库行为。

不要将真实支付信息、用户资料或生产密钥写入仓库。体验会员或管理员流程时，只用本地演示数据，并核对当前代码中实际存在的入口。

## 八、项目工作流程

检查源码与开发计划 → 配置本地环境变量和 PostgreSQL → 安装依赖并运行数据库迁移 → 导入开发种子数据 → 启动本地服务 → 检查页面与权限行为 → 决定后续开发范围。

代码提供开发起点；数据库配置、功能开发、安全检查和部署由开发者负责。

## 九、项目目录结构

- <code>src/app/</code>：前台、用户中心、后台与 API 路由。
- <code>src/components/</code>：导航、工具卡片和通用 UI。
- <code>src/lib/</code>：Prisma、认证、会员、订单、权限和设置相关代码。
- <code>prisma/schema.prisma</code>：数据库模型。
- <code>prisma/seed.ts</code>：本地演示数据与默认管理员种子。
- <code>.env.example</code>：环境变量模板；本地的 <code>.env</code> 不应提交。
- <code>deploy/</code> 与 <code>docker/</code>：容器和反向代理配置。

## 十、注意事项与常见问题

- **项目已经可以公开注册吗？** 当前 README 描述的是开发中的代码库，没有证据说明公开服务已正式开放。
- **可以直接部署生产吗？** 仓库提供部署文件和建议，但密钥、支付、备份、监控与安全仍需部署者逐项检查。
- **启动时数据库报错怎么办？** 检查 PostgreSQL 是否运行、<code>.env</code> 的连接项是否正确，再按项目说明处理迁移。
- **默认管理员凭据可以放线上吗？** 不可以。查看种子脚本并仅在本地验证；部署前应审核和更换所有凭据。
- **是否有许可证？** 当前仓库没有 LICENSE 文件，因此不添加许可证徽章，也不作使用或商用授权承诺。

仓库当前没有 LICENSE 文件，因此不对使用或商用授权作承诺。

## 十一、版本说明

当前 README 未列出可核验的应用版本号。项目仍在开发；开发计划不代表已发布版本或已实现功能。

## 十二、相关项目

无。当前没有在 README 中确认与本代码库有明确集成关系的其他作品。

## 十三、关于作者

**Enhe（恩禾）｜产品设计师 · 一人公司实践者 · AI Builder**

用 AI 打造一人公司。

- GitHub：[yangjing6213-dev](https://github.com/yangjing6213-dev)
- X / Twitter：[Amenenhe_ai](https://x.com/Amenenhe_ai)
- 网站：[恩禾 ENHE AI](https://www.enhe-tech.com.cn/)
- 微信：Hu-Amen
- 邮箱：[amen.enhe@gmail.com](mailto:amen.enhe@gmail.com)

## 十四、继续探索

这个工具站项目仍在逐步搭建。如果你也在思考如何把 AI 工具整理成容易理解的产品入口，可以到 [恩禾 ENHE AI](https://www.enhe-tech.com.cn/) 看看我的个人创作与实践。

