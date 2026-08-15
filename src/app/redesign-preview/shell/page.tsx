import { notFound } from "next/navigation";
import { EnheRedesignFooter } from "@/components/redesign/enhe-redesign-footer";
import { EnheRedesignHeader } from "@/components/redesign/enhe-redesign-header";
import { REDESIGN_NAV_ITEMS } from "@/components/redesign/navigation";
import { REDESIGN_PREVIEW_FILING } from "@/components/redesign/preview-filing";

export default function RedesignShellPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <>
      <main className="redesign-preview-main">
        <div className="redesign-preview-intro">
          <p className="redesign-preview-state-label">LOCAL CANDIDATE</p>
          <h1>ENHE public shell</h1>
          <p>
            Candidate-only preview for the approved header, mobile drawer, language switch, account boundary, and footer.
          </p>
        </div>

        <section id="zh" className="redesign-preview-section" aria-labelledby="zh-preview-title">
          <h2 id="zh-preview-title">中文 Header states</h2>
          <EnheRedesignHeader
            locale="zh"
            homeHref="#zh"
            brandLabel="给人生加一个 AI 外挂"
            navItems={REDESIGN_NAV_ITEMS.zh}
            languageHrefs={{ zh: "#zh", en: "#en" }}
            account={{ status: "guest", loginLabel: "登录", loginHref: "#zh-login" }}
            userMenuLabel="用户菜单"
            menuId="redesign-zh-guest-menu"
            menuTriggerLabel="打开导航菜单"
            menuCloseLabel="关闭导航菜单"
          />
          <p className="redesign-preview-copy">访客状态：显示登录入口，不显示后台管理。</p>
          <EnheRedesignHeader
            locale="zh"
            homeHref="#zh"
            brandLabel="给人生加一个 AI 外挂"
            navItems={REDESIGN_NAV_ITEMS.zh}
            languageHrefs={{ zh: "#zh", en: "#en" }}
            account={{
              status: "authenticated",
              displayName: "普通用户",
              avatarLabel: "打开普通用户菜单",
              userLabel: "个人中心",
              userHref: "#zh-user",
              isAdmin: false,
              adminLabel: "后台管理",
              adminHref: "#zh-admin",
            }}
            userMenuLabel="普通用户菜单"
            menuId="redesign-zh-user-menu"
            menuTriggerLabel="打开导航菜单"
            menuCloseLabel="关闭导航菜单"
          />
          <p className="redesign-preview-copy">普通用户状态：头像菜单只显示个人中心。</p>
          <EnheRedesignFooter locale="zh" filing={REDESIGN_PREVIEW_FILING.zh} />
        </section>

        <section id="en" className="redesign-preview-section" aria-labelledby="en-preview-title">
          <h2 id="en-preview-title">English administrator state</h2>
          <EnheRedesignHeader
            locale="en"
            homeHref="#en"
            brandLabel="An AI upgrade for everyday life"
            navItems={REDESIGN_NAV_ITEMS.en}
            languageHrefs={{ zh: "#zh", en: "#en" }}
            languageAriaLabel="Language switch"
            account={{
              status: "authenticated",
              displayName: "Admin",
              avatarLabel: "Open administrator menu",
              userLabel: "Account",
              userHref: "#en-account",
              isAdmin: true,
              adminLabel: "Admin console",
              adminHref: "#en-admin",
            }}
            userMenuLabel="Administrator menu"
            sticky
            menuId="redesign-en-admin-menu"
            menuTriggerLabel="Open navigation menu"
            menuCloseLabel="Close navigation menu"
          />
          <p className="redesign-preview-copy">Administrator state: the confirmed admin prop exposes the entry inside the avatar menu.</p>
          <EnheRedesignFooter locale="en" filing={REDESIGN_PREVIEW_FILING.en} />
        </section>
      </main>
    </>
  );
}
