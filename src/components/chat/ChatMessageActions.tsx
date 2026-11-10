"use client";

import { Copy, Flag, Pin, PinOff, Reply, Undo2 } from "lucide-react";

export function ChatMessageActions({
  canManage,
  canRetract,
  canReport,
  isActive,
  isPinned,
  onReply,
  onCopy,
  onTogglePin,
  onRetract,
  onReport,
}: {
  canManage: boolean;
  canRetract: boolean;
  canReport: boolean;
  isActive: boolean;
  isPinned: boolean;
  onReply: () => void;
  onCopy: () => void;
  onTogglePin: () => void;
  onRetract: () => void;
  onReport: () => void;
}) {
  return (
    <div className="enhe-chat-message-actions">
      <button className="enhe-chat-icon-button enhe-chat-message-action" type="button" aria-label="回复" title="回复" onClick={onReply}><Reply size={16} /></button>
      <button className="enhe-chat-icon-button enhe-chat-message-action" type="button" aria-label="复制文字" title="复制文字" onClick={onCopy}><Copy size={16} /></button>
      {canManage && isActive && <button className="enhe-chat-icon-button enhe-chat-message-action" type="button" aria-label={isPinned ? "取消置顶" : "置顶"} title={isPinned ? "取消置顶" : "置顶"} onClick={onTogglePin}>{isPinned ? <PinOff size={16} /> : <Pin size={16} />}</button>}
      {canRetract && isActive && <button className="enhe-chat-icon-button enhe-chat-message-action" type="button" aria-label="撤回" title="撤回" onClick={onRetract}><Undo2 size={16} /></button>}
      {canReport && isActive && <button className="enhe-chat-icon-button enhe-chat-message-action" type="button" aria-label="举报" title="举报" onClick={onReport}><Flag size={16} /></button>}
    </div>
  );
}
