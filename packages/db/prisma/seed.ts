import { PrismaClient, DifficultyLevel } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");

  // Default admin (password: "admin")
  const passwordHash = createHash("sha256").update("admin").digest("hex");
  await prisma.admin.upsert({
    where: { email: "admin@qclue.local" },
    update: {},
    create: {
      email: "admin@qclue.local",
      passwordHash,
      role: "admin",
    },
  });
  console.log("Admin created: admin@qclue.local / admin");

  // Default level-age mappings
  const defaults: { level: DifficultyLevel; minAge: number; maxAge: number | null }[] = [
    { level: "basic", minAge: 3, maxAge: 5 },
    { level: "elementary", minAge: 6, maxAge: 8 },
    { level: "senior_elementary", minAge: 9, maxAge: 11 },
    { level: "junior_high", minAge: 12, maxAge: 14 },
    { level: "senior_high", minAge: 15, maxAge: 17 },
    { level: "adult", minAge: 18, maxAge: null },
  ];

  for (const d of defaults) {
    await prisma.levelAgeMapping.upsert({
      where: { level: d.level },
      update: { minAge: d.minAge, maxAge: d.maxAge },
      create: { level: d.level, minAge: d.minAge, maxAge: d.maxAge },
    });
  }
  console.log("Level age mappings seeded.");

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
