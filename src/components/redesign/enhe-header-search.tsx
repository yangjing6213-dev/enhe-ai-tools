"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { PrefetchLink } from "@/components/prefetch-link";
import type { SearchRecommendation } from "@/lib/public-search-recommendations";
import type { RedesignLocale } from "./types";

export function EnheHeaderSearch({ locale, recommendations = [] }: {
  locale: RedesignLocale;
  recommendations?: readonly SearchRecommendation[];
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const id = useId();
  const isEnglish = locale === "en";
  const searchPath = isEnglish ? "/en/search" : "/search";
  const title = isEnglish ? "Most downloaded" : "下载最多的产品";
  const searchLabel = isEnglish ? "Search products" : "搜索产品";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <form
          ref={formRef}
          className="redesign-header-search"
          role="search"
          aria-label={searchLabel}
          action={searchPath}
          method="get"
          onSubmit={(event) => {
            event.preventDefault();
            const query = inputRef.current?.value.trim() ?? "";
            setOpen(false);
            router.push(query ? `${searchPath}?${new URLSearchParams({ q: query })}` : searchPath);
          }}
        >
          <Input
            ref={inputRef}
            type="search"
            role="combobox"
            name="q"
            maxLength={80}
            autoComplete="off"
            aria-label={searchLabel}
            aria-autocomplete="none"
            aria-expanded={open}
            aria-controls={open ? id : undefined}
            aria-haspopup="dialog"
            placeholder={isEnglish ? "Search AI tools…" : "搜索你需要的 AI 工具…"}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && open) {
                event.preventDefault();
                panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
              }
              if (event.key === "Escape") setOpen(false);
            }}
          />
          <Button type="submit" variant="ghost" size="icon" className="redesign-header-search-submit" aria-label={isEnglish ? "Submit search" : "提交搜索"}>
            <Search aria-hidden="true" />
          </Button>
        </form>
      </PopoverAnchor>
      <PopoverContent
        ref={panelRef}
        id={id}
        className="redesign-header-search-panel"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        aria-labelledby={`${id}-title`}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={() => inputRef.current?.focus()}
        onInteractOutside={(event) => {
          if (event.target instanceof Node && formRef.current?.contains(event.target)) event.preventDefault();
        }}
      >
        <h2 id={`${id}-title`}>{title}</h2>
        {recommendations.length ? (
          <ul>
            {recommendations.map((product) => (
              <li key={product.id}>
                <PrefetchLink href={product.href} prefetch={false} onClick={() => setOpen(false)}>
                  <strong>{product.title}</strong>
                  <span>{product.category} · {product.downloadCount.toLocaleString(isEnglish ? "en-US" : "zh-CN")} {isEnglish ? "downloads" : "次下载"}</span>
                </PrefetchLink>
              </li>
            ))}
          </ul>
        ) : <p>{isEnglish ? "Recommendations are not available yet. Search for a product above." : "暂无下载推荐，可以输入关键词搜索产品。"}</p>}
      </PopoverContent>
    </Popover>
  );
}
