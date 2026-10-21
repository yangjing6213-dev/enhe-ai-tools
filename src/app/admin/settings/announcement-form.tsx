"use client";

import { useActionState, useState } from "react";
import { Field, inputClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { saveSiteAnnouncementAction } from "./announcement-actions";
import type { SiteAnnouncementActionState, SiteAnnouncementConfig } from "@/lib/site-announcement";

const initialState: SiteAnnouncementActionState = { status: "idle", message: "" };

export function AnnouncementForm({ initial }: { initial: SiteAnnouncementConfig }) {
  const [state, action, pending] = useActionState(saveSiteAnnouncementAction, initialState);
  const [values, setValues] = useState(initial);
  return (
    <section className="enhe-admin-settings-create-card" aria-labelledby="announcement-settings-title">
      <div className="enhe-admin-settings-section-heading"><h2 id="announcement-settings-title">导航通知横幅</h2></div>
      <p>显示在导航栏下方。关闭后，在当前标签页切换页面或刷新都不会再次显示；关闭标签页后重新打开网站会再次显示。</p>
      <form action={action} className="enhe-admin-announcement-form">
        <label className="enhe-admin-announcement-enabled"><input type="checkbox" name="enabled" checked={values.enabled} onChange={(event) => setValues({ ...values, enabled: event.target.checked })} />启用网站通知</label>
        <Field label="中文通知文案"><textarea name="zhText" value={values.zhText} onChange={(event) => setValues({ ...values, zhText: event.target.value })} maxLength={240} rows={2} className={textareaClass} /></Field>
        <Field label="中文通知链接（可选）"><input name="zhHref" value={values.zhHref} onChange={(event) => setValues({ ...values, zhHref: event.target.value })} maxLength={2000} placeholder="例如 /software 或 https://…" className={inputClass} /></Field>
        <Field label="英文通知文案"><textarea name="enText" value={values.enText} onChange={(event) => setValues({ ...values, enText: event.target.value })} maxLength={240} rows={2} className={textareaClass} /></Field>
        <Field label="英文通知链接（可选）"><input name="enHref" value={values.enHref} onChange={(event) => setValues({ ...values, enHref: event.target.value })} maxLength={2000} placeholder="例如 /en/software 或 https://…" className={inputClass} /></Field>
        <SubmitButton disabled={pending}>{pending ? "保存中…" : "保存通知横幅"}</SubmitButton>
        {state.message ? <p role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      </form>
    </section>
  );
}
