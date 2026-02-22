import { DifficultyLevel } from "@prisma/client";
import { prisma } from "./prisma";

/** Return the level for a given age using the DB mapping table. */
export async function assignLevel(age: number): Promise<DifficultyLevel | null> {
  const mappings = await prisma.levelAgeMapping.findMany({
    orderBy: { minAge: "asc" },
  });

  for (const m of mappings) {
    if (age >= m.minAge && (m.maxAge === null || age <= m.maxAge)) {
      return m.level;
    }
  }
  return null;
}

export const ALL_LEVELS: DifficultyLevel[] = [
  "basic",
  "elementary",
  "senior_elementary",
  "junior_high",
  "senior_high",
  "adult",
];
