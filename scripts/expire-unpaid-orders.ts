import { prisma } from "../src/lib/db";
import { expireUnpaidOrders } from "../src/lib/order-expiry";

// Run inside the application container, using its existing credentials.
// Output counts only: never print order details or provider responses.
expireUnpaidOrders()
  .then((counts) => {
    console.log(JSON.stringify({ task: "expire-unpaid-orders", ...counts }));
    if (counts.failed > 0) process.exitCode = 1;
  })
  .catch(() => {
    console.error("[expire-unpaid-orders] sweep failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
