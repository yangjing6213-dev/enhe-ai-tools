export async function sendUserFlowAdminEmail(send: () => Promise<void>, eventLabel: string) {
  const configuredWait = Number(process.env.ADMIN_EMAIL_ACTION_WAIT_MS);
  const waitMs = Number.isInteger(configuredWait) && configuredWait > 0 ? configuredWait : 1500;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const sendPromise = Promise.resolve().then(send).catch(() => {
    console.error(`[admin-email] ${eventLabel} failed during user flow`);
  });
  const timeoutPromise = new Promise<"timeout">((resolve) => {
    timeout = setTimeout(() => resolve("timeout"), waitMs);
  });
  const result = await Promise.race([sendPromise.then(() => "sent" as const), timeoutPromise]);
  if (timeout) clearTimeout(timeout);
  if (result === "timeout") {
    console.warn(`[admin-email] ${eventLabel} did not finish within ${waitMs}ms; continuing user flow`);
  }
}
