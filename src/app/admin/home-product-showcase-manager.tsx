"use client";

import { useState } from "react";
import { saveHomeProductShowcaseAction } from "@/app/admin/actions";
import { Field, inputClass, selectClass, textareaClass } from "@/app/admin/admin-ui";
import { ProductDemoVideoUploadField } from "@/app/admin/product-demo-video-upload-field";
import {
  moveHomeShowcaseProduct,
  type HomeProductShowcaseItem,
} from "@/lib/redesign/home/home-product-showcase";
import type { RedesignLocale } from "@/components/redesign/types";

export function HomeProductShowcaseManager({
  initialProducts,
}: {
  initialProducts: HomeProductShowcaseItem[];
}) {
  const [products, setProducts] = useState(initialProducts);

  function updateProduct(id: string, update: Partial<HomeProductShowcaseItem>) {
    setProducts((current) => current.map((product) => product.id === id ? { ...product, ...update } : product));
  }

  function updateLocalized(id: string, field: "name" | "description" | "alt" | "detailHref", locale: RedesignLocale, value: string) {
    setProducts((current) => current.map((product) => product.id === id
      ? { ...product, [field]: { ...product[field], [locale]: value } }
      : product));
  }

  function addProduct() {
    const id = `new-${crypto.randomUUID()}`;
    setProducts((current) => [...current, {
      id,
      name: { zh: "新推荐产品", en: "New featured product" },
      description: { zh: "请填写产品介绍。", en: "Add a short product description." },
      alt: { zh: "产品展示内容", en: "Product showcase media" },
      mediaType: "image",
      mediaSrc: "",
      detailHref: { zh: "/", en: "/en" },
    }]);
  }

  return (
    <form action={saveHomeProductShowcaseAction} className="enhe-admin-content-form grid gap-5">
      <input type="hidden" name="productsJson" value={JSON.stringify({ version: 1, products })} readOnly />
      {products.map((product, index) => (
        <fieldset key={product.id} data-home-showcase-product={product.id} className="grid gap-5 rounded-2xl border border-white/12 bg-white/5 p-5">
          <legend className="px-2 text-lg font-bold">第 {index + 1} 项推荐</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setProducts((current) => moveHomeShowcaseProduct(current, product.id, -1))} disabled={index === 0} className="rounded-full border border-white/15 px-4 py-2 text-sm disabled:opacity-40">上移</button>
            <button type="button" onClick={() => setProducts((current) => moveHomeShowcaseProduct(current, product.id, 1))} disabled={index === products.length - 1} className="rounded-full border border-white/15 px-4 py-2 text-sm disabled:opacity-40">下移</button>
            <button type="button" onClick={() => setProducts((current) => current.length > 1 ? current.filter(({ id }) => id !== product.id) : current)} disabled={products.length <= 1} className="rounded-full border border-red-300/40 px-4 py-2 text-sm text-red-100 disabled:opacity-40">删除此项</button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="中文名称">
              <input className={inputClass} value={product.name.zh} onChange={(event) => updateLocalized(product.id, "name", "zh", event.currentTarget.value)} required />
            </Field>
            <Field label="英文名称">
              <input className={inputClass} value={product.name.en} onChange={(event) => updateLocalized(product.id, "name", "en", event.currentTarget.value)} required />
            </Field>
            <Field label="中文介绍">
              <textarea className={textareaClass} value={product.description.zh} onChange={(event) => updateLocalized(product.id, "description", "zh", event.currentTarget.value)} required />
            </Field>
            <Field label="英文介绍">
              <textarea className={textareaClass} value={product.description.en} onChange={(event) => updateLocalized(product.id, "description", "en", event.currentTarget.value)} required />
            </Field>
            <Field label="中文详情链接">
              <input className={inputClass} value={product.detailHref.zh} onChange={(event) => updateLocalized(product.id, "detailHref", "zh", event.currentTarget.value)} required />
            </Field>
            <Field label="英文详情链接">
              <input className={inputClass} value={product.detailHref.en} onChange={(event) => updateLocalized(product.id, "detailHref", "en", event.currentTarget.value)} required />
            </Field>
            <Field label="媒体类型">
              <select className={selectClass} value={product.mediaType} onChange={(event) => updateProduct(product.id, { mediaType: event.currentTarget.value as "image" | "video" })}>
                <option value="image">图片</option>
                <option value="video">视频</option>
              </select>
            </Field>
            <Field label="中文图片说明（替代文字）">
              <input className={inputClass} value={product.alt.zh} onChange={(event) => updateLocalized(product.id, "alt", "zh", event.currentTarget.value)} required />
            </Field>
            <Field label="英文图片说明（替代文字）">
              <input className={inputClass} value={product.alt.en} onChange={(event) => updateLocalized(product.id, "alt", "en", event.currentTarget.value)} required />
            </Field>
            <Field label={product.mediaType === "video" ? "视频地址" : "图片地址"} className="md:col-span-2">
              <input className={inputClass} value={product.mediaSrc} onChange={(event) => updateProduct(product.id, { mediaSrc: event.currentTarget.value })} placeholder="可填写站内地址或 https:// 地址" required />
              {product.mediaType === "video" ? (
                <ProductDemoVideoUploadField
                  currentUrl={product.mediaSrc}
                  inputClass={inputClass}
                  slug={product.id}
                  folderPrefix="homepage-showcase"
                  fieldName={null}
                  onUrlChange={(mediaSrc) => updateProduct(product.id, { mediaSrc })}
                />
              ) : null}
            </Field>
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={addProduct} className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold">新增推荐产品</button>
        <button type="submit" className="enhe-admin-content-primary-action rounded-full px-5 py-3 text-sm font-semibold">保存首页推荐</button>
      </div>
      <p className="text-sm text-[#8B95A7]">保存后，中英文首页会使用这里的顺序和内容。删除只会移出首页推荐，不会删除商品、订单或演示记录。</p>
    </form>
  );
}
