"use client";

import { useCallback, useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";

type Tab = "settings" | "applications" | "members" | "invite" | "announcements" | "reports" | "activity";
type Profile = { id: string; nickname: string; avatar: string | null; role: string; joinedAt?: string; muted?: boolean; mutedUntil?: string | null };
type Group = { id: string; name: string; description: string; rules: string; visibility: string; allowMemberInvites: boolean; pauseJoins: boolean; maxMembers: number; activeMemberCount: number; status: string; readOnly: boolean; avatarMediaId: string | null };
type Application = { id: string; reason: string; submittedAt: string; sourceInviteId: string | null; applicant: { id: string; nickname: string; avatar: string | null; role: string }; history?: { priorApplications: number; previousMemberStatus: string | null } };
type Report = { id: string; reason: string; status: string; createdAt: string; reporter: Profile; message: { id: string; text: string; sender: string } };
type Announcement = { id: string; title: string; content: string; pinned: boolean; createdAt: string; updatedAt: string; author: { nickname: string; avatar: string | null }; updatedBy: { nickname: string; avatar: string | null }; media: { id: string; width: number; height: number; url: string } | null; reference: { type: "tool" | "news"; id: string; title: string; href: string } | { unavailable: true } | null };
type Invite = { link: string; expiresAt: string | null; paused: boolean; resetAt: string };
type Metrics = { pendingApplications: number; oldestPendingHours: number | null; messagesLast7Days: number; activeSpeakersLast7Days: number; referenceClicks: number; imageCount: number; imageBytes: number; pendingReports: number };
type ReferenceItem = { type: "tool" | "news"; id: string; title: string; href: string; clickCount: number; lastMessageId: string };

async function json(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.code ?? "请求失败");
  return data;
}

export function ChatGroupManager({ groupId, isSiteAdmin = false }: { groupId: string; isSiteAdmin?: boolean }) {
  const [tab, setTab] = useState<Tab>("settings");
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [audit, setAudit] = useState<Array<{ id: string; action: string; targetId: string | null; reason: string | null; createdAt: string; operator: string }>>([]);
  const [form, setForm] = useState({ name: "", description: "", rules: "", visibility: "listed", maxMembers: 200, allowMemberInvites: true, pauseJoins: false, readOnly: false, status: "active" });
  const [announcementDraft, setAnnouncementDraft] = useState({ title: "", content: "", pinned: false });
  const [announcementMedia, setAnnouncementMedia] = useState<{ id: string; url: string } | null>(null);
  const [announcementReferenceType, setAnnouncementReferenceType] = useState<"tool" | "news">("tool");
  const [announcementReferenceQuery, setAnnouncementReferenceQuery] = useState("");
  const [announcementReferenceResults, setAnnouncementReferenceResults] = useState<Array<{ type: "tool" | "news"; id: string; title: string; href: string }>>([]);
  const [announcementReference, setAnnouncementReference] = useState<{ type: "tool" | "news"; id: string; title: string; href: string } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [groupData, applicationData, reportData, announcementData, inviteData, managementData, auditData] = await Promise.all([
        fetch(`/api/chat/groups/${encodeURIComponent(groupId)}`, { cache: "no-store" }).then(json),
        fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/applications`, { cache: "no-store" }).then(json),
        fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/reports`, { cache: "no-store" }).then(json),
        fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/announcements`, { cache: "no-store" }).then(json),
        fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/invite`, { cache: "no-store" }).then(json),
        fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/management`, { cache: "no-store" }).then(json),
        fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/audit`, { cache: "no-store" }).then(json),
      ]);
      setGroup(groupData.group); setMembers(groupData.members); setApplications(applicationData.applications); setReports(reportData.reports);
      setAnnouncements(announcementData.announcements); setInvite(inviteData.invite); setMetrics(managementData.metrics);
      setReferences(managementData.referencedContent); setAudit(auditData.entries);
      setForm({ name: groupData.group.name, description: groupData.group.description, rules: groupData.group.rules, visibility: groupData.group.visibility, maxMembers: groupData.group.maxMembers, allowMemberInvites: groupData.group.allowMemberInvites, pauseJoins: groupData.group.pauseJoins, readOnly: groupData.group.readOnly, status: groupData.group.status });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "群组管理信息加载失败。"); }
    finally { setLoading(false); }
  }, [groupId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (announcementReferenceQuery.trim().length < 2) { setAnnouncementReferenceResults([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({ type: announcementReferenceType, q: announcementReferenceQuery.trim() });
        const data = await json(await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/content?${query}`, { cache: "no-store" }));
        setAnnouncementReferenceResults(data.items);
      } catch { setAnnouncementReferenceResults([]); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [announcementReferenceQuery, announcementReferenceType, groupId]);

  async function update(path: string, method: string, body?: unknown, success = "已保存。") {
    setBusy(true); setError(""); setNotice("");
    try {
      await json(await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }));
      setNotice(success); await refresh(); return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "操作失败。"); }
    finally { setBusy(false); }
    return false;
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    await update(`/api/chat/groups/${encodeURIComponent(groupId)}`, "PATCH", { ...form, maxMembers: Number(form.maxMembers), ...(isSiteAdmin ? { status: form.status } : {}) });
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setBusy(true); setError("");
    try {
      const data = new FormData(); data.set("groupId", groupId); data.set("purpose", "avatar"); data.set("file", file);
      const upload = await json(await fetch("/api/chat/media", { method: "POST", body: data }));
      await json(await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ avatarMediaId: upload.id }) }));
      setNotice("群头像已更新。"); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "头像上传失败。"); }
    finally { setBusy(false); }
  }

  async function review(application: Application, action: "approve" | "reject") {
    if (action === "reject" && !rejectionReasons[application.id]?.trim()) { setError("拒绝申请时请填写原因。"); return; }
    await update(`/api/chat/applications/${encodeURIComponent(application.id)}`, "PATCH", { action, reason: rejectionReasons[application.id] ?? "" }, action === "approve" ? "申请已通过。" : "申请已拒绝。");
  }

  async function memberAction(member: Profile, action: string, durationHours?: number) {
    const reason = action === "ban" || action === "remove" ? window.prompt("请填写管理原因：") : "";
    if ((action === "ban" || action === "remove") && !reason?.trim()) return;
    if (!window.confirm(`确定对「${member.nickname}」执行此操作吗？`)) return;
    if (action === "remove") return update(`/api/chat/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(member.id)}`, "DELETE", undefined, "成员已移出。 ");
    return update(`/api/chat/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(member.id)}`, "PATCH", { action, reason: reason ?? "", ...(durationHours ? { durationHours } : {}) }, "成员状态已更新。");
  }

  async function createAnnouncement(event: FormEvent) {
    event.preventDefault();
    const created = await update(`/api/chat/groups/${encodeURIComponent(groupId)}/announcements`, "POST", { ...announcementDraft, mediaId: announcementMedia?.id ?? null, contentReference: announcementReference ? { type: announcementReference.type, id: announcementReference.id } : null }, "公告已发布。");
    if (created) {
      setAnnouncementDraft({ title: "", content: "", pinned: false });
      setAnnouncementMedia(null); setAnnouncementReference(null); setAnnouncementReferenceQuery(""); setAnnouncementReferenceResults([]);
    }
  }

  async function uploadAnnouncementImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setBusy(true); setError("");
    try {
      const formData = new FormData(); formData.set("groupId", groupId); formData.set("purpose", "announcement"); formData.set("file", file);
      const media = await json(await fetch("/api/chat/media", { method: "POST", body: formData }));
      setAnnouncementMedia({ id: media.id, url: media.url }); setAnnouncementReference(null); setAnnouncementReferenceQuery("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "公告图片上传失败。"); }
    finally { setBusy(false); }
  }

  function downloadInviteQr() {
    const canvas = document.getElementById("enhe-chat-invite-qr") as HTMLCanvasElement | null;
    if (!canvas) { setError("二维码尚未生成，请稍后重试。"); return; }
    const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `enhe-chat-${groupId}-invite.png`; link.click();
  }

  async function moderateReport(report: Report, status: "resolved" | "dismissed") {
    const resolution = window.prompt(status === "resolved" ? "处理结果：" : "不成立原因：");
    if (!resolution?.trim()) return;
    await update(`/api/chat/reports/${encodeURIComponent(report.id)}`, "PATCH", { status, resolution }, "举报已处理。");
  }

  async function removeReportedMessage(report: Report) {
    const reason = window.prompt("请填写移除原因：");
    if (!reason?.trim()) return;
    await update(`/api/chat/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(report.message.id)}`, "PATCH", { action: "remove", reason }, "违规消息已移除。");
  }

  async function inviteAction(action: "pause" | "resume" | "reset" | "expiry", expiresAt?: string | null) {
    if (action === "reset" && !window.confirm("重置后，旧邀请链接和二维码将立即失效。继续吗？")) return;
    await update(`/api/chat/groups/${encodeURIComponent(groupId)}/invite`, "PATCH", action === "expiry" ? { action, expiresAt: expiresAt || null } : { action }, action === "reset" ? "邀请已重置，旧链接已失效。" : "邀请设置已更新。");
  }

  const tabs: Array<[Tab, string]> = [["settings", "群资料与状态"], ["applications", "入群申请"], ["members", "成员管理"], ["invite", "邀请链接"], ["announcements", "公告"], ["reports", "举报"], ["activity", "讨论内容与记录"]];

  if (loading && !group) return <section className="enhe-chat-page"><p role="status">正在加载群组管理…</p></section>;
  if (!group) return <section className="enhe-chat-page"><div className="enhe-chat-card"><h1>无法管理群组</h1><p>{error || "此群组不存在或你没有管理权限。"}</p><Link href="/chat">返回群聊</Link></div></section>;

  return <section className="enhe-chat-page">
    <header className="enhe-chat-hero"><div className="enhe-chat-hero-content"><Link className="enhe-chat-back" href={isSiteAdmin ? "/admin/chat-groups" : "/chat"}>← 返回{isSiteAdmin ? "群组后台" : "群聊"}</Link><h1>{group.name} · 管理</h1><p>{group.activeMemberCount} / {group.maxMembers} 位成员</p></div></header>
    {error && <p className="enhe-chat-inline-error" role="alert">{error}</p>}{notice && <p className="enhe-chat-notice" role="status">{notice}</p>}
    <nav className="enhe-chat-tabs enhe-chat-manager-tabs" aria-label="群管理分类">{tabs.map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{label}{key === "applications" && metrics?.pendingApplications ? ` (${metrics.pendingApplications})` : key === "reports" && metrics?.pendingReports ? ` (${metrics.pendingReports})` : ""}</button>)}</nav>
    {tab === "settings" && <div className="enhe-chat-admin-columns"><section className="enhe-chat-card"><h2>群资料与状态</h2><form onSubmit={(event) => void saveSettings(event)}>
      <label className="enhe-chat-field"><span>群名称</span><input className="enhe-chat-input" minLength={2} maxLength={30} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label className="enhe-chat-field"><span>简介</span><textarea className="enhe-chat-textarea" maxLength={200} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      <label className="enhe-chat-field"><span>群规</span><textarea className="enhe-chat-textarea" value={form.rules} onChange={(event) => setForm({ ...form, rules: event.target.value })} /></label>
      <label className="enhe-chat-field"><span>发现方式</span><select className="enhe-chat-select" value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })}><option value="listed">群列表展示</option><option value="invite_only">仅邀请可见</option></select></label>
      <label className="enhe-chat-field"><span>人数上限</span><input className="enhe-chat-input" type="number" min={Math.max(2, group.activeMemberCount)} max={5000} value={form.maxMembers} onChange={(event) => setForm({ ...form, maxMembers: Number(event.target.value) })} /></label>
      <label className="enhe-chat-row"><input type="checkbox" checked={form.allowMemberInvites} onChange={(event) => setForm({ ...form, allowMemberInvites: event.target.checked })} />允许普通成员分享邀请</label>
      <label className="enhe-chat-row"><input type="checkbox" checked={form.pauseJoins} onChange={(event) => setForm({ ...form, pauseJoins: event.target.checked })} />暂停接收新申请</label>
      <label className="enhe-chat-row"><input type="checkbox" checked={form.readOnly} onChange={(event) => setForm({ ...form, readOnly: event.target.checked })} />全员只读</label>
      {isSiteAdmin && <label className="enhe-chat-field"><span>群状态（网站管理员）</span><select className="enhe-chat-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">正常</option><option value="archived">归档</option><option value="disabled">停用</option></select></label>}
      <div className="enhe-chat-actions"><button className="enhe-chat-button enhe-chat-button-primary" disabled={busy}>保存设置</button><label className="enhe-chat-button">更换群头像<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void uploadAvatar(event)} /></label></div>
    </form></section><section className="enhe-chat-card"><h2>近 7 天运营统计</h2><dl className="enhe-chat-metrics-list">{metrics && <><dt>消息量</dt><dd>{metrics.messagesLast7Days}</dd><dt>活跃发言人数</dt><dd>{metrics.activeSpeakersLast7Days}</dd><dt>关联内容点击</dt><dd>{metrics.referenceClicks}</dd><dt>图片存储</dt><dd>{metrics.imageCount} 张 · {(metrics.imageBytes / 1024 / 1024).toFixed(1)} MB</dd><dt>待处理举报</dt><dd>{metrics.pendingReports}</dd></>}</dl></section></div>}
    {tab === "applications" && <section className="enhe-chat-card"><h2>待审核申请</h2>{applications.map((application) => <article className="enhe-chat-panel" key={application.id}><div className="enhe-chat-row"><span className="enhe-chat-avatar">{application.applicant.avatar ? <img src={application.applicant.avatar} alt="" /> : application.applicant.nickname.slice(0, 1)}</span><strong>{application.applicant.nickname}</strong><time>{new Date(application.submittedAt).toLocaleString("zh-CN")}</time></div><p>{application.reason || "未填写申请理由。"}</p><p className="enhe-chat-muted">历史申请 {application.history?.priorApplications ?? 0} 次 · 成员状态：{application.history?.previousMemberStatus ?? "无"}{application.sourceInviteId ? " · 来自邀请链接" : ""}</p><div className="enhe-chat-actions"><button className="enhe-chat-button enhe-chat-button-primary" disabled={busy} onClick={() => void review(application, "approve")}>通过申请</button><input className="enhe-chat-input" placeholder="拒绝时填写原因" value={rejectionReasons[application.id] ?? ""} onChange={(event) => setRejectionReasons({ ...rejectionReasons, [application.id]: event.target.value })} /><button className="enhe-chat-button" disabled={busy} onClick={() => void review(application, "reject")}>拒绝</button></div></article>)}{!applications.length && <p className="enhe-chat-muted">当前没有待审核申请。</p>}</section>}
    {tab === "members" && <section className="enhe-chat-card"><h2>有效成员</h2><div className="enhe-chat-table-wrap"><table className="enhe-chat-table"><thead><tr><th>成员</th><th>角色</th><th>加入时间</th><th>管理</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td>{member.nickname}{member.muted ? <small className="enhe-chat-muted"> · 禁言至 {member.mutedUntil ? new Date(member.mutedUntil).toLocaleString("zh-CN") : "手动解除"}</small> : null}</td><td>{member.role === "owner" ? "群主" : member.role === "admin" ? "群管理员" : member.role === "网站管理员" ? "网站管理员" : "成员"}</td><td>{member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("zh-CN") : "—"}</td><td><div className="enhe-chat-actions">{member.role === "member" && <>{member.muted ? <button className="enhe-chat-button" disabled={busy} onClick={() => void memberAction(member, "unmute")}>解除禁言</button> : <><button className="enhe-chat-button" disabled={busy} onClick={() => void memberAction(member, "mute", 1)}>禁言 1 小时</button><button className="enhe-chat-button" disabled={busy} onClick={() => void memberAction(member, "mute", 24)}>禁言 24 小时</button><button className="enhe-chat-button" disabled={busy} onClick={() => void memberAction(member, "mute", 168)}>禁言 7 天</button></>}<button className="enhe-chat-button" disabled={busy} onClick={() => void memberAction(member, "remove")}>移出</button><button className="enhe-chat-button" disabled={busy} onClick={() => void memberAction(member, "ban")}>封禁</button></>}{member.role === "admin" && isSiteAdmin && <button className="enhe-chat-button" disabled={busy} onClick={() => void memberAction(member, "remove_admin")}>撤销管理员</button>}{member.role === "member" && isSiteAdmin && <button className="enhe-chat-button" disabled={busy} onClick={() => void memberAction(member, "make_admin")}>设为管理员</button>}{member.role === "网站管理员" && <span className="enhe-chat-muted">不可处分</span>}</div></td></tr>)}</tbody></table></div></section>}
      {tab === "invite" && <section className="enhe-chat-card"><h2>主邀请链接与二维码</h2>{invite && <><p className="enhe-chat-muted">二维码与链接指向同一申请入口。登录后可回到本群申请页；审核通过后才可读取群聊。</p><div className="enhe-chat-invite-panel"><QRCodeCanvas id="enhe-chat-invite-qr" value={invite.link} size={184} level="M" marginSize={3} /><div><label className="enhe-chat-field"><span>邀请链接</span><input className="enhe-chat-input" readOnly value={invite.link} onFocus={(event) => event.currentTarget.select()} /></label><p>{invite.paused ? "当前已暂停" : "当前有效"} · {invite.expiresAt ? `到期 ${new Date(invite.expiresAt).toLocaleString("zh-CN")}` : "长期有效"}</p><div className="enhe-chat-actions"><button className="enhe-chat-button enhe-chat-button-primary" onClick={() => void navigator.clipboard.writeText(invite.link)}>复制链接</button><button className="enhe-chat-button" onClick={downloadInviteQr}>下载二维码</button><button className="enhe-chat-button" onClick={() => void inviteAction(invite.paused ? "resume" : "pause")}>{invite.paused ? "恢复邀请" : "暂停邀请"}</button><button className="enhe-chat-button" onClick={() => void inviteAction("reset")}>重置链接</button></div><label className="enhe-chat-field"><span>设置到期时间（留空为长期）</span><input className="enhe-chat-input" type="datetime-local" onChange={(event) => { if (event.target.value) void inviteAction("expiry", new Date(event.target.value).toISOString()); }} /></label></div></div></>}</section>}
    {tab === "announcements" && <div className="enhe-chat-admin-columns"><section className="enhe-chat-card"><h2>发布公告</h2><form onSubmit={(event) => void createAnnouncement(event)}><label className="enhe-chat-field"><span>标题</span><input className="enhe-chat-input" minLength={2} maxLength={80} required value={announcementDraft.title} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, title: event.target.value })} /></label><label className="enhe-chat-field"><span>正文</span><textarea className="enhe-chat-textarea" maxLength={5000} required value={announcementDraft.content} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, content: event.target.value })} /></label><div className="enhe-chat-actions"><label className="enhe-chat-button">添加公告图片<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void uploadAnnouncementImage(event)} /></label><details className="enhe-chat-reference-picker"><summary className="enhe-chat-button">关联站内产品或资讯</summary><div className="enhe-chat-reference-search"><select className="enhe-chat-select" aria-label="公告关联类型" value={announcementReferenceType} onChange={(event) => setAnnouncementReferenceType(event.target.value as "tool" | "news")}><option value="tool">产品</option><option value="news">AI 资讯</option></select><input className="enhe-chat-input" placeholder="搜索名称或关键词" value={announcementReferenceQuery} onChange={(event) => setAnnouncementReferenceQuery(event.target.value)} />{announcementReferenceResults.map((item) => <button key={`${item.type}:${item.id}`} type="button" className="enhe-chat-result" onClick={() => { setAnnouncementReference(item); setAnnouncementMedia(null); setAnnouncementReferenceQuery(""); setAnnouncementReferenceResults([]); }}>{item.title}</button>)}</div></details></div>{announcementMedia && <div className="enhe-chat-upload-previews"><span><img src={announcementMedia.url} alt="公告图片预览" /><button type="button" aria-label="移除公告图片" onClick={() => setAnnouncementMedia(null)}>移除</button></span></div>}{announcementReference && <p className="enhe-chat-composer-preview">已关联：{announcementReference.title}<button type="button" onClick={() => setAnnouncementReference(null)}>移除</button></p>}<label className="enhe-chat-row"><input type="checkbox" checked={announcementDraft.pinned} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, pinned: event.target.checked })} />置顶（最多 3 条）</label><button className="enhe-chat-button enhe-chat-button-primary" disabled={busy}>发布公告</button></form></section><section className="enhe-chat-card"><h2>已有公告</h2>{announcements.map((announcement) => <article className="enhe-chat-panel" key={announcement.id}><h3>{announcement.title}{announcement.pinned ? " · 置顶" : ""}</h3><p style={{ whiteSpace: "pre-wrap" }}>{announcement.content}</p>{announcement.media && <img className="enhe-chat-announcement-image" src={announcement.media.url} alt={`公告图片：${announcement.title}`} />}{announcement.reference && ("href" in announcement.reference ? <Link href={announcement.reference.href}>{announcement.reference.title}</Link> : <p className="enhe-chat-muted">关联内容暂不可用</p>)}<p className="enhe-chat-muted">更新：{announcement.updatedBy.nickname} · {new Date(announcement.updatedAt).toLocaleString("zh-CN")}</p><div className="enhe-chat-actions"><button className="enhe-chat-button" onClick={() => void update(`/api/chat/announcements/${encodeURIComponent(announcement.id)}`, "PATCH", { pinned: !announcement.pinned })}>{announcement.pinned ? "取消置顶" : "置顶"}</button><button className="enhe-chat-button" onClick={() => { const title = window.prompt("修改公告标题：", announcement.title); if (title === null) return; const content = window.prompt("修改公告内容：", announcement.content); if (content === null) return; void update(`/api/chat/announcements/${encodeURIComponent(announcement.id)}`, "PATCH", { title, content }); }}>编辑</button></div></article>)}</section></div>}
    {tab === "reports" && <section className="enhe-chat-card"><h2>举报处理</h2>{reports.map((report) => <article className="enhe-chat-panel" key={report.id}><p><strong>{report.reporter.nickname}</strong> · {new Date(report.createdAt).toLocaleString("zh-CN")}</p><p>举报原因：{report.reason}</p><blockquote>{report.message.sender}：{report.message.text}</blockquote><div className="enhe-chat-actions">{report.message.text !== "消息已不可用" && <button className="enhe-chat-button" onClick={() => void removeReportedMessage(report)}>移除违规消息</button>}{report.status === "pending" && <><button className="enhe-chat-button enhe-chat-button-primary" onClick={() => void moderateReport(report, "resolved")}>标记已处理</button><button className="enhe-chat-button" onClick={() => void moderateReport(report, "dismissed")}>驳回举报</button></>}</div></article>)}{!reports.length && <p className="enhe-chat-muted">当前没有举报记录。</p>}</section>}
    {tab === "activity" && <div className="enhe-chat-admin-columns"><section className="enhe-chat-card"><h2>本群讨论过的内容</h2>{references.map((ref) => <article className="enhe-chat-panel" key={`${ref.type}:${ref.id}`}><Link href={ref.href}><strong>{ref.title}</strong></Link><p className="enhe-chat-muted">{ref.type === "tool" ? "产品" : "AI 资讯"} · 被点击 {ref.clickCount} 次 · <Link href={`/chat/${groupId}?message=${encodeURIComponent(ref.lastMessageId)}`}>查看讨论</Link></p></article>)}{!references.length && <p className="enhe-chat-muted">本群还没有有效的产品或资讯关联。</p>}</section><section className="enhe-chat-card"><h2>最近管理记录</h2>{audit.map((entry) => <article className="enhe-chat-panel" key={entry.id}><strong>{entry.action}</strong><p>{entry.operator} · {new Date(entry.createdAt).toLocaleString("zh-CN")}</p>{entry.reason && <p>{entry.reason}</p>}</article>)}{!audit.length && <p className="enhe-chat-muted">暂无管理操作记录。</p>}</section></div>}
  </section>;
}
