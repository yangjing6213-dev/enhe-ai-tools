"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

type Group = { id: string; name: string; description: string; visibility: string; status: string; pauseJoins: boolean; readOnly: boolean; activeMemberCount: number; maxMembers: number; createdAt: string };
type Emoji = { id: string; shortcode?: string; emoji?: string; value?: string; name: string; category: string; active?: boolean; sortOrder?: number };
type Metrics = { groups: number; activeMembers: number; pendingApplications: number; oldestPendingHours: number | null; messagesLast7Days: number; activeSpeakersLast7Days: number; referenceClicks: number; imageCount: number; imageBytes: number; pendingReports: number };

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.code ?? "请求失败");
  return data;
}

const bytes = (size: number) => size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

export function AdminChatGroups() {
  const [tab, setTab] = useState<"groups" | "emojis">("groups");
  const [groups, setGroups] = useState<Group[]>([]);
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<{ name: string; link: string } | null>(null);
  const [draft, setDraft] = useState({ name: "", description: "", rules: "", discoverability: "listed", maxMembers: "200", allowMemberInvites: true });
  const [emojiDraft, setEmojiDraft] = useState({ shortcode: "", emoji: "", name: "", category: "表情", sortOrder: "0" });

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [groupsData, statsData, emojisData] = await Promise.all([
        fetch("/api/chat/groups?mode=admin", { cache: "no-store" }).then(readJson),
        fetch("/api/chat/admin/stats", { cache: "no-store" }).then(readJson),
        fetch("/api/chat/emojis?manage=1", { cache: "no-store" }).then(readJson),
      ]);
      setGroups(groupsData.groups); setMetrics(statsData.metrics); setEmojis(emojisData.emojis);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "管理数据无法加载。"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function createGroup(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = await readJson(await fetch("/api/chat/groups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, maxMembers: Number(draft.maxMembers), pauseJoins: false }) }));
      setCreatedInvite({ name: data.group.name, link: data.invite.link });
      setDraft({ name: "", description: "", rules: "", discoverability: "listed", maxMembers: "200", allowMemberInvites: true });
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "建群失败。"); }
    finally { setBusy(false); }
  }

  async function addEmoji(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await readJson(await fetch("/api/chat/emojis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...emojiDraft, sortOrder: Number(emojiDraft.sortOrder) }) }));
      setEmojiDraft({ shortcode: "", emoji: "", name: "", category: "表情", sortOrder: "0" });
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "添加表情失败。"); }
    finally { setBusy(false); }
  }

  async function toggleEmoji(emoji: Emoji) {
    if (!emoji.id || emoji.active === undefined) return;
    setBusy(true);
    try {
      await readJson(await fetch(`/api/chat/emojis/${encodeURIComponent(emoji.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !emoji.active }) }));
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "更新表情状态失败。"); }
    finally { setBusy(false); }
  }

  const metricCards = metrics ? [
    ["群组", metrics.groups], ["有效成员", metrics.activeMembers], ["待审申请", `${metrics.pendingApplications}${metrics.oldestPendingHours === null ? "" : ` · 最早 ${metrics.oldestPendingHours} 小时`}`],
    ["近 7 天消息", metrics.messagesLast7Days], ["近 7 天发言人数", metrics.activeSpeakersLast7Days], ["关联内容点击", metrics.referenceClicks],
    ["可用图片", `${metrics.imageCount} 张 · ${bytes(metrics.imageBytes)}`], ["待处理举报", metrics.pendingReports],
  ] : [];

  return <section className="enhe-chat-page">
    <header className="enhe-chat-hero"><div className="enhe-chat-hero-content"><h1>AI搭子群聊管理</h1><p>管理群组、申请、站内表情和群聊运营状态。</p></div></header>
    <nav className="enhe-chat-tabs" aria-label="群聊后台"><button type="button" aria-pressed={tab === "groups"} onClick={() => setTab("groups")}>群组与统计</button><button type="button" aria-pressed={tab === "emojis"} onClick={() => setTab("emojis")}>站内表情</button></nav>
    {error && <p className="enhe-chat-inline-error" role="alert">{error}</p>}
    {tab === "groups" ? <>
      {metrics && <div className="enhe-chat-grid enhe-chat-admin-metrics">{metricCards.map(([label, value]) => <article className="enhe-chat-card" key={label}><span className="enhe-chat-muted">{label}</span><strong>{value}</strong></article>)}</div>}
      <div className="enhe-chat-admin-columns">
        <section className="enhe-chat-card"><h2>创建群组</h2><form onSubmit={(event) => void createGroup(event)}>
          <label className="enhe-chat-field"><span>群名称（2–30 字）</span><input className="enhe-chat-input" minLength={2} maxLength={30} required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label className="enhe-chat-field"><span>简介（最多 200 字）</span><textarea className="enhe-chat-textarea" maxLength={200} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <label className="enhe-chat-field"><span>群规</span><textarea className="enhe-chat-textarea" required value={draft.rules} onChange={(event) => setDraft({ ...draft, rules: event.target.value })} /></label>
          <div className="enhe-chat-admin-form-row"><label className="enhe-chat-field"><span>发现方式</span><select className="enhe-chat-select" value={draft.discoverability} onChange={(event) => setDraft({ ...draft, discoverability: event.target.value })}><option value="listed">群列表展示</option><option value="invite_only">仅邀请可见</option></select></label><label className="enhe-chat-field"><span>人数上限</span><input className="enhe-chat-input" type="number" min={2} max={5000} value={draft.maxMembers} onChange={(event) => setDraft({ ...draft, maxMembers: event.target.value })} /></label></div>
          <label className="enhe-chat-row"><input type="checkbox" checked={draft.allowMemberInvites} onChange={(event) => setDraft({ ...draft, allowMemberInvites: event.target.checked })} />允许成员分享邀请</label>
          <button className="enhe-chat-button enhe-chat-button-primary" disabled={busy || !draft.name.trim() || !draft.rules.trim()}>{busy ? "创建中…" : "创建群组"}</button>
        </form></section>
        <section className="enhe-chat-card"><h2>现有群组</h2>{loading ? <p role="status">加载中…</p> : <div className="enhe-chat-admin-group-list">{groups.map((group) => <article className="enhe-chat-panel" key={group.id}><div className="enhe-chat-row" style={{ justifyContent: "space-between" }}><div><h3>{group.name}</h3><span className="enhe-chat-muted">{group.activeMemberCount}/{group.maxMembers} 位 · {group.status === "active" ? "正常" : group.status === "archived" ? "已归档" : "已停用"}</span></div><Link className="enhe-chat-button" href={`/admin/chat-groups/${group.id}`}>管理</Link></div><p>{group.description}</p></article>)}{!groups.length && <p className="enhe-chat-muted">还没有群组。</p>}</div>}</section>
      </div>
    </> : <div className="enhe-chat-admin-columns">
      <section className="enhe-chat-card"><h2>添加统一表情</h2><form onSubmit={(event) => void addEmoji(event)}>
        <label className="enhe-chat-field"><span>短代码</span><input className="enhe-chat-input" placeholder="spark" maxLength={34} required value={emojiDraft.shortcode} onChange={(event) => setEmojiDraft({ ...emojiDraft, shortcode: event.target.value })} /></label>
        <label className="enhe-chat-field"><span>表情（Unicode）</span><input className="enhe-chat-input" maxLength={12} required value={emojiDraft.emoji} onChange={(event) => setEmojiDraft({ ...emojiDraft, emoji: event.target.value })} /></label>
        <label className="enhe-chat-field"><span>名称</span><input className="enhe-chat-input" maxLength={32} required value={emojiDraft.name} onChange={(event) => setEmojiDraft({ ...emojiDraft, name: event.target.value })} /></label>
        <label className="enhe-chat-field"><span>分类</span><input className="enhe-chat-input" maxLength={32} required value={emojiDraft.category} onChange={(event) => setEmojiDraft({ ...emojiDraft, category: event.target.value })} /></label>
        <button className="enhe-chat-button enhe-chat-button-primary" disabled={busy}>添加表情</button>
      </form></section>
      <section className="enhe-chat-card"><h2>表情库</h2><div className="enhe-chat-admin-emoji-list">{emojis.map((emoji) => <article className="enhe-chat-panel enhe-chat-row" key={emoji.id}><span className="enhe-chat-admin-emoji">{emoji.emoji ?? emoji.value}</span><div><strong>{emoji.name}</strong><div className="enhe-chat-muted">{emoji.category}{emoji.shortcode ? ` · :${emoji.shortcode}:` : " · 系统表情"}</div></div>{emoji.id && <button className="enhe-chat-button" type="button" disabled={busy} onClick={() => void toggleEmoji(emoji)}>{emoji.active ? "停用" : "启用"}</button>}</article>)}</div></section>
    </div>}
    {createdInvite && <div className="enhe-chat-modal-backdrop" role="presentation"><section className="enhe-chat-card enhe-chat-created-invite" role="dialog" aria-modal="true" aria-labelledby="created-invite-title"><button className="enhe-chat-modal-close" type="button" aria-label="关闭" onClick={() => setCreatedInvite(null)}>×</button><h2 id="created-invite-title">{createdInvite.name} 已创建</h2><p>这是可分享的入群邀请；用户仍需管理员审核。</p><a href={createdInvite.link}>{createdInvite.link}</a><div className="enhe-chat-created-qr"><QRCodeSVG value={createdInvite.link} size={168} level="M" marginSize={3} role="img" aria-label="群聊邀请二维码" /></div><button className="enhe-chat-button enhe-chat-button-primary" type="button" onClick={() => void navigator.clipboard.writeText(createdInvite.link)}>复制邀请链接</button></section></div>}
  </section>;
}
