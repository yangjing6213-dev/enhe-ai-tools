"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { normalizeImageSrc } from "@/lib/media";

type ProductImageCopy = {
  productImageAlt: string;
  keepProductImage: string;
  productImagePosition: string;
  productImageMoveUp: string;
  productImageMoveDown: string;
  productImageRemoved: string;
};

type ProductImageItem = {
  id: string;
  src: string;
  keep: boolean;
};

export function ToolProductImageManager({
  screenshots,
  copy
}: {
  screenshots: string[];
  copy: ProductImageCopy;
}) {
  const [images, setImages] = useState<ProductImageItem[]>(() =>
    screenshots.map((src, index) => ({ id: `${index}-${src}`, src, keep: true }))
  );

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      const currentItem = next[index];
      const targetItem = next[targetIndex];
      if (!currentItem || !targetItem) return current;

      next[index] = targetItem;
      next[targetIndex] = currentItem;
      return next;
    });
  }

  function toggleImage(index: number) {
    setImages((current) =>
      current.map((image, imageIndex) =>
        imageIndex === index ? { ...image, keep: !image.keep } : image
      )
    );
  }

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image, index) => {
        const imageSrc = normalizeImageSrc(image.src);
        const positionText = copy.productImagePosition.replace("{position}", String(index + 1));

        return (
          <div
            key={image.id}
            className={`group overflow-hidden rounded-2xl border border-white/10 bg-[#07101E] transition ${image.keep ? "" : "opacity-55"}`}
          >
            {image.keep ? <input type="hidden" name="existingScreenshots" value={image.src} /> : null}
            <div className="relative aspect-[4/3] overflow-hidden">
              {imageSrc ? (
                <Image
                  src={imageSrc}
                  alt={copy.productImageAlt}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  sizes="240px"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 bg-white/6" />
              )}
              <span className="absolute left-2 top-2 rounded-full border border-black/20 bg-black/55 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur">
                {positionText}
              </span>
              <div className="absolute right-2 top-2 flex gap-1">
                <button
                  type="button"
                  aria-label={`${copy.productImageMoveUp} ${positionText}`}
                  title={copy.productImageMoveUp}
                  disabled={index === 0}
                  onClick={() => moveImage(index, -1)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/55 text-white shadow-sm backdrop-blur transition hover:border-[var(--marketing-accent)]/60 hover:text-[var(--marketing-accent)] disabled:pointer-events-none disabled:opacity-35"
                >
                  <ArrowUp size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`${copy.productImageMoveDown} ${positionText}`}
                  title={copy.productImageMoveDown}
                  disabled={index === images.length - 1}
                  onClick={() => moveImage(index, 1)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/55 text-white shadow-sm backdrop-blur transition hover:border-[var(--marketing-accent)]/60 hover:text-[var(--marketing-accent)] disabled:pointer-events-none disabled:opacity-35"
                >
                  <ArrowDown size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 px-3 py-3 text-xs text-[#C5D0E2]">
              <span className="inline-flex items-center gap-2">
                <input type="checkbox" checked={image.keep} onChange={() => toggleImage(index)} />
                {copy.keepProductImage}
              </span>
              {!image.keep ? <span className="text-[#FFB86B]">{copy.productImageRemoved}</span> : null}
            </label>
          </div>
        );
      })}
    </div>
  );
}
