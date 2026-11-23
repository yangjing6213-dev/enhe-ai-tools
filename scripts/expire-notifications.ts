import { deleteExpiredNotifications } from "../src/lib/notification-retention";
import { prisma } from "../src/lib/db";

async function main() {
  const result = await deleteExpiredNotifications(prisma);
  console.info(
    `[notification-retention] removed ${result.membersDeleted} member and ${result.adminsDeleted} admin notifications`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("[notification-retention] cleanup failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
