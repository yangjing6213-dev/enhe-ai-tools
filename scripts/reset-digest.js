const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.adminAuditLog.deleteMany({ where: { action: "monthly_digest_sent" } }).then(r => { console.log("Deleted", r.count); process.exit(0); });
