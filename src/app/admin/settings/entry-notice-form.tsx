"use client";

import { useActionState, useState } from "react";
import { Field, inputClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import {
  saveSiteEntryNoticeAction,
} from "./entry-notice-actions";
import type { SiteEntryNoticeActionState, SiteEntryNoticeConfig } from "@/lib/site-entry-notice";

const initialState: SiteEntryNoticeActionState = { status: "idle", message: "" };

export function EntryNoticeForm({ initial }: { initial: SiteEntryNoticeConfig }) {
  const [state, action, pending] = useActionState(saveSiteEntryNoticeAction, initialState);
  const [values, setValues] = useState(initial);
  return (
    <section className="enhe-admin-settings-create-card" aria-labelledby="entry-notice-settings-title">
      <div className="enhe-admin-settings-section-heading"><h2 id="entry-notice-settings-title">进入网站公告弹窗</h2></div>
      <p>可关闭访客进入网站时显示的公告，也可分别编辑中文和英文标题、正文、结尾。保存后，更新版本会重新向访客显示。</p>
      <form action={action} className="enhe-admin-announcement-form">
        <label className="enhe-admin-announcement-enabled">
          <input type="checkbox" name="enabled" checked={values.enabled} onChange={(event) => setValues({ ...values, enabled: event.target.checked })} />
          启用进入网站公告弹窗
        </label>
        <Field label="中文标题"><input name="zhTitle" value={values.zhTitle} onChange={(event) => setValues({ ...values, zhTitle: event.target.value })} maxLength={80} required className={inputClass} /></Field>
        <Field label="中文正文"><textarea name="zhBody" value={values.zhBody} onChange={(event) => setValues({ ...values, zhBody: event.target.value })} maxLength={3000} rows={6} required className={textareaClass} /></Field>
        <Field label="中文结尾"><input name="zhEnding" value={values.zhEnding} onChange={(event) => setValues({ ...values, zhEnding: event.target.value })} maxLength={240} className={inputClass} /></Field>
        <Field label="英文标题"><input name="enTitle" value={values.enTitle} onChange={(event) => setValues({ ...values, enTitle: event.target.value })} maxLength={120} required className={inputClass} /></Field>
        <Field label="英文正文"><textarea name="enBody" value={values.enBody} onChange={(event) => setValues({ ...values, enBody: event.target.value })} maxLength={4000} rows={6} required className={textareaClass} /></Field>
        <Field label="英文结尾"><input name="enEnding" value={values.enEnding} onChange={(event) => setValues({ ...values, enEnding: event.target.value })} maxLength={320} className={inputClass} /></Field>
        <SubmitButton disabled={pending}>{pending ? "保存中…" : "保存弹窗设置"}</SubmitButton>
        {state.message ? <p role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      </form>
    </section>
  );
}
