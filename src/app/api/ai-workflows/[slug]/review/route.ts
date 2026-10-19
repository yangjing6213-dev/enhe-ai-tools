import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getPrimaryToolPrice } from "@/lib/tool-price-specs";
import { prisma } from "@/lib/db";

const reviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().max(2000).optional().default(""),
});

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  let input: z.infer<typeof reviewInput>;
  try { input = reviewInput.parse(await request.json()); }
  catch { return NextResponse.json({ error: "INVALID_REVIEW" }, { status: 400, headers: { "Cache-Control": "no-store" } }); }

  const { slug } = await params;
  const tool = await prisma.tool.findFirst({
    where: { slug, type: "ai_workflow", status: "published" },
    select: { id: true, isDownloadPaid: true, downloadPrice: true, priceSpecs: { where: { status: "active" }, select: { price: true, status: true } } },
  });
  if (!tool) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });

  const price = getPrimaryToolPrice(tool.priceSpecs, tool.downloadPrice);
  const isPaid = tool.isDownloadPaid && price > 0;
  const canReview = isPaid
    ? Boolean(await prisma.aiWorkflowVersionPurchase.findFirst({
        where: {
          userId: user.id,
          toolId: tool.id,
          order: {
            is: {
              orderStatus: "activated",
              refundRecords: { none: { status: "pending" } },
              OR: [
                { paymentTransaction: { is: null } },
                { paymentTransaction: { is: { refundState: null } } },
                { paymentTransaction: { is: { refundState: "provider_rejected" } } },
              ],
            },
          },
        },
        select: { id: true },
      }))
    : Boolean(await prisma.aiWorkflowDownloadEvent.findFirst({ where: { userId: user.id, toolId: tool.id }, select: { id: true } }));
  if (!canReview) return NextResponse.json({ error: "DOWNLOAD_OR_PURCHASE_REQUIRED" }, { status: 403, headers: { "Cache-Control": "no-store" } });

  const review = await prisma.aiWorkflowReview.upsert({
    where: { userId_toolId: { userId: user.id, toolId: tool.id } },
    update: { rating: input.rating, content: input.content || null, status: "pending" },
    create: { userId: user.id, toolId: tool.id, rating: input.rating, content: input.content || null, status: "pending" },
    select: { id: true, status: true },
  });
  return NextResponse.json({ ok: true, status: review.status }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
