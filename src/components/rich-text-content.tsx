import type { ReactNode } from "react";
import type { ForumMediaAttachment } from "@/components/forum/forum-media-display";
import { EmojiText } from "@/components/emoji-text";

type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "quote"; text: string }
  | { type: "code"; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "media"; id: string };

function parseTableRow(line: string) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return null;
  return trimmed.replace(/^\|/u, "").replace(/\|$/u, "").split("|").map((cell) => cell.trim());
}

function parseBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const paragraph: string[] = [];
  const code: string[] = [];
  let inCode = false;
  const flushParagraph = () => {
    const text = paragraph.join("\n").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph.length = 0;
  };

  const lines = content.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^```/.test(line.trim())) {
      if (inCode) {
        blocks.push({ type: "code", text: code.join("\n") });
        code.length = 0;
        inCode = false;
      } else {
        flushParagraph();
        inCode = true;
      }
      continue;
    }
    if (inCode) { code.push(line); continue; }
    const headers = parseTableRow(line);
    const divider = parseTableRow(lines[index + 1] ?? "");
    if (headers?.length && divider?.length === headers.length && divider.every((cell) => /^:?-{3,}:?$/u.test(cell))) {
      flushParagraph();
      const rows = [headers];
      let rowIndex = index + 2;
      while (rowIndex < lines.length && lines[rowIndex].trim()) {
        const cells = parseTableRow(lines[rowIndex]);
        if (!cells) break;
        rows.push([...cells.slice(0, headers.length), ...Array(Math.max(0, headers.length - cells.length)).fill("")]);
        rowIndex += 1;
      }
      blocks.push({ type: "table", rows });
      index = rowIndex - 1;
      continue;
    }
    if (!line.trim()) { flushParagraph(); continue; }
    const media = line.trim().match(/^\[\[media[:=]([a-zA-Z0-9_-]{1,100})\]\]$/u);
    const heading = line.match(/^(#{1,2})\s+(.+)$/u);
    const quote = line.match(/^>\s+(.+)$/u);
    if (media) { flushParagraph(); blocks.push({ type: "media", id: media[1] }); }
    else if (heading) { flushParagraph(); blocks.push({ type: "heading", level: heading[1].length === 1 ? 2 : 3, text: heading[2] }); }
    else if (quote) { flushParagraph(); blocks.push({ type: "quote", text: quote[1] }); }
    else paragraph.push(line);
  }
  if (inCode) blocks.push({ type: "code", text: code.join("\n") });
  flushParagraph();
  return blocks;
}

function safeHref(value: string) {
  const href = value.trim();
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//") && !/[\s"'<>]/u.test(href)) return href;
  return null;
}

function InlineText({ text, mediaById, locale }: { text: string; mediaById: Map<string, ForumMediaAttachment>; locale: "zh" | "en" }) {
  const result: ReactNode[] = [];
  const pattern = /\[\[media[:=]([a-zA-Z0-9_-]{1,100})\]\]|\[\[size=(\d{2})\]\]([\s\S]*?)\[\[\/size\]\]|\[\[bg=(#[0-9a-fA-F]{6})\]\]([\s\S]*?)\[\[\/bg\]\]|\*\*([\s\S]+?)\*\*|==([\s\S]+?)==|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/gu;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) result.push(<EmojiText key={`text-${cursor}`} text={text.slice(cursor, match.index)} />);
    if (match[1]) result.push(<InlineMedia key={`media-${match.index}`} id={match[1]} mediaById={mediaById} locale={locale} />);
    else if (match[2]) {
      const size = Math.min(48, Math.max(12, Number(match[2])));
      result.push(<span key={`size-${match.index}`} style={{ fontSize: `${size}px` }}>{match[3]}</span>);
    } else if (match[4]) {
      const color = match[4].toLowerCase();
      result.push(["#fff3cd", "#dbeafe", "#fce7f3"].includes(color)
        ? <span key={`background-${match.index}`} style={{ backgroundColor: color, borderRadius: 3, paddingInline: 2 }}><EmojiText text={match[5]} /></span>
        : <EmojiText key={`plain-background-${match.index}`} text={match[5]} />);
    } else if (match[6]) result.push(<strong key={`strong-${match.index}`}><EmojiText text={match[6]} /></strong>);
    else if (match[7]) result.push(<mark key={`highlight-${match.index}`}><EmojiText text={match[7]} /></mark>);
    else if (match[8]) result.push(<code key={`inline-code-${match.index}`}><EmojiText text={match[8]} /></code>);
    else if (match[9]) {
      const href = safeHref(match[10]);
      result.push(href ? <a key={`link-${match.index}`} href={href} {...(/^https?:\/\//i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}><EmojiText text={match[9]} /></a> : <EmojiText key={`plain-link-${match.index}`} text={match[9]} />);
    }
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) result.push(<EmojiText key={`text-${cursor}`} text={text.slice(cursor)} />);
  return <>{result}</>;
}

function InlineMedia({ id, mediaById, locale }: { id: string; mediaById: Map<string, ForumMediaAttachment>; locale: "zh" | "en" }) {
  const item = mediaById.get(id);
  if (!item) return <span role="status">{locale === "en" ? "[Media unavailable]" : "[附件不可用]"}</span>;
  const url = `/api/forum/media/${encodeURIComponent(item.id)}`;
  return <span className="forum-inline-media">
    {item.kind === "image"
      ? <img src={url} alt={item.originalName || (locale === "en" ? "Topic image" : "话题图片")} loading="lazy" />
      : <video src={url} controls playsInline preload="metadata" aria-label={item.originalName || (locale === "en" ? "Topic video" : "话题视频")} />}
  </span>;
}

export function RichTextContent({ content, attachments = [], locale = "zh", className }: { content: string; attachments?: ForumMediaAttachment[]; locale?: "zh" | "en"; className?: string }) {
  const mediaById = new Map(attachments.map((item) => [item.id, item]));
  return <div className={className ?? "rich-text-content"}>
    {parseBlocks(content).map((block, index) => {
      if (block.type === "heading") return block.level === 2 ? <h2 key={index}><InlineText text={block.text} mediaById={mediaById} locale={locale} /></h2> : <h3 key={index}><InlineText text={block.text} mediaById={mediaById} locale={locale} /></h3>;
      if (block.type === "quote") return <blockquote key={index}><InlineText text={block.text} mediaById={mediaById} locale={locale} /></blockquote>;
      if (block.type === "code") return <pre key={index}><code>{block.text}</code></pre>;
      if (block.type === "table") return <div className="rich-text-table-wrapper" key={index}><table className="rich-text-table"><thead><tr>{block.rows[0].map((cell, column) => <th key={column} scope="col"><InlineText text={cell} mediaById={mediaById} locale={locale} /></th>)}</tr></thead><tbody>{block.rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{block.rows[0].map((_, column) => <td key={column}><InlineText text={row[column] ?? ""} mediaById={mediaById} locale={locale} /></td>)}</tr>)}</tbody></table></div>;
      if (block.type === "media") return <div className="rich-text-media-block" key={index}><InlineMedia id={block.id} mediaById={mediaById} locale={locale} /></div>;
      return <p key={index}><InlineText text={block.text} mediaById={mediaById} locale={locale} /></p>;
    })}
  </div>;
}
