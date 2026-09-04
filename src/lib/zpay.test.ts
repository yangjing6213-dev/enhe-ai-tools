import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildZpaySignedParams,
  formatZpayAmount,
  mapPaymentMethodToZpayType,
  normalizeZpayItemName,
  verifyZpayNotifyPayload
} from "@/lib/zpay";
import { loadZpayConfig } from "@/lib/zpay-config";

const merchantKey = "test_secret_32_chars_1234567890";

describe("zpay signing", () => {
  it("sorts non-empty fields, excludes sign_type, and appends the merchant key", () => {
    const signed = buildZpaySignedParams(
      {
        pid: "2026061115080760",
        type: "wxpay",
        out_trade_no: "ENHE202606111930001234",
        notify_url: "https://www.enhe-tech.com.cn/api/zpay/notify",
        return_url: "https://www.enhe-tech.com.cn/orders/order123",
        name: "ENHE paid download",
        money: "9.90",
        cid: "18680",
        param: "order123",
        sign_type: "MD5"
      },
      merchantKey
    );

    expect(signed.sign).toBe("8d6418fde7dca138de26c2d1f25bb49a");
    expect(signed.sign_type).toBe("MD5");
  });

  it("verifies a successful notify payload and rejects tampered amounts", () => {
    const payload = {
      pid: "2026061115080760",
      name: "ENHE paid download",
      money: "9.90",
      out_trade_no: "ENHE202606111930001234",
      trade_no: "202606112200001",
      param: "order123",
      trade_status: "TRADE_SUCCESS",
      type: "wxpay",
      sign: "2ec5a62c0ae6eef480e1d8d8a3d9fb91",
      sign_type: "MD5"
    };

    expect(verifyZpayNotifyPayload(payload, merchantKey)).toEqual({
      ok: true,
      reason: null
    });
    expect(verifyZpayNotifyPayload({ ...payload, money: "9.91" }, merchantKey)).toEqual({
      ok: false,
      reason: "invalid-signature"
    });
  });
});

describe("zpay config", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("loads process env first and falls back to zpay.env in the project root", () => {
    tempDir = mkdtempSync(join(tmpdir(), "zpay-config-"));
    writeFileSync(
      join(tempDir, "zpay.env"),
      [
        "ZPAY_API_BASE=https://zpayz.cn",
        "ZPAY_PID=2026061115080760",
        "ZPAY_KEY=from-file-key-123456789012",
        "ZPAY_DEFAULT_TYPE=wxpay",
        "ZPAY_CHANNEL_ID=18680",
        "NEXT_PUBLIC_SITE_URL=https://www.enhe-tech.com.cn"
      ].join("\n")
    );

    const config = loadZpayConfig({
      cwd: tempDir,
      env: {
        ZPAY_KEY: "from-env-key-1234567890123"
      }
    });

    expect(config).toMatchObject({
      apiBase: "https://zpayz.cn",
      pid: "2026061115080760",
      key: "from-env-key-1234567890123",
      defaultType: "wxpay",
      channelId: "18680",
      siteUrl: "https://www.enhe-tech.com.cn"
    });
  });
});

describe("zpay request normalization", () => {
  it("formats decimal amounts with two places", () => {
    expect(formatZpayAmount("9.9")).toBe("9.90");
    expect(formatZpayAmount(0.01)).toBe("0.01");
  });

  it("keeps item names within the payment channel byte limit", () => {
    const itemName = normalizeZpayItemName(
      "AI Video Studio 无所不能版本｜本地AI视频生成工作站｜文生视频 图生视频 视频增强 完整部署包 下载授权"
    );

    expect(Buffer.byteLength(itemName, "utf8")).toBeLessThanOrEqual(96);
    expect(itemName).toMatch(/^AI Video Studio/);
  });

  it("maps local payment methods to zpay payment types", () => {
    expect(mapPaymentMethodToZpayType("wechat")).toBe("wxpay");
    expect(mapPaymentMethodToZpayType("alipay")).toBe("alipay");
    expect(mapPaymentMethodToZpayType(null, "wxpay")).toBe("wxpay");
  });
});
