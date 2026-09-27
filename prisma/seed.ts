import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Local defaults from the build brief; override both for any public deployment.
const SUPER_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@test.com";
const SUPER_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

async function main() {
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  // update: {} keeps an existing password intact if the seed is re-run.
  await prisma.admin.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {},
    create: {
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
