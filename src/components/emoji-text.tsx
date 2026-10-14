"use client";

import { useEmojiCatalog } from "@/components/emoji-provider";
import { emojiImageSource, splitEmojiText } from "@/lib/emojis";

export function EmojiText({ text, className }: { text: string; className?: string }) {
  const entries = useEmojiCatalog();
  return <span className={className}>{splitEmojiText(text, entries).map((part, index) => part.emoji ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={index} className="enhe-inline-emoji" src={emojiImageSource(part.emoji)} alt={`[${part.emoji.label}]`} title={part.emoji.label} width={64} height={64} loading="lazy" decoding="async" />
  ) : part.text)}</span>;
}
