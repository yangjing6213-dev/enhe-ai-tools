import { NextResponse } from "next/server";
import { getAuthSecret, hashSessionToken, signHeaderUserCookieValue, signSessionCookieValue, createSessionToken } from "@/lib/auth-security";
import { headerUserCookieName } from "@/lib/header-user-cookie";
import { prisma } from "@/lib/db";
import {
  getZpayPaymentReturnOrderId,
  isZpayPaymentReturnToken,
  zpayReturnSessionIdPrefix,
} from "@/lib/zpay-payment-return";

export const dynamic = "force-dynamic";

const authCookieName = process.env.AUTH_COOKIE_NAME ?? "enhe_session";
const sessionDays = 30;

type PaymentReturnPageProps = { params: Promise<{ ticket: string }> };

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

function invalidTicketResponse() {
  return new NextResponse(
    '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>支付返回链接已失效</title><body><main><h1>支付返回链接已失效</h1><p>请登录后在用户中心查看订单状态。</p><a href="/login">返回登录</a></main></body></html>',
    { status: 410, headers: { ...noStoreHeaders(), "Content-Type": "text/html; charset=utf-8" } },
  );
}

function paymentPendingResponse() {
  return new NextResponse(
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="3"><title>正在确认付款</title></head><body><main><h1>正在确认付款</h1><p>支付结果确认后，将自动进入用户中心。</p><p>页面会自动重试，请勿重复付款。</p></main></body></html>',
    { status: 202, headers: { ...noStoreHeaders(), "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request, { params }: PaymentReturnPageProps) {
  const { ticket } = await params;
  if (!isZpayPaymentReturnToken(ticket)) return invalidTicketResponse();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const handoff = await tx.session.findFirst({
        where: {
          tokenHash: hashSessionToken(ticket),
          id: { startsWith: zpayReturnSessionIdPrefix },
          revokedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true, userId: true },
      });
      if (!handoff) return { kind: "invalid" as const };

      const orderId = getZpayPaymentReturnOrderId(handoff.id);
      if (!orderId) return { kind: "invalid" as const };

      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          userId: true,
          orderStatus: true,
          paymentTransaction: { select: { status: true } },
          user: { select: { status: true, email: true, nickname: true, role: true } },
        },
      });
      if (!order || order.userId !== handoff.userId || order.user.status !== "active") {
        return { kind: "invalid" as const };
      }
      if (order.orderStatus !== "activated" || order.paymentTransaction?.status !== "paid") {
        return { kind: "pending" as const };
      }

      const consumed = await tx.session.updateMany({
        where: {
          id: handoff.id,
          userId: handoff.userId,
          tokenHash: hashSessionToken(ticket),
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });
      if (consumed.count !== 1) return { kind: "invalid" as const };

      const token = createSessionToken();
      const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * sessionDays);
      const session = await tx.session.create({
        data: {
          userId: handoff.userId,
          tokenHash: hashSessionToken(token),
          userAgent: request.headers.get("user-agent"),
          expiresAt,
        },
        select: { id: true },
      });
      return { kind: "authenticated" as const, sessionId: session.id, token, expiresAt, user: order.user };
    });

    if (result.kind === "invalid") return invalidTicketResponse();
    if (result.kind === "pending") return paymentPendingResponse();

    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionDays * 24 * 60 * 60,
      expires: result.expiresAt,
    };
    const response = NextResponse.redirect(new URL("/user", request.url));
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.cookies.set(authCookieName, signSessionCookieValue(result.sessionId, result.token, getAuthSecret()), cookieOptions);
    const headerSnapshot = Buffer.from(JSON.stringify({
      email: result.user.email,
      nickname: result.user.nickname,
      role: result.user.role,
    }), "utf8").toString("base64url");
    response.cookies.set(headerUserCookieName, signHeaderUserCookieValue(headerSnapshot, getAuthSecret()), cookieOptions);
    return response;
  } catch (error) {
    console.error("[zpay] payment return handler failed", error);
    return new NextResponse("暂时无法确认付款，请稍后重试。", { status: 503, headers: noStoreHeaders() });
  }
}
