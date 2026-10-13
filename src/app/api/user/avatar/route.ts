import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDefaultAvatar } from "@/lib/default-avatar";
import { resolveUserAvatarSrc } from "@/lib/user-avatar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const source = user
    ? await resolveUserAvatarSrc(user.avatar) || getDefaultAvatar(user.id)
    : getDefaultAvatar("guest");
  return NextResponse.redirect(new URL(source, request.url), {
    status: 307,
    headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" },
  });
}
