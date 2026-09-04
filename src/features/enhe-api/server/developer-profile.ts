import { randomBytes } from "node:crypto";
import { Prisma, type ApiDeveloperProfile } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ApiDeveloperProfileUser = {
  id: string;
  email: string | null;
  name?: string | null;
  nickname?: string | null;
};

const developerIdPrefix = "enhe_dev_";
const defaultDisplayName = "ENHE Developer";
const maxDisplayNameLength = 80;

export async function getOrCreateApiDeveloperProfile(user: ApiDeveloperProfileUser): Promise<ApiDeveloperProfile> {
  const existing = await prisma.apiDeveloperProfile.findUnique({
    where: { userId: user.id }
  });
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.apiDeveloperProfile.create({
        data: {
          userId: user.id,
          developerId: createDeveloperId(),
          displayName: getDefaultDisplayName(user),
          emailSnapshot: user.email
        }
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      const profile = await prisma.apiDeveloperProfile.findUnique({
        where: { userId: user.id }
      });
      if (profile) return profile;
    }
  }

  const profile = await prisma.apiDeveloperProfile.findUnique({
    where: { userId: user.id }
  });
  if (profile) return profile;

  throw new Error("Unable to initialize ENHE API developer profile.");
}

export function validateDeveloperDisplayName(value: FormDataEntryValue | null) {
  const displayName = String(value ?? "").trim();
  if (!displayName) {
    return { ok: false as const, message: "显示名称不能为空。" };
  }
  if (displayName.length > maxDisplayNameLength) {
    return { ok: false as const, message: `显示名称不能超过 ${maxDisplayNameLength} 个字符。` };
  }
  return { ok: true as const, displayName };
}

function createDeveloperId() {
  return `${developerIdPrefix}${randomBytes(4).toString("hex")}`;
}

function getDefaultDisplayName(user: ApiDeveloperProfileUser) {
  const candidate = user.name ?? user.nickname ?? user.email?.split("@")[0] ?? defaultDisplayName;
  const displayName = candidate.trim().slice(0, maxDisplayNameLength);
  return displayName || defaultDisplayName;
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
