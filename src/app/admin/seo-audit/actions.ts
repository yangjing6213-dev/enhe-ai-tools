"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminAuditRequestContext } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  SeoAuditAdminError,
  cancelSeoAuditRunForAdmin,
  pauseSeoAuditScheduleForAdmin,
  retrySeoAuditRunForAdmin,
} from "@/lib/seo-audit/admin";

const idSchema = z.string().trim().min(1).max(191);
const returnPathPattern = /^\/admin\/seo-audit(?:\/[a-zA-Z0-9_-]+)?$/;

export async function retrySeoAuditRunAction(formData: FormData) {
  const admin = await requireAdmin();
  const runId = idSchema.parse(formData.get("runId"));
  const returnTo = readReturnPath(formData, `/admin/seo-audit/${runId}`);
  const auditContext = await getAdminAuditRequestContext();

  try {
    await retrySeoAuditRunForAdmin({
      db: prisma,
      runId,
      adminId: admin.id,
      auditContext,
    });
  } catch (error) {
    redirectKnownError(error, returnTo);
  }

  revalidateSeoAuditAdminPaths(runId);
  redirect(withResult(returnTo, "retried"));
}

export async function cancelSeoAuditRunAction(formData: FormData) {
  const admin = await requireAdmin();
  const runId = idSchema.parse(formData.get("runId"));
  const returnTo = readReturnPath(formData, `/admin/seo-audit/${runId}`);
  const auditContext = await getAdminAuditRequestContext();

  try {
    await cancelSeoAuditRunForAdmin({
      db: prisma,
      runId,
      adminId: admin.id,
      auditContext,
    });
  } catch (error) {
    redirectKnownError(error, returnTo);
  }

  revalidateSeoAuditAdminPaths(runId);
  redirect(withResult(returnTo, "cancelled"));
}

export async function pauseSeoAuditScheduleAction(formData: FormData) {
  const admin = await requireAdmin();
  const subscriptionId = idSchema.parse(formData.get("subscriptionId"));
  const returnTo = readReturnPath(formData, "/admin/seo-audit");
  const auditContext = await getAdminAuditRequestContext();

  try {
    await pauseSeoAuditScheduleForAdmin({
      db: prisma,
      subscriptionId,
      adminId: admin.id,
      auditContext,
    });
  } catch (error) {
    redirectKnownError(error, returnTo);
  }

  revalidatePath("/admin/seo-audit");
  revalidatePath(returnTo);
  redirect(withResult(returnTo, "paused"));
}

function revalidateSeoAuditAdminPaths(runId: string) {
  revalidatePath("/admin/seo-audit");
  revalidatePath(`/admin/seo-audit/${runId}`);
}

function readReturnPath(formData: FormData, fallback: string) {
  const value = String(formData.get("returnTo") ?? "").trim();
  return returnPathPattern.test(value) ? value : fallback;
}

function redirectKnownError(error: unknown, returnTo: string): never {
  if (error instanceof SeoAuditAdminError) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.code)}`);
  }
  throw error;
}

function withResult(path: string, result: string) {
  return `${path}?result=${encodeURIComponent(result)}`;
}
