"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createApiKeyForUser, revokeApiKeyForUser } from "@/features/enhe-api/server/api-keys";

export type CreateApiKeyActionState =
  | { status: "idle" }
  | {
      status: "success";
      message: string;
      plainKey: string;
      keyPrefix: string;
      name: string;
      activeCount: number;
      maxActiveKeys: number;
    }
  | { status: "error"; message: string };

export async function createApiKeyAction(
  _previousState: CreateApiKeyActionState,
  formData: FormData
): Promise<CreateApiKeyActionState> {
  const user = await requireUser();
  const result = await createApiKeyForUser(user, formData.get("name"));

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath("/user/api/keys");

  return {
    status: "success",
    message: "API Key 已创建。完整 Key 只会显示这一次，请立即复制并妥善保存。",
    plainKey: result.plainKey,
    keyPrefix: result.key.keyPrefix,
    name: result.key.name,
    activeCount: result.activeCount,
    maxActiveKeys: result.maxActiveKeys
  };
}

export async function revokeApiKeyAction(formData: FormData) {
  const user = await requireUser();
  await revokeApiKeyForUser(user, formData.get("apiKeyId"));
  revalidatePath("/user/api/keys");
}
