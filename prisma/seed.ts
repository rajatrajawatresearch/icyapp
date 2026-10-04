import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Local defaults from the build brief; override both for any public deployment.
const SUPER_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@test.com";
const SUPER_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

async function main() {
  // Only a store with no owner at all gets one. The first super admin can be
  // deleted or replaced from the app, and a re-run must not bring it back.
  if (await prisma.admin.count({ where: { role: "SUPER_ADMIN" } })) {
    console.log("\n✅ A super admin already exists, nothing to seed\n");
    return;
  }
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  await prisma.admin.create({
    data: {
      name: "Super Admin",
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.log("\n✅ Seeded SUPER_ADMIN account");
  console.log(`   email:    ${SUPER_ADMIN_EMAIL}`);
  // Only echo the password when it's the well-known local default.
  const shownPassword = process.env.SEED_ADMIN_PASSWORD
    ? "(from SEED_ADMIN_PASSWORD)"
    : SUPER_ADMIN_PASSWORD;
  console.log(`   password: ${shownPassword}`);
  console.log("   login at: /admin/login\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
