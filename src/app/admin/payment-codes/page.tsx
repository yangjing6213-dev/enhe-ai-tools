import Image from "next/image";
import { updatePaymentQrCodesAction } from "@/app/admin/actions";
import { AdminSection, Field, inputClass, SubmitButton } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import { getCurrentLocale } from "@/lib/i18n";
import { isImagePath, normalizeImageSrc } from "@/lib/media";
import { getEffectivePaymentQrCode } from "@/lib/settings";

type AdminPaymentCodesPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

const paymentCodeCopy = {
  zh: {
    title: "收款码管理",
    intro: "集中更新订单支付页展示的支付宝和微信个人收款码。可直接粘贴图片地址，也可以上传本地二维码图片；配置腾讯云 COS 后上传会自动写入 COS。",
    saved: "收款码已保存，支付页会优先展示新的收款码。",
    alipay: "支付宝收款码",
    wechat: "微信收款码",
    url: "图片地址",
    upload: "本地上传",
    current: "当前展示",
    fallback: "未配置时使用默认收款码",
    hint: "支持 JPG、PNG、WebP、GIF、SVG，建议使用竖版高清二维码。清空地址并保存可恢复默认二维码。",
    submit: "保存收款码"
  },
  en: {
    title: "Payment QR Codes",
    intro: "Update the Alipay and WeChat personal payment QR codes shown on order payment pages. Paste an image URL or upload a local QR image; Tencent COS is used automatically when configured.",
    saved: "Payment QR codes saved. Payment pages now prefer the new codes.",
    alipay: "Alipay QR code",
    wechat: "WeChat QR code",
    url: "Image URL",
    upload: "Local upload",
    current: "Current display",
    fallback: "Default QR code is used when empty",
    hint: "Supports JPG, PNG, WebP, GIF, and SVG. Use a sharp portrait QR image. Clear a URL and save to restore the default QR code.",
    submit: "Save QR codes"
  }
} as const;

export default async function AdminPaymentCodesPage({ searchParams }: AdminPaymentCodesPageProps) {
  const [query, locale, settings] = await Promise.all([
    searchParams,
    getCurrentLocale(),
    prisma.siteSetting.findMany({ where: { key: { in: ["alipay_qr", "wechat_qr"] } } })
  ]);
  const t = paymentCodeCopy[locale];
  const settingsMap = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
  const alipayQr = getEffectivePaymentQrCode(settingsMap.alipay_qr, "/images/payment/alipay-qr.jpg", "/images/alipay-qr.svg");
  const wechatQr = getEffectivePaymentQrCode(settingsMap.wechat_qr, "/images/payment/wechat-qr.jpg", "/images/wechat-qr.svg");

  return (
    <AdminSection title={t.title} intro={t.intro}>
      {query.saved ? (
        <p className="mb-5 rounded-2xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-5 py-4 text-sm text-[#A8FFF0]">{t.saved}</p>
      ) : null}
      {query.error ? (
        <p className="mb-5 rounded-2xl border border-red-300/30 bg-red-400/10 px-5 py-4 text-sm text-red-100">{query.error}</p>
      ) : null}

      <form action={updatePaymentQrCodesAction} className="dossier-card grid gap-6 p-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <PaymentCodeEditor title={t.alipay} value={settingsMap.alipay_qr ?? ""} preview={alipayQr} urlLabel={t.url} uploadLabel={t.upload} currentLabel={t.current} name="alipayQr" fileName="alipayQrFile" />
          <PaymentCodeEditor title={t.wechat} value={settingsMap.wechat_qr ?? ""} preview={wechatQr} urlLabel={t.url} uploadLabel={t.upload} currentLabel={t.current} name="wechatQr" fileName="wechatQrFile" />
        </div>
        <p className="rounded-2xl border border-[#FFB86B]/25 bg-[#FFB86B]/10 px-4 py-3 text-sm leading-6 text-[#FFD6A5]">{t.hint}</p>
        <div>
          <SubmitButton>{t.submit}</SubmitButton>
        </div>
      </form>
    </AdminSection>
  );
}

function PaymentCodeEditor({
  title,
  value,
  preview,
  urlLabel,
  uploadLabel,
  currentLabel,
  name,
  fileName
}: {
  title: string;
  value: string;
  preview: string;
  urlLabel: string;
  uploadLabel: string;
  currentLabel: string;
  name: string;
  fileName: string;
}) {
  return (
    <section className="rounded-2xl border border-[rgba(210,230,255,0.16)] bg-[rgba(238,246,255,0.05)] p-5">
      <h2 className="text-lg font-semibold text-[#F6FAFF]">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-[190px_1fr]">
        <QrPreview title={`${title} ${currentLabel}`} value={preview} />
        <div className="grid gap-4">
          <Field label={urlLabel}>
            <input name={name} defaultValue={value} className={inputClass} placeholder="/uploads/payment-qr.png 或 https://..." />
          </Field>
          <Field label={uploadLabel}>
            <input name={fileName} type="file" accept="image/*" className={inputClass} />
          </Field>
        </div>
      </div>
    </section>
  );
}

function QrPreview({ title, value }: { title: string; value: string }) {
  const src = normalizeImageSrc(value);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-3 text-center">
      <div className="relative mx-auto flex aspect-[3/4] w-full max-w-[170px] items-center justify-center overflow-hidden rounded-xl bg-white p-2 text-xs text-slate-900">
        {src && isImagePath(src) ? (
          <Image src={src} alt={title} width={240} height={320} className="h-full w-full object-contain" unoptimized />
        ) : value ? (
          <span className="break-all">{value}</span>
        ) : (
          title
        )}
      </div>
      <p className="mt-3 text-xs text-[#8F9DB2]">{title}</p>
    </div>
  );
}
