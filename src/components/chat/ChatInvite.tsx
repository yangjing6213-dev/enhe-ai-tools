"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

type InviteData = {
  inviteStatus: "active" | "invalid" | "closed" | "paused" | "expired";
  group?: { id: string; name: string; description: string; rules: string; avatarMediaId: string | null; visibility: string; pauseJoins: boolean; status: string; activeMemberCount: number; maxMembers: number; readOnly: boolean };
  application?: { id: string; status: string; submittedAt: string; rejectionReason: string | null } | null;
  membership?: { status: string } | null;
};

const labels: Record<string, string> = {
  CHAT_GROUP_FULL: "群成员已满，暂时无法申请。",
  CHAT_JOIN_PAUSED: "群组暂停接收新申请。",
  CHAT_MEMBER_BANNED: "你需要先联系群管理员解除限制。",
  CHAT_REJOIN_COOLDOWN: "请等待 24 小时后再重新申请。",
  CHAT_INVITE_UNAVAILABLE: "邀请链接已暂停或过期。",
  CHAT_INVITE_INVALID: "邀请链接无效或已重置。",
};

export function ChatInvite({ token }: { token: string }) {
  const [data, setData] = useState<InviteData | null>(null);
  const [reason, setReason] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/chat/invites/${encodeURIComponent(token)}`, { cache: "no-store" });
    const next = await response.json().catch(() => ({ inviteStatus: "invalid" }));
    if (response.ok) setData(next);
    else setError(labels[next.code] ?? "邀请信息加载失败。");
  }, [token]);

  useEffect(() => { void refresh(); }, [refresh]);

  const apply = async () => {
    if (!accepted) { setError("请先阅读并接受群规。"); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/chat/invites/${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ acceptedRules: true, reason }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(labels[result.code] ?? "申请提交失败，请稍后重试。");
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "申请提交失败。"); }
    finally { setBusy(false); }
  };

  const group = data?.group;
  const imageUrl = group?.avatarMediaId ? `/api/chat/media/${encodeURIComponent(group.avatarMediaId)}?invite=${encodeURIComponent(token)}&variant=thumbnail` : null;
  const statusLabel = data?.inviteStatus === "expired" ? "邀请链接已过期" : data?.inviteStatus === "paused" ? "邀请已暂停" : data?.inviteStatus === "closed" ? "群聊已关闭" : data?.inviteStatus === "invalid" ? "邀请链接无效或已重置" : "";
  const returnTo = `/chat/invite/${encodeURIComponent(token)}`;

  return (
    <section className="enhe-chat-page" style={{ maxWidth: 780 }}>
      <header className="enhe-chat-hero"><div className="enhe-chat-hero-content"><h1>群聊邀请</h1><p>先了解群组资料与群规，再提交入群申请。</p></div></header>
      {error && <p className="enhe-chat-inline-error" role="alert">{error}</p>}
      {!data ? <p role="status">正在读取邀请信息…</p> : !group ? <div className="enhe-chat-card"><h2>{statusLabel || "无法查看此邀请"}</h2><Link href="/chat">返回 AI搭子群聊</Link></div> : <article className="enhe-chat-card">
        <div className="enhe-chat-row">
          {imageUrl ? <span className="enhe-chat-avatar"><img src={imageUrl} alt="" /></span> : <span className="enhe-chat-avatar" aria-hidden="true">{group.name.slice(0, 1)}</span>}
          <div><h2>{group.name}</h2><span className="enhe-chat-muted">{group.activeMemberCount} / {group.maxMembers} 位成员</span></div>
        </div>
        <p>{group.description}</p>
        <div className="enhe-chat-panel"><h3>群规</h3><p style={{ whiteSpace: "pre-wrap" }}>{group.rules || "群主暂未填写群规。"}</p></div>
        <p className="enhe-chat-muted">审核通过后可以查看群内保留的历史消息。提交申请不会占用正式成员名额。</p>
        {statusLabel && <p className="enhe-chat-inline-error">{statusLabel}</p>}
        {data.membership?.status === "active" ? <Link className="enhe-chat-button enhe-chat-button-primary" href={`/chat/${group.id}`}>进入群聊</Link> : data.application?.status === "pending" ? <p role="status">申请已提交，正在等待管理员审核。</p> : data.application?.status === "approved" ? <Link className="enhe-chat-button enhe-chat-button-primary" href={`/chat/${group.id}`}>进入群聊</Link> : data.application?.status === "rejected" ? <><p>上次申请未通过。{data.application.rejectionReason ?? ""}</p><p className="enhe-chat-muted">重新申请需等待 24 小时。</p></> : data.inviteStatus === "active" && group.status === "active" ? <>
          <label className="enhe-chat-field"><span>申请理由（选填，最多 200 字）</span><textarea className="enhe-chat-textarea" maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <label className="enhe-chat-row"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />我已阅读并接受群规</label>
          <div className="enhe-chat-actions" style={{ marginTop: 12 }}><button className="enhe-chat-button enhe-chat-button-primary" disabled={busy || !accepted || group.pauseJoins} onClick={() => void apply()}>{busy ? "提交中…" : "申请加入群聊"}</button><QRCodeSVG value={`https://www.enhe-tech.com.cn${returnTo}`} size={112} level="M" marginSize={3} role="img" aria-label="群聊邀请二维码" /></div>
        </> : <p className="enhe-chat-muted">此邀请当前不可用于提交申请。</p>}
        {!data.membership?.status && !data.application && <p><Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>登录后申请</Link> · <Link href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>注册</Link></p>}
      </article>}
    </section>
  );
}
