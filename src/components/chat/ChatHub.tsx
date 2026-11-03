"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Group = {
  id: string; name: string; description: string; rules?: string; avatarMediaId?: string | null;
  activeMemberCount?: number; maxMembers?: number; pauseJoins?: boolean; readOnly?: boolean;
  unreadCount?: number; role?: string; muted?: boolean; status?: string; membershipStatus?: string | null; applicationPending?: boolean;
  lastMessage?: { text: string; sender: string; createdAt: string } | null;
};
type Application = { id: string; groupId: string; status: string; reason: string; rejectionReason: string | null; submittedAt: string; group: { id: string; name: string; status: string } };
type Tab = "mine" | "discover" | "applications";

const tabLabels: Record<Tab, string> = { mine: "我的群聊", discover: "发现群聊", applications: "我的申请" };

async function jsonResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.code === "string" ? data.code : "请求失败");
  return data;
}

export function ChatHub({ isSiteAdmin = false, initialTab = "mine" }: { isSiteAdmin?: boolean; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [groups, setGroups] = useState<Group[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [mine, discover, applied] = await Promise.all([
        fetch("/api/chat/groups", { cache: "no-store" }).then(jsonResponse),
        fetch("/api/chat/groups?mode=discover", { cache: "no-store" }).then(jsonResponse),
        fetch("/api/chat/groups?mode=applications", { cache: "no-store" }).then(jsonResponse),
      ]);
      setGroups([...mine.groups, ...discover.groups.map((group: Group) => ({ ...group, _discover: true }))]);
      setApplications(applied.applications);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "群聊信息暂时无法加载。");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const apply = async (group: Group) => {
    if (!window.confirm(`请先阅读「${group.name}」群规并确认接受，再提交入群申请。\n\n${group.rules ?? ""}`)) return;
    setBusyId(group.id); setError("");
    try {
      await jsonResponse(await fetch(`/api/chat/groups/${encodeURIComponent(group.id)}/applications`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ acceptedRules: true, reason: "" }),
      }));
      setTab("applications");
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "申请提交失败。"); }
    finally { setBusyId(""); }
  };

  const withdraw = async (applicationId: string) => {
    setBusyId(applicationId); setError("");
    try {
      await jsonResponse(await fetch(`/api/chat/applications/${encodeURIComponent(applicationId)}`, { method: "DELETE" }));
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "撤回失败。"); }
    finally { setBusyId(""); }
  };

  const visibleGroups = tab === "mine"
    ? groups.filter((group) => group.role || group.membershipStatus === "active")
    : groups.filter((group) => !group.role && !group.applicationPending && group.membershipStatus !== "active" && group.status === "active");

  return (
    <section className="enhe-chat-page">
      <header className="enhe-chat-hero">
        <div className="enhe-chat-hero-content">
          <h1>AI搭子群聊</h1>
          <p>围绕 AI 工具、方法和真实工作场景交流。入群申请经管理员审核后开放聊天。</p>
        </div>
      </header>
      <div className="enhe-chat-row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <nav className="enhe-chat-tabs" role="tablist" aria-label="群聊分类">
          {(Object.keys(tabLabels) as Tab[]).map((key) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{tabLabels[key]}</button>)}
        </nav>
        {isSiteAdmin && <Link className="enhe-chat-link-button" href="/admin/chat-groups">群组管理</Link>}
      </div>
      {error && <p className="enhe-chat-inline-error" role="alert">{error}</p>}
      {loading ? <p className="enhe-chat-muted" role="status">正在加载群聊…</p> : null}
      {tab === "applications" ? (
        <div className="enhe-chat-grid">
          {applications.map((application) => <article className="enhe-chat-card" key={application.id}>
            <h2>{application.group.name}</h2>
            <p>状态：{application.status === "pending" ? "等待审核" : application.status === "approved" ? "已通过" : application.status === "rejected" ? "未通过" : "已撤回"}</p>
            <p className="enhe-chat-muted">提交于 {new Date(application.submittedAt).toLocaleString()}</p>
            {application.rejectionReason && <p>{application.rejectionReason}</p>}
            {application.status === "pending" && <button className="enhe-chat-button" disabled={busyId === application.id} onClick={() => void withdraw(application.id)}>撤回申请</button>}
            {application.status === "approved" && application.group.status !== "disabled" && <Link className="enhe-chat-button enhe-chat-button-primary" href={`/chat/${application.groupId}`}>进入群聊</Link>}
          </article>)}
          {!applications.length && <div className="enhe-chat-card enhe-chat-muted">你还没有提交入群申请。</div>}
        </div>
      ) : (
        <div className="enhe-chat-grid">
          {visibleGroups.map((group) => <article className="enhe-chat-card" key={`${tab}-${group.id}`}>
            <div className="enhe-chat-row">
              <span className="enhe-chat-avatar" aria-hidden="true">{group.name.slice(0, 1)}</span>
              <div><h2>{group.name}</h2><span className="enhe-chat-muted">{group.activeMemberCount ?? 0} / {group.maxMembers ?? 0} 位成员</span></div>
              {Boolean(group.unreadCount) && <strong aria-label={`${group.unreadCount} 条未读`}>{group.unreadCount}</strong>}
            </div>
            <p>{group.description}</p>
            {group.lastMessage && tab === "mine" && <p className="enhe-chat-muted">{group.lastMessage.sender}：{group.lastMessage.text}</p>}
            {tab === "mine" ? <div className="enhe-chat-actions">
              <Link className="enhe-chat-button enhe-chat-button-primary" href={`/chat/${group.id}`}>{group.readOnly ? "查看群聊" : "进入群聊"}</Link>
              {(group.role === "owner" || group.role === "admin") && <Link className="enhe-chat-button" href={`/chat/${group.id}/manage`}>管理</Link>}
            </div> : <>
              <p className="enhe-chat-muted">群规：{group.rules}</p>
              {group.applicationPending ? <span className="enhe-chat-muted">申请审核中</span> : group.pauseJoins ? <span className="enhe-chat-muted">暂不接收新成员</span> : <button className="enhe-chat-button enhe-chat-button-primary" disabled={busyId === group.id} onClick={() => void apply(group)}>{busyId === group.id ? "提交中…" : "申请加入"}</button>}
            </>}
          </article>)}
          {!visibleGroups.length && !loading && <div className="enhe-chat-card enhe-chat-muted">{tab === "mine" ? "你还没有加入群聊。可以到“发现群聊”查看开放的群组。" : "当前没有可申请加入的公开群组。"}</div>}
        </div>
      )}
    </section>
  );
}
