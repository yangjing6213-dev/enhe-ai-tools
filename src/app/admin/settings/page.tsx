import { prisma } from "@/lib/db";
import { updateSiteSettingAction } from "@/app/admin/actions";
import { AdminSection, Field, inputClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";

export default async function AdminSettingsPage() {
  const settings = await prisma.siteSetting.findMany({ orderBy: { key: "asc" } });
  return (
    <AdminSection title="网站设置" intro="支付宝/微信收款码、网站名称、Logo、首页文案、用户协议、隐私政策、退款规则均存储在 site_settings。">
      <form action={updateSiteSettingAction} className="glass mb-8 grid gap-4 rounded-2xl p-6">
        <Field label="键名"><input name="key" required className={inputClass} placeholder="例如 home_notice" /></Field>
        <Field label="说明"><input name="description" className={inputClass} /></Field>
        <Field label="值"><textarea name="value" className={textareaClass} /></Field>
        <SubmitButton>新增设置</SubmitButton>
      </form>
      <div className="space-y-3">
        {settings.map((setting) => (
          <div key={setting.id} className="glass rounded-2xl p-5">
            <form action={updateSiteSettingAction} className="grid gap-3">
              <input type="hidden" name="key" value={setting.key} />
              <p className="font-semibold">{setting.key}</p>
              <Field label="说明"><input name="description" defaultValue={setting.description ?? ""} className={inputClass} /></Field>
              <Field label="值"><textarea name="value" defaultValue={setting.value} className={textareaClass} /></Field>
              <SubmitButton>保存设置</SubmitButton>
            </form>
          </div>
        ))}
      </div>
    </AdminSection>
  );
}
