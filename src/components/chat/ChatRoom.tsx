"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type KeyboardEvent, type ClipboardEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, BellOff, ChevronLeft, ChevronRight, ImagePlus, Link2, Paperclip, Pin, Search, Send, Smile, Users, X } from "lucide-react";
import Aurora from "@/components/chat/Aurora";
import { chatMuteRemainingMs } from "@/lib/group-chat/policy";

type Profile = { id: string; nickname: string; avatar: string | null; role: string; joinedAt?: string };
type Group = { id: string; name: string; description: string; rules: string; avatarMediaId: string | null; activeMemberCount: number; maxMembers: number; readOnly: boolean; status: string; announcements: Array<{ id: string; title: string; content: string; pinned: boolean; createdAt: string; updatedAt: string; author: { nickname: string; avatar: string | null }; updatedBy: { nickname: string; avatar: string | null }; media: { id: string; width: number; height: number; url: string } | null; reference: Reference | { unavailable: true } | null }> };
type Reference = { type: "tool" | "news"; id: string; title: string; subtitle?: string | null; description: string | null; image: string | null; href: string; publishedAt?: string; unavailable?: true };
type Message = { id: string; clientMessageId: string; sequence: number; createdAt: string; pinnedAt: string | null; sender: Profile; status: string; text: string; emojiIds: string[]; media: Array<{ id: string; width: number; height: number; url: string; thumbnailUrl: string }>; mentions: string[]; mentionEveryone: boolean; reference: Reference | { unavailable: true } | null; replyTo: { id: string; text: string; sender: string; unavailable: boolean } | null };
type Emoji = { id: string; name: string; value?: string; emoji?: string; category: string };
type Uploaded = { id: string; file: File; preview: string };
type ChatKind = "all" | "text" | "image" | "reference";
type SavedDraft = { text?: unknown; mentions?: unknown; emojiIds?: unknown; reference?: unknown; replyToMessageId?: unknown; pendingFileCount?: unknown };

const roleNames: Record<string, string> = { owner: "群主", admin: "群管理员", member: "成员", user: "网站管理员" };
const errors: Record<string, string> = {
  CHAT_GROUP_MEMBER_REQUIRED: "你当前没有本群访问权限。",
  CHAT_MEMBER_MUTED: "你目前处于禁言状态，不能发送消息或上传图片。",
  CHAT_GROUP_READ_ONLY: "群聊当前为只读状态。",
  CHAT_MEDIA_UNAVAILABLE: "图片未能通过校验，请重新选择后再发送。",
  CHAT_REFERENCE_UNAVAILABLE: "关联内容已下架或不可用，请更换后再发送。",
  CHAT_REPLY_UNAVAILABLE: "引用消息已不可用，请重新选择后再发送。",
  CHAT_RATE_LIMIT: "操作太频繁，请稍后再试。",
  CHAT_BODY_TOO_LARGE: "请求内容过大，请减少图片或文字后重试。",
};

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errors[body.code] ?? "操作失败，请稍后重试。");
  return body;
}

function isReference(value: Message["reference"]): value is Reference {
  return Boolean(value && "href" in value && !value.unavailable);
}

export function ChatRoom({ groupId, currentUserId }: { groupId: string; currentUserId: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [member, setMember] = useState<{ role: string; muted: boolean; mutedUntil: string | null; lastReadSequence: number } | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchMessages, setSearchMessages] = useState<Message[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [text, setText] = useState("");
  const [selectedEmojiIds, setSelectedEmojiIds] = useState<string[]>([]);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [mentions, setMentions] = useState<string[]>([]);
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [contentType, setContentType] = useState<"tool" | "news">("tool");
  const [contentQuery, setContentQuery] = useState("");
  const [contentResults, setContentResults] = useState<Reference[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchKind, setSearchKind] = useState<ChatKind>("all");
  const [searchSenderId, setSearchSenderId] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [sideOpen, setSideOpen] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [announcementSeen, setAnnouncementSeen] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxImages, setLightboxImages] = useState<Message["media"]>([]);
  const [draftAttachmentNotice, setDraftAttachmentNotice] = useState(false);
  const [draftReplyUnavailable, setDraftReplyUnavailable] = useState(false);
  const [pendingReplyId, setPendingReplyId] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef(0);
  const bottomRef = useRef(true);
  const composingRef = useRef(false);
  const pendingClientMessageRef = useRef("");
  const pendingPayloadSignatureRef = useRef("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const canManage = member?.role === "owner" || member?.role === "admin";

  const refresh = useCallback(async () => {
    try {
      const [groupResponse, messageResponse, emojiResponse] = await Promise.all([
        fetch(`/api/chat/groups/${encodeURIComponent(groupId)}`, { cache: "no-store" }),
        fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/messages`, { cache: "no-store" }),
        fetch("/api/chat/emojis", { cache: "no-store" }),
      ]);
      const [groupData, messageData, emojiData] = await Promise.all([readJson(groupResponse), readJson(messageResponse), readJson(emojiResponse)]);
      setGroup(groupData.group);
      setMember(groupData.member);
      setMembers(groupData.members);
      setMessages(messageData.messages);
      setHasMore(messageData.hasMore);
      setEmojis(emojiData.emojis);
      cursorRef.current = Math.max(0, ...messageData.messages.map((message: Message) => message.sequence));
      setLoading(false);
      requestAnimationFrame(() => {
        if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        bottomRef.current = true;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "群聊无法加载。");
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!member?.muted || !member.mutedUntil) return;
    let timer: number | undefined;
    const refreshMuteState = () => {
      const remaining = chatMuteRemainingMs(member.mutedUntil);
      if (remaining === null) return;
      if (remaining === 0) {
        setMember((current) => current?.mutedUntil === member.mutedUntil ? { ...current, muted: false, mutedUntil: null } : current);
        void refresh();
        return;
      }
      timer = window.setTimeout(refreshMuteState, Math.min(remaining + 50, 2_147_483_647));
    };
    refreshMuteState();
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [member?.muted, member?.mutedUntil, refresh]);

  const draftKey = `enhe-chat-draft:${currentUserId}:${groupId}`;
  const quietKey = `enhe-chat-quiet:${currentUserId}:${groupId}`;

  useEffect(() => {
    setDraftLoaded(false);
    try {
      const value = sessionStorage.getItem(draftKey);
      const draft = value ? JSON.parse(value) as SavedDraft : null;
      setText(typeof draft?.text === "string" ? draft.text.slice(0, 2000) : "");
      setMentions(Array.isArray(draft?.mentions) ? draft.mentions.filter((id): id is string => typeof id === "string").slice(0, 50) : []);
      setSelectedEmojiIds(Array.isArray(draft?.emojiIds) ? draft.emojiIds.filter((id): id is string => typeof id === "string").slice(0, 20) : []);
      const reference = draft?.reference;
      setSelectedReference(reference && typeof reference === "object" && "type" in reference && "id" in reference && "title" in reference
        ? reference as Reference
        : null);
      setPendingReplyId(typeof draft?.replyToMessageId === "string" ? draft.replyToMessageId : "");
      setDraftAttachmentNotice(typeof draft?.pendingFileCount === "number" && draft.pendingFileCount > 0);
      setQuiet(localStorage.getItem(quietKey) === "1");
    } catch {
      setText("");
      setMentions([]);
      setSelectedEmojiIds([]);
      setSelectedReference(null);
      setPendingReplyId("");
      setDraftAttachmentNotice(false);
      setQuiet(false);
    }
    setDraftLoaded(true);
  }, [draftKey, quietKey]);

  useEffect(() => {
    if (!draftLoaded) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({
        text,
        mentions,
        emojiIds: selectedEmojiIds,
        reference: selectedReference,
        replyToMessageId: replyTo?.id ?? pendingReplyId,
        pendingFileCount: files.length || (draftAttachmentNotice ? 1 : 0),
      }));
    } catch { /* Storage may be disabled; in-memory drafts still work. */ }
  }, [draftKey, draftLoaded, draftAttachmentNotice, files.length, mentions, pendingReplyId, replyTo, selectedEmojiIds, selectedReference, text]);

  useEffect(() => {
    if (!pendingReplyId || !messages.length) return;
    const savedReply = messages.find((message) => message.id === pendingReplyId && message.status === "active");
    if (savedReply) setReplyTo(savedReply);
    else setDraftReplyUnavailable(true);
    setPendingReplyId("");
  }, [messages, pendingReplyId]);

  useEffect(() => {
    try { localStorage.setItem(quietKey, quiet ? "1" : "0"); } catch { /* The current tab still honors mute mode. */ }
  }, [quiet, quietKey]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setLightboxIndex(null);
      if (event.key === "ArrowLeft") setLightboxIndex((index) => index === null ? null : (index + lightboxImages.length - 1) % lightboxImages.length);
      if (event.key === "ArrowRight") setLightboxIndex((index) => index === null ? null : (index + 1) % lightboxImages.length);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxImages.length, lightboxIndex]);

  const synchronize = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/events?after=${cursorRef.current}`, { cache: "no-store" });
      const data = await readJson(response);
      if (data.events?.length) {
        const incoming: Message[] = data.events.flatMap((event: { message?: Message | null }) => event.message ? [event.message] : []);
        if (incoming.length) {
          setMessages((current) => {
            const byId = new Map(current.map((message) => [message.id, message]));
            for (const message of incoming) byId.set(message.id, message);
            return [...byId.values()].sort((left, right) => left.sequence - right.sequence);
          });
          if (bottomRef.current && !quiet) {
            requestAnimationFrame(() => { if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight; });
          } else {
            setNewMessageCount((count) => count + incoming.filter((message) => message.sender.id !== currentUserId && message.sequence > cursorRef.current).length);
          }
        }
      }
      cursorRef.current = Math.max(cursorRef.current, data.lastSequence ?? cursorRef.current);
    } catch {
      // Keep the latest cursor; the next interval retries and catches up from the event log.
    }
  }, [currentUserId, groupId, quiet]);

  useEffect(() => {
    if (loading || !member) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void synchronize(); }, 3500);
    const onVisible = () => { if (document.visibilityState === "visible") void synchronize(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [loading, member, synchronize]);

  const updateReadCursor = useCallback(async () => {
    if (!messageListRef.current || !bottomRef.current || !messages.length) return;
    const sequence = Math.max(...messages.filter((message) => message.status === "active").map((message) => message.sequence), 0);
    if (!sequence) return;
    try {
      await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/read`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sequence }) });
    } catch { /* The next visible interaction can retry. */ }
  }, [groupId, messages]);

  useEffect(() => { if (!loading) void updateReadCursor(); }, [loading, updateReadCursor]);

  useEffect(() => {
    if (contentQuery.trim().length < 2) { setContentResults([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/content?type=${contentType}&q=${encodeURIComponent(contentQuery.trim())}`, { cache: "no-store" });
        const data = await readJson(response);
        setContentResults(data.items);
      } catch { setContentResults([]); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [contentQuery, contentType, groupId]);

  useEffect(() => {
    if (searchQuery.trim().length < 2 && searchKind === "all" && searchSenderId === "all") {
      setSearchMessages(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ kind: searchKind });
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (searchSenderId !== "all") params.set("senderId", searchSenderId);
        const response = await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/messages?${params}`, { cache: "no-store", signal: controller.signal });
        const data = await readJson(response);
        setSearchMessages(data.messages as Message[]);
      } catch (caught) {
        if (caught instanceof Error && caught.name !== "AbortError") setError("搜索暂时无法完成。");
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [groupId, searchKind, searchQuery, searchSenderId]);

  const filteredMessages = searchMessages ?? messages;

  async function loadOlderMessages() {
    if (loadingOlder || !hasMore || !messages.length) return;
    const before = messages[0].sequence;
    const element = messageListRef.current;
    const oldHeight = element?.scrollHeight ?? 0;
    setLoadingOlder(true);
    try {
      const data = await readJson(await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/messages?before=${before}`, { cache: "no-store" }));
      const older = data.messages as Message[];
      setMessages((current) => [...older.filter((item) => !current.some((existing) => existing.id === item.id)), ...current]);
      setHasMore(Boolean(data.hasMore));
      requestAnimationFrame(() => {
        if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight - oldHeight;
      });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "更早的消息加载失败。"); }
    finally { setLoadingOlder(false); }
  }

  function addFiles(fileList: FileList | File[]) {
    setError("");
    const additions = Array.from(fileList).filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= 10 * 1024 * 1024).slice(0, Math.max(0, 9 - files.length));
    if (additions.length !== fileList.length) setError("只支持 JPG、PNG、WebP 图片，每张不超过 10 MB，每条消息最多 9 张。");
    if (additions.length) setDraftAttachmentNotice(false);
    setFiles((current) => [...current, ...additions.map((file) => ({ file, preview: URL.createObjectURL(file), id: "" }))]);
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const images = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
    if (images.length) { event.preventDefault(); addFiles(images); }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDropActive(false); addFiles(event.dataTransfer.files);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !composingRef.current && !event.nativeEvent.isComposing) {
      event.preventDefault(); void sendMessage();
    }
  }

  async function uploadPendingFiles() {
    const ids: string[] = [];
    for (const [index, selected] of files.entries()) {
      if (selected.id) { ids.push(selected.id); continue; }
      setUploadStatus(`正在安全处理图片 ${index + 1}/${files.length}…`);
      const form = new FormData(); form.set("groupId", groupId); form.set("purpose", "message"); form.set("file", selected.file);
      const response = await fetch("/api/chat/media", { method: "POST", body: form });
      const data = await readJson(response);
      ids.push(data.id);
      setFiles((current) => current.map((entry) => entry.preview === selected.preview ? { ...entry, id: data.id } : entry));
    }
    setUploadStatus("");
    return ids;
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    if (busy || !member || member.muted || group?.readOnly) return;
    if (draftAttachmentNotice) { setError("当前会话中的图片草稿已过期，请重新选择图片，或移除失效图片提示后继续发送。"); return; }
    setBusy(true); setError("");
    try {
      const mediaIds = await uploadPendingFiles();
      const content = {
        text, emojiIds: selectedEmojiIds, mediaIds,
        mentionUserIds: mentions, mentionEveryone: canManage && text.includes("@所有人"),
        replyToMessageId: replyTo?.id ?? null,
        contentReference: selectedReference ? { type: selectedReference.type, id: selectedReference.id } : null,
      };
      const signature = JSON.stringify(content);
      if (!pendingClientMessageRef.current || pendingPayloadSignatureRef.current !== signature) {
        pendingClientMessageRef.current = crypto.randomUUID();
        pendingPayloadSignatureRef.current = signature;
      }
      const payload = { clientMessageId: pendingClientMessageRef.current, ...content };
      await readJson(await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }));
      pendingClientMessageRef.current = "";
      pendingPayloadSignatureRef.current = "";
      setText(""); setSelectedEmojiIds([]); setMentions([]); setReplyTo(null); setSelectedReference(null);
      setDraftReplyUnavailable(false); setPendingReplyId(""); setDraftAttachmentNotice(false);
      for (const file of files) URL.revokeObjectURL(file.preview);
      setFiles([]);
      try { sessionStorage.removeItem(draftKey); } catch { /* The cleared state remains in memory. */ }
      await synchronize();
      requestAnimationFrame(() => { if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight; bottomRef.current = true; });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "消息未能发送；草稿已保留，请重试。");
    } finally { setUploadStatus(""); setBusy(false); }
  }

  async function retract(message: Message) {
    if (!window.confirm("确定撤回这条消息吗？")) return;
    try {
      await readJson(await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(message.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "retract" }) }));
      await synchronize();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "撤回失败。"); }
  }

  async function togglePin(message: Message) {
    try {
      await readJson(await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(message.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: message.pinnedAt ? "unpin" : "pin" }),
      }));
      await synchronize();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "置顶状态更新失败。"); }
  }

  async function report(message: Message) {
    const reason = window.prompt("请填写举报原因（最多 1000 字）：");
    if (!reason?.trim()) return;
    try {
      await readJson(await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/reports`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId: message.id, reason: reason.trim() }) }));
      setError("举报已提交给群管理员。");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "举报提交失败。"); }
  }

  async function leaveGroup() {
    if (!window.confirm("退出后仍可重新申请加入；历史消息会按群内说明保留。确定退出吗？")) return;
    try { await readJson(await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(currentUserId)}`, { method: "DELETE" })); router.push("/chat"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "退出失败。"); }
  }

  function addMention(profile: Profile) {
    if (profile.id === currentUserId) return;
    setMentions((current) => current.includes(profile.id) ? current : [...current, profile.id]);
    setText((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}@${profile.nickname} `);
  }

  function openLightbox(images: Message["media"], index: number) {
    setLightboxImages(images);
    setLightboxIndex(index);
  }

  if (loading) return <section className="enhe-chat-page"><p role="status">正在打开群聊…</p></section>;
  if (!group || !member) return <section className="enhe-chat-page"><div className="enhe-chat-card"><h1>无法进入群聊</h1><p>{error || "你当前没有有效的群成员身份。"}</p><Link className="enhe-chat-button" href="/chat">返回群聊列表</Link></div></section>;

  return (
    <section className="enhe-chat-page">
      <header className="enhe-chat-room-header">
        <div className="enhe-chat-hero">
          <Aurora colorStops={["#3b82f6", "#3bf647", "#5227ff"]} amplitude={1} blend={0.39} height={0.54} speed={1.85} glow={0.5} scale={1} brightness={1} layers={1} direction="top" opacity={1} mouseInteraction intro lightMode />
          <div className="enhe-chat-hero-content">
            <Link className="enhe-chat-back" href="/chat"><ArrowLeft size={18} />群聊列表</Link>
            <div className="enhe-chat-room-title-row"><div><h1>{group.name}</h1><p>{group.activeMemberCount} / {group.maxMembers} 位成员 · {group.status === "archived" ? "已归档，只读" : group.readOnly ? "全员禁言" : "群聊"}</p></div><button className="enhe-chat-icon-button" type="button" onClick={() => setSideOpen((open) => !open)} aria-expanded={sideOpen} aria-label="群组资料"><Users size={18} /></button></div>
          </div>
        </div>
      </header>
      {group.announcements?.length > 0 && <div className="enhe-chat-announcements">{group.announcements.filter((item) => item.pinned || item.id !== announcementSeen).slice(0, 3).map((item) => <article className="enhe-chat-announcement" key={item.id}><strong>{item.title}{item.pinned ? " · 置顶" : ""}</strong><p>{item.content}</p>{item.media && <img className="enhe-chat-announcement-image" src={item.media.url} alt={`公告图片：${item.title}`} loading="lazy" />}{item.reference && ("href" in item.reference ? <a href={item.reference.href}>{item.reference.title}</a> : <p className="enhe-chat-muted">关联内容暂不可用</p>)}<small>更新：{item.updatedBy.nickname} · {new Date(item.updatedAt).toLocaleString("zh-CN")}</small>{!item.pinned && <button type="button" onClick={() => setAnnouncementSeen(item.id)}>我已读</button>}</article>)}</div>}
      {error && <p className="enhe-chat-inline-error" role="alert">{error}</p>}
      <div className={`enhe-chat-room${dropActive ? " enhe-chat-drop-active" : ""}${sideOpen ? " enhe-chat-room-has-side" : ""}`} onDragOver={(event) => { event.preventDefault(); setDropActive(true); }} onDragLeave={() => setDropActive(false)} onDrop={onDrop}>
        <aside className="enhe-chat-room-list enhe-chat-card">
          <h2>群成员 <span className="enhe-chat-muted">{members.length}</span></h2>
          {members.map((profile) => <div className="enhe-chat-member" key={profile.id}>{profile.avatar ? <img className="enhe-chat-avatar" src={profile.avatar} alt="" /> : <span className="enhe-chat-avatar" aria-hidden="true">{profile.nickname.slice(0, 1)}</span>}<div><strong>{profile.nickname}</strong><div className="enhe-chat-muted">{roleNames[profile.role] ?? "成员"}</div></div><button type="button" className="enhe-chat-quiet-button" onClick={() => addMention(profile)}>@</button></div>)}
        </aside>
        <main className="enhe-chat-room-main enhe-chat-card" aria-label="群聊消息">
          <div className="enhe-chat-toolbar">
            <form className="enhe-chat-search" onSubmit={(event) => event.preventDefault()}><Search size={16} aria-hidden="true" /><input className="enhe-chat-input enhe-search-control" aria-label="搜索群聊消息" placeholder="搜索本群消息" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /><button type="button" onClick={() => setSearchOpen((open) => !open)}>{searchOpen ? "隐藏筛选" : "筛选"}</button></form>
            <button type="button" className="enhe-chat-icon-button" aria-label={quiet ? "关闭免打扰" : "开启免打扰"} onClick={() => setQuiet((value) => !value)}><BellOff size={17} />{quiet ? "免打扰中" : "免打扰"}</button>
          </div>
          {searchOpen && <div className="enhe-chat-filter-row"><select className="enhe-chat-select" aria-label="消息类型" value={searchKind} onChange={(event) => setSearchKind(event.target.value as ChatKind)}><option value="all">所有类型</option><option value="text">文字</option><option value="image">图片</option><option value="reference">关联内容</option></select><select className="enhe-chat-select" aria-label="发送人" value={searchSenderId} onChange={(event) => setSearchSenderId(event.target.value)}><option value="all">所有成员</option>{members.map((profile) => <option key={profile.id} value={profile.id}>{profile.nickname}</option>)}</select></div>}
          <div className="enhe-chat-message-list" ref={messageListRef} onScroll={(event) => {
            const element = event.currentTarget;
            bottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
            if (bottomRef.current) { setNewMessageCount(0); void updateReadCursor(); }
          }}>
            {!searchMessages && hasMore && <button className="enhe-chat-button enhe-chat-load-older" type="button" disabled={loadingOlder} onClick={() => void loadOlderMessages()}>{loadingOlder ? "正在加载…" : "加载更早消息"}</button>}
            {filteredMessages.length === 0 ? <p className="enhe-chat-muted">{searchQuery ? "没有匹配的消息。" : "这里还没有消息。发起一次友好的交流吧。"}</p> : filteredMessages.map((message) => <article className="enhe-chat-message" data-mine={message.sender.id === currentUserId} key={message.id}>
              <div className="enhe-chat-message-meta">{message.sender.avatar ? <img className="enhe-chat-avatar enhe-chat-avatar-small" src={message.sender.avatar} alt="" /> : <span className="enhe-chat-avatar enhe-chat-avatar-small" aria-hidden="true">{message.sender.nickname.slice(0, 1)}</span>}<strong>{message.sender.nickname}</strong><span>{roleNames[message.sender.role] ?? "成员"}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time></div>
              {message.pinnedAt && <p className="enhe-chat-pinned-label"><Pin size={14} />管理员置顶</p>}
              {message.replyTo && <div className="enhe-chat-reply-preview">回复 {message.replyTo.sender}：{message.replyTo.text}</div>}
              {message.text && <p className="enhe-chat-message-content">{message.text}</p>}
              {!!message.emojiIds.length && <div className="enhe-chat-message-emojis">{message.emojiIds.map((id) => <span key={id} title={emojis.find((emoji) => emoji.id === id)?.name}>{emojis.find((emoji) => emoji.id === id)?.value ?? emojis.find((emoji) => emoji.id === id)?.emoji ?? "▫"}</span>)}</div>}
              {message.media.length > 0 && <div className="enhe-chat-media-grid">{message.media.map((image, index) => <button key={image.id} type="button" aria-label={`查看图片 ${index + 1}/${message.media.length}`} onClick={() => openLightbox(message.media, index)}><img src={image.thumbnailUrl} alt="群聊图片" loading="lazy" /></button>)}</div>}
              {message.reference && (isReference(message.reference) ? <a className="enhe-chat-reference" href={message.reference.href}><img src={message.reference.image ?? "/images/brand/enhe-icon-gradient-white-bg-cropped.png"} alt="" loading="lazy" /><span><small>{message.reference.type === "tool" ? "站内产品" : "AI 资讯"}</small><strong>{message.reference.title}</strong>{message.reference.description && <span>{message.reference.description}</span>}</span></a> : <div className="enhe-chat-reference enhe-chat-muted">内容暂不可用</div>)}
              <div className="enhe-chat-message-actions"><button type="button" onClick={() => setReplyTo(message)}>回复</button><button type="button" onClick={() => void navigator.clipboard.writeText(message.text)}>复制文字</button>{canManage && message.status === "active" && <button type="button" onClick={() => void togglePin(message)}>{message.pinnedAt ? "取消置顶" : "置顶"}</button>}{message.sender.id === currentUserId && message.status === "active" && <button type="button" onClick={() => void retract(message)}>撤回</button>}{message.sender.id !== currentUserId && message.status === "active" && <button type="button" onClick={() => void report(message)}>举报</button>}</div>
            </article>)}
          </div>
          {newMessageCount > 0 && <button className="enhe-chat-unread-marker enhe-chat-button enhe-chat-button-primary" type="button" onClick={() => { if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight; bottomRef.current = true; setNewMessageCount(0); void updateReadCursor(); }}><ArrowDown size={15} />{newMessageCount} 条新消息</button>}
          <form className="enhe-chat-composer" onSubmit={(event) => void sendMessage(event)}>
            {replyTo && <div className="enhe-chat-composer-preview">回复 {replyTo.sender.nickname}：{replyTo.text.slice(0, 120)}<button type="button" aria-label="取消回复" onClick={() => setReplyTo(null)}><X size={16} /></button></div>}
            {draftReplyUnavailable && !replyTo && <div className="enhe-chat-inline-error" role="status">草稿引用的消息无法恢复，请重新选择引用内容或移除引用提示。<button type="button" onClick={() => setDraftReplyUnavailable(false)}>移除引用提示</button></div>}
            {draftAttachmentNotice && <div className="enhe-chat-inline-error" role="status">此草稿包含会话结束后失效的图片，请重新选择图片，或确认移除失效图片。<button type="button" onClick={() => setDraftAttachmentNotice(false)}>移除失效图片</button></div>}
            {selectedReference && <div className="enhe-chat-composer-preview"><Link2 size={15} />已关联：{selectedReference.title}<button type="button" aria-label="移除关联内容" onClick={() => setSelectedReference(null)}><X size={16} /></button></div>}
            {files.length > 0 && <div className="enhe-chat-upload-previews">{files.map((file) => <span key={file.preview}><img src={file.preview} alt="待发送图片预览" /><button type="button" aria-label="移除图片" onClick={() => { URL.revokeObjectURL(file.preview); setFiles((current) => current.filter((entry) => entry.preview !== file.preview)); }}><X size={14} /></button></span>)}</div>}
            {mentions.length > 0 && <p className="enhe-chat-muted">将提醒 {mentions.length} 位成员。<button type="button" onClick={() => setMentions([])}>清除</button></p>}
            <textarea className="enhe-chat-textarea enhe-chat-input" aria-label="输入群聊消息" placeholder={member.muted ? "你当前处于禁言状态" : group.readOnly ? "群聊当前为只读" : "输入消息，Enter 发送，Shift + Enter 换行"} maxLength={2000} value={text} disabled={member.muted || group.readOnly} onChange={(event) => setText(event.target.value)} onKeyDown={onComposerKeyDown} onCompositionStart={() => { composingRef.current = true; }} onCompositionEnd={() => { composingRef.current = false; }} onPaste={onPaste} />
            <div className="enhe-chat-composer-tools">
              <label className="enhe-chat-button" aria-label="添加图片"><ImagePlus size={16} />图片<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onFileInput} /></label>
              <details className="enhe-chat-emoji-picker"><summary className="enhe-chat-button"><Smile size={16} />表情</summary><div className="enhe-chat-emoji-options">{emojis.map((emoji) => <button key={emoji.id} type="button" title={emoji.name} aria-label={emoji.name} onClick={() => setSelectedEmojiIds((current) => current.includes(emoji.id) ? current : [...current, emoji.id])}>{emoji.value ?? emoji.emoji}</button>)}</div></details>
              <details className="enhe-chat-reference-picker"><summary className="enhe-chat-button"><Paperclip size={16} />关联内容</summary><div className="enhe-chat-reference-search"><select className="enhe-chat-select" aria-label="关联类型" value={contentType} onChange={(event) => setContentType(event.target.value as "tool" | "news")}><option value="tool">产品</option><option value="news">AI 资讯</option></select><input className="enhe-chat-input" placeholder="搜索名称或关键词" value={contentQuery} onChange={(event) => setContentQuery(event.target.value)} />{contentResults.map((item) => <button key={`${item.type}:${item.id}`} type="button" className="enhe-chat-result" onClick={() => { setSelectedReference(item); setContentQuery(""); setContentResults([]); }}>{item.title}</button>)}</div></details>
              {canManage && <button type="button" className="enhe-chat-button" onClick={() => setText((value) => `${value}${value && !value.endsWith(" ") ? " " : ""}@所有人 `)}> @所有人</button>}
              <span className="enhe-chat-character-count">{Array.from(text).length}/2000</span>
              <button type="submit" className="enhe-chat-button enhe-chat-button-primary" disabled={busy || member.muted || group.readOnly}>{busy ? "发送中…" : <><Send size={16} />发送</>}</button>
            </div>
          </form>
        </main>
        {sideOpen && <aside className="enhe-chat-room-side enhe-chat-card"><h2>群资料</h2><p>{group.description}</p><section className="enhe-chat-panel"><h3>群规</h3><p style={{ whiteSpace: "pre-wrap" }}>{group.rules || "群主暂未填写群规。"}</p></section><h3>群成员</h3>{members.map((profile) => <div className="enhe-chat-member" key={profile.id}>{profile.avatar ? <img className="enhe-chat-avatar" src={profile.avatar} alt="" /> : <span className="enhe-chat-avatar" aria-hidden="true">{profile.nickname.slice(0, 1)}</span>}<div><strong>{profile.nickname}</strong><div className="enhe-chat-muted">{roleNames[profile.role] ?? "成员"}</div></div><button type="button" className="enhe-chat-quiet-button" onClick={() => addMention(profile)}>@</button></div>)}{canManage && <Link className="enhe-chat-button" href={`/chat/${group.id}/manage`}>群管理</Link>}<button className="enhe-chat-button" type="button" onClick={() => void leaveGroup()}>退出群聊</button></aside>}
      </div>
      {lightboxIndex !== null && lightboxImages[lightboxIndex] && <div className="enhe-chat-lightbox" role="dialog" aria-modal="true" aria-label="群聊图片查看器" onClick={() => setLightboxIndex(null)}><button type="button" className="enhe-chat-lightbox-close" aria-label="关闭图片" onClick={() => setLightboxIndex(null)}><X size={24} /></button>{lightboxImages.length > 1 && <button type="button" className="enhe-chat-lightbox-nav enhe-chat-lightbox-prev" aria-label="上一张" onClick={(event) => { event.stopPropagation(); setLightboxIndex((index) => index === null ? null : (index + lightboxImages.length - 1) % lightboxImages.length); }}><ChevronLeft size={28} /></button>}<img src={lightboxImages[lightboxIndex].url} alt={`群聊图片 ${lightboxIndex + 1}/${lightboxImages.length}`} onClick={(event) => event.stopPropagation()} />{lightboxImages.length > 1 && <button type="button" className="enhe-chat-lightbox-nav enhe-chat-lightbox-next" aria-label="下一张" onClick={(event) => { event.stopPropagation(); setLightboxIndex((index) => index === null ? null : (index + 1) % lightboxImages.length); }}><ChevronRight size={28} /></button>}<span>{lightboxIndex + 1} / {lightboxImages.length}</span></div>}
    </section>
  );
}
