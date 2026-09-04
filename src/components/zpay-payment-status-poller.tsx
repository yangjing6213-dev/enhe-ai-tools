"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ZpayPaymentStatusPollerProps = {
  orderId: string;
  toolHref?: string | null;
};

export function ZpayPaymentStatusPoller({ orderId, toolHref }: ZpayPaymentStatusPollerProps) {
  const router = useRouter();
  const [message, setMessage] = useState("正在等待支付结果，请保持页面打开。");

  useEffect(() => {
    let stopped = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const response = await fetch(`/api/orders/${orderId}/payment-status`, { cache: "no-store" });
        if (!response.ok) {
          if (!stopped) setMessage("暂时无法读取支付结果，请稍后刷新页面。");
          return;
        }
        const data = (await response.json()) as {
          unlocked?: boolean;
        };
        if (data.unlocked) {
          setMessage("支付成功，下载链接已解锁，正在跳转...");
          const target = toolHref || `/orders/${orderId}?paid=success`;
          router.replace(target);
          return;
        }
        if (!stopped) {
          setMessage("正在等待支付结果，请保持页面打开。");
        }
      } catch {
        if (!stopped) setMessage("正在等待支付结果，请保持页面打开。");
      }

      if (!stopped && attempts < 120) {
        window.setTimeout(poll, 3000);
      }
    }

    const timer = window.setTimeout(poll, 2000);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [orderId, router, toolHref]);

  return (
    <div className="status-success mt-6" aria-live="polite">
      {message}
    </div>
  );
}
