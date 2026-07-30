const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function readBootstrapInput() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "";
  const confirmation = process.env.ADMIN_BOOTSTRAP_CONFIRM?.trim() ?? "";

  if (confirmation !== "CREATE_ENHE_ADMIN") {
    throw new Error("ADMIN_BOOTSTRAP_CONFIRM must equal CREATE_ENHE_ADMIN.");
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("ADMIN_BOOTSTRAP_EMAIL must be a valid email address.");
  }
  if (password.length < 16 || password.length > 128) {
    throw new Error("ADMIN_BOOTSTRAP_PASSWORD must contain 16 to 128 characters.");
  }

  return { email, password };
}

async function main() {
  const { email, password } = readBootstrapInput();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("ADMIN_BOOTSTRAP_ACCOUNT_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      nickname: email.split("@")[0],
      role: "admin",
      status: "active",
    },
  });

  console.log("[enhe-ai-tools] administrator created.");
}

main()
  .catch((error) => {
    console.error("[enhe-ai-tools] administrator bootstrap failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
