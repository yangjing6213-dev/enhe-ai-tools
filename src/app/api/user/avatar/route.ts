import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDefaultAvatar } from "@/lib/default-avatar";
import { resolveUserAvatarSrc } from "@/lib/user-avatar";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const source = user
    ? await resolveUserAvatarSrc(user.avatar) || getDefaultAvatar(user.id)
    : getDefaultAvatar("guest");
  return new NextResponse(null, {
    status: 307,
    headers: { Location: source, "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" },
  });
}
