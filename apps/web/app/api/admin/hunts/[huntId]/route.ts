import { NextRequest } from "next/server";
import { LanguageCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";

type Params = { params: Promise<{ huntId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { huntId } = await params;
    const hunt = await prisma.hunt.findUnique({
      where: { id: huntId },
      include: {
        clues: { orderBy: { sequenceIndex: "asc" } },
        _count: { select: { runs: true } },
      },
    });
    if (!hunt) return err("NOT_FOUND", "Hunt not found.", 404);

    return ok(hunt);
  } catch (e) {
    console.error("[GET /api/admin/hunts/[huntId]]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { huntId } = await params;
    const body = await req.json();
    const { name, description, isActive, timezone, finalTreasureYoutubeId, fallbackLanguage } = body;

    const hunt = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.hunt.updateMany({ where: { isActive: true, id: { not: huntId } }, data: { isActive: false } });
      }
      return tx.hunt.update({
        where: { id: huntId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
          ...(timezone !== undefined ? { timezone } : {}),
          ...(finalTreasureYoutubeId !== undefined ? { finalTreasureYoutubeId } : {}),
          ...(fallbackLanguage !== undefined ? { fallbackLanguage: fallbackLanguage as LanguageCode } : {}),
        },
      });
    });

    return ok(hunt);
  } catch (e: any) {
    if (e?.code === "P2025") return err("NOT_FOUND", "Hunt not found.", 404);
    console.error("[PATCH /api/admin/hunts/[huntId]]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { huntId } = await params;

    const activeRunCount = await prisma.run.count({
      where: { huntId, status: "active" },
    });
    if (activeRunCount > 0) {
      return err("CONFLICT", "Cannot delete hunt with active runs.", 409);
    }

    await prisma.hunt.delete({ where: { id: huntId } });
    return ok({ deleted: true });
  } catch (e: any) {
    if (e?.code === "P2025") return err("NOT_FOUND", "Hunt not found.", 404);
    console.error("[DELETE /api/admin/hunts/[huntId]]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
