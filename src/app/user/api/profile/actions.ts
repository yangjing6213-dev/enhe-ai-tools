"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getOrCreateApiDeveloperProfile,
  validateDeveloperDisplayName
} from "@/features/enhe-api/server/developer-profile";

export async function updateDeveloperDisplayNameAction(formData: FormData) {
  const user = await requireUser();
  const validation = validateDeveloperDisplayName(formData.get("displayName"));

  if (!validation.ok) {
    redirect(`/user/api/profile?profile_error=${encodeURIComponent(validation.message)}`);
  }

  await getOrCreateApiDeveloperProfile(user);
  await prisma.apiDeveloperProfile.update({
    where: { userId: user.id },
    data: { displayName: validation.displayName }
  });

  revalidatePath("/user/api");
  revalidatePath("/user/api/profile");
  redirect("/user/api/profile?profile=updated");
}
