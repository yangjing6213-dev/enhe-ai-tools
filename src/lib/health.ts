export type HealthStatus = {
  status: "ok" | "degraded";
  database: "ok" | "error";
  checkedAt: Date;
};

export async function getHealthStatus(checkDatabase: () => Promise<boolean>): Promise<HealthStatus> {
  try {
    await checkDatabase();
    return {
      status: "ok",
      database: "ok",
      checkedAt: new Date()
    };
  } catch {
    return {
      status: "degraded",
      database: "error",
      checkedAt: new Date()
    };
  }
}

export function buildHealthPayload(status: HealthStatus) {
  return {
    app: "enhe-ai-tools",
    status: status.status,
    database: status.database,
    checkedAt: status.checkedAt.toISOString()
  };
}
