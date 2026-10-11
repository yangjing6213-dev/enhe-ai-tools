"use client";

import { useState } from "react";

export function StarRatingInput({ locale }: { locale: "zh" | "en" }) {
  const [rating, setRating] = useState(0);
  const legend = locale === "en" ? "Your rating" : "满意度评分";

  return (
    <fieldset className="mb-4">
      <legend className="mb-2 text-sm font-semibold text-[#F6FAFF]">{legend} <span aria-hidden="true">*</span></legend>
      <div role="radiogroup" aria-label={legend} className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <label key={value} className="cursor-pointer rounded px-1 py-1 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--enhe-action)]">
            <input
              className="sr-only"
              type="radio"
              name="rating"
              value={value}
              checked={rating === value}
              onChange={() => setRating(value)}
              required
              aria-label={locale === "en" ? `${value} out of 5 stars` : `${value} 星`}
            />
            <span aria-hidden="true" className={`text-2xl ${rating >= value ? "text-amber-400" : "text-[#8F9DB2]"}`}>★</span>
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-[#8F9DB2]">{locale === "en" ? "Choose 1 to 5 stars." : "请选择 1 至 5 星。"}</p>
    </fieldset>
  );
}
