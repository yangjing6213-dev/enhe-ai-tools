import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildHealthPayload, getHealthStatus } from "@/lib/health";

export async function GET() {
  const status = await getHealthStatus(async () => {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  });

  return NextResponse.json(buildHealthPayload(status), {
    status: status.status === "ok" ? 200 : 503
  });
}
