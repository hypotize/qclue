import { NextRequest } from "next/server";
import { LanguageCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const hunts = await prisma.hunt.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { clues: true, runs: true } } },
    });

    return ok(hunts.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      isActive: h.isActive,
      timezone: h.timezone,
      finalTreasureYoutubeId: h.finalTreasureYoutubeId,
      fallbackLanguage: h.fallbackLanguage,
      clueCount: h._count.clues,
      runCount: h._count.runs,
      createdAt: h.createdAt.toISOString(),
    })));
  } catch (e) {
    console.error("[GET /api/admin/hunts]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const body = await req.json();
    const { name, description, isActive, timezone, finalTreasureYoutubeId, fallbackLanguage } = body;

    if (!name || typeof name !== "string") {
      return err("UNPROCESSABLE", "name is required.", 422);
    }
    if (!finalTreasureYoutubeId || typeof finalTreasureYoutubeId !== "string") {
      return err("UNPROCESSABLE", "finalTreasureYoutubeId is required.", 422);
    }

    // If activating, deactivate others
    const hunt = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.hunt.updateMany({ where: { isActive: true }, data: { isActive: false } });
      }
      return tx.hunt.create({
        data: {
          name,
          description: description ?? null,
          isActive: isActive ?? false,
          timezone: timezone ?? "UTC",
          finalTreasureYoutubeId,
          fallbackLanguage: (fallbackLanguage as LanguageCode) ?? "en",
        },
      });
    });

    return ok(hunt, 201);
  } catch (e) {
    console.error("[POST /api/admin/hunts]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
