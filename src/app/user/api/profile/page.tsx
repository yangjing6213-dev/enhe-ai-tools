import type { Metadata } from "next";
import { DeveloperProfilePage } from "@/features/enhe-api/components/developer-profile-page";
import { getOrCreateApiDeveloperProfile } from "@/features/enhe-api/server/developer-profile";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "开发者资料 | ENHE API"
};

export default async function UserApiProfilePage({
  searchParams
}: {
  searchParams: Promise<{ profile?: string; profile_error?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const developerProfile = await getOrCreateApiDeveloperProfile(user);

  return (
    <DeveloperProfilePage
      profile={{
        displayName: developerProfile.displayName,
        email: developerProfile.emailSnapshot ?? user.email,
        developerId: developerProfile.developerId,
        status: developerProfile.status,
        createdAt: developerProfile.createdAt
      }}
      message={params.profile === "updated" ? "显示名称已更新。" : null}
      error={params.profile_error ?? null}
    />
  );
}
