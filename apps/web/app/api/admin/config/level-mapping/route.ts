import { NextRequest } from "next/server";
import { DifficultyLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";
import { ALL_LEVELS } from "@/lib/level";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const mappings = await prisma.levelAgeMapping.findMany({ orderBy: { minAge: "asc" } });
    return ok(mappings);
  } catch (e) {
    console.error("[GET /api/admin/config/level-mapping]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const body = await req.json();
    if (!Array.isArray(body) || body.length === 0) {
      return err("UNPROCESSABLE", "Body must be a non-empty array of level mappings.", 422);
    }

    // Validate entries
    for (const entry of body) {
      if (!ALL_LEVELS.includes(entry.level as DifficultyLevel)) {
        return err("UNPROCESSABLE", `Invalid level: ${entry.level}`, 422);
      }
      if (typeof entry.minAge !== "number") {
        return err("UNPROCESSABLE", "minAge must be a number.", 422);
      }
    }

    await prisma.$transaction(
      body.map((entry: { level: DifficultyLevel; minAge: number; maxAge?: number | null }) =>
        prisma.levelAgeMapping.upsert({
          where: { level: entry.level },
          update: {
            minAge: entry.minAge,
            maxAge: entry.maxAge ?? null,
            updatedBy: admin.adminId,
          },
          create: {
            level: entry.level,
            minAge: entry.minAge,
            maxAge: entry.maxAge ?? null,
            updatedBy: admin.adminId,
          },
        })
      )
    );

    const updated = await prisma.levelAgeMapping.findMany({ orderBy: { minAge: "asc" } });
    return ok(updated);
  } catch (e) {
    console.error("[PUT /api/admin/config/level-mapping]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
