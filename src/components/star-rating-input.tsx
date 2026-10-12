"use client";
import { useState } from "react";
import PeekRating from "@/components/PeekRating";
import "./comment-peek-rating.css";

export function StarRatingInput({ locale }: { locale: "zh" | "en" }) {
  const [rating, setRating] = useState(0);
  const legend = locale === "en" ? "Your rating" : "满意度评分";
  const words = locale === "en" ? ["Poor", "Fair", "Good", "Great", "Superb"] : ["不满意", "一般", "满意", "很满意", "非常满意"];
  return <fieldset className="comment-peek-rating mb-4">
    <legend className="mb-2 text-sm font-semibold">{legend} <span aria-hidden="true">*</span></legend>
    <PeekRating value={rating} count={5} shape="star" labels={words.map((word, i) => locale === "en" ? `${i + 1} out of 5 stars, ${word}` : `${i + 1} 星，${word}`)}
      ariaLabel={legend} onChange={setRating} size={32} lift={7} magnify={1.15} riseDuration={320} popScale={1.3} showTip allowClear />
    <input type="number" name="rating" min={1} max={5} required value={rating || ""} className="sr-only" tabIndex={-1} aria-label={legend}
      onChange={() => {}} onInvalid={event => { event.preventDefault(); event.currentTarget.closest("fieldset")?.querySelector<HTMLButtonElement>("button")?.focus(); }} />
    <p className="mt-1 text-xs">{locale === "en" ? "Choose 1 to 5 stars." : "请选择 1 至 5 星。"}</p>
  </fieldset>;
}

export function CommentRatingDisplay({ rating, locale }: { rating: number | null; locale: "zh" | "en" }) {
  if (!rating) return <span>{locale === "en" ? "Not rated" : "未评分"}</span>;
  return <span className="comment-peek-rating comment-peek-rating-display"><PeekRating value={rating} readOnly count={5} shape="star" size={18} lift={0} showTip={false}
    ariaLabel={locale === "en" ? `${rating} out of 5 stars` : `${rating} 星`} /></span>;
}