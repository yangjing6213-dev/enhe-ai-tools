"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { localeCookieName, normalizeLocale } from "@/lib/i18n";

export async function setLocaleAction(formData: FormData) {
  const locale = normalizeLocale(formData.get("locale"));
  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax"
  });
  revalidatePath("/", "layout");
}
