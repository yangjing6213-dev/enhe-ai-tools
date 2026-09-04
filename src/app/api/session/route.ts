import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  return NextResponse.json(
    {
      user: user
        ? {
            email: user.email,
            nickname: user.nickname,
            role: user.role
          }
        : null
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0"
      }
    }
  );
}
