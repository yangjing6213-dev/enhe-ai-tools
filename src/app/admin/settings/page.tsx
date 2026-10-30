import { prisma } from "@/lib/db";
import { updateSiteSettingAction } from "@/app/admin/actions";
import { AdminSection, Field, inputClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { parseSiteAnnouncement, SITE_ANNOUNCEMENT_KEY } from "@/lib/site-announcement";
import { AnnouncementForm } from "./announcement-form";
import { EntryNoticeForm } from "./entry-notice-form";
import { parseSiteEntryNotice, SITE_ENTRY_NOTICE_KEY } from "@/lib/site-entry-notice";

export default async function AdminSettingsPage() {
  const settings = await prisma.siteSetting.findMany({ where: { NOT: { key: { startsWith: "card-like:" } } }, orderBy: { key: "asc" } });
  const announcement = parseSiteAnnouncement(settings.find((setting) => setting.key === SITE_ANNOUNCEMENT_KEY)?.value);
  const entryNotice = parseSiteEntryNotice(settings.find((setting) => setting.key === SITE_ENTRY_NOTICE_KEY)?.value);
  const generalSettings = settings.filter((setting) => setting.key !== SITE_ANNOUNCEMENT_KEY && setting.key !== SITE_ENTRY_NOTICE_KEY);
  return (
    <AdminSection title="网站设置" intro="支付宝/微信收款码、网站名称、Logo、首页文案、用户协议、隐私政策、退款规则均存储在 site_settings。">
      <div className="enhe-admin-content-management enhe-admin-settings">
        <AnnouncementForm initial={announcement} />
        <EntryNoticeForm initial={entryNotice} />
        <section className="enhe-admin-settings-create-card">
          <div className="enhe-admin-settings-section-heading">
            <div>
              <p className="enhe-admin-settings-eyebrow">网站配置</p>
              <h2>新增设置</h2>
            </div>
          </div>
          <form action={updateSiteSettingAction} className="enhe-admin-settings-create-form">
            <Field label="键名"><input name="key" required className={inputClass} placeholder="例如 home_notice" /></Field>
            <Field label="说明"><input name="description" className={inputClass} /></Field>
            <Field label="值"><textarea name="value" className={textareaClass} /></Field>
            <SubmitButton>新增设置</SubmitButton>
          </form>
        </section>

        <section className="enhe-admin-settings-list-section" aria-labelledby="enhe-admin-settings-list-title">
          <div className="enhe-admin-settings-section-heading">
            <h2 id="enhe-admin-settings-list-title">已保存设置</h2>
            <span className="enhe-admin-settings-count">{generalSettings.length} 项</span>
          </div>

          {generalSettings.length === 0 ? (
            <p className="enhe-admin-settings-empty">还没有已保存的设置。</p>
          ) : (
            <div className="enhe-admin-settings-list">
              {generalSettings.map((setting) => (
                <article key={setting.id} className="enhe-admin-setting-card">
                  <form action={updateSiteSettingAction} className="enhe-admin-setting-form">
                    <input type="hidden" name="key" value={setting.key} />
                    <div className="enhe-admin-setting-heading">
                      <span>设置键</span>
                      <code>{setting.key}</code>
                    </div>
                    <Field label="说明"><input name="description" defaultValue={setting.description ?? ""} className={inputClass} /></Field>
                    <Field label="值"><textarea name="value" defaultValue={setting.value} className={textareaClass} /></Field>
                    <SubmitButton>保存设置</SubmitButton>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminSection>
  );
}
