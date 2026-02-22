import { NextRequest } from "next/server";
import { LanguageCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";
import { generateLevelVariants } from "@qclue/ai";

type Params = { params: Promise<{ clueId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { clueId } = await params;
    const clue = await prisma.clue.findUnique({ where: { id: clueId } });
    if (!clue) return err("NOT_FOUND", "Clue not found.", 404);

    const body = await req.json();
    const { baseText, language = "en" } = body;
    if (!baseText) return err("UNPROCESSABLE", "baseText is required.", 422);

    const variants = await generateLevelVariants(baseText, language);

    // Save each variant as unapproved clue content
    const lang = language as LanguageCode;
    const rows = await prisma.$transaction(
      Object.entries(variants).map(([level, text]) =>
        prisma.clueContent.upsert({
          where: { clueId_language_level: { clueId, language: lang, level: level as any } },
          update: { clueText: text as string, approved: false, createdBy: admin.adminId },
          create: {
            clueId,
            language: lang,
            level: level as any,
            clueText: text as string,
            approved: false,
            createdBy: admin.adminId,
          },
        })
      )
    );

    return ok({ generated: rows.length, variants });
  } catch (e) {
    console.error("[POST /api/admin/clues/[clueId]/generate-variants]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
