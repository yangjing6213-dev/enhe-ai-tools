import { NextResponse } from "next/server";
import { activateOrderFromZpayNotify, coerceZpayPayload } from "@/lib/zpay-orders";

export async function GET(request: Request) {
  try {
    const payload = coerceZpayPayload(new URL(request.url).searchParams);
    const result = await activateOrderFromZpayNotify(payload);
    return new NextResponse(result.response, { status: result.status });
  } catch (error) {
    console.error("[zpay] notify handler failed", error);
    return new NextResponse("server-error", { status: 500 });
  }
}
