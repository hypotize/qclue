import { NextRequest } from "next/server";
import { LanguageCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";
import { translateContent } from "@qclue/ai";

// Map from DB LanguageCode to the format the AI package expects
const LANG_MAP: Record<string, string> = {
  ja: "ja",
  fr: "fr",
  es: "es",
  zh_Hans: "zh-Hans",
  zh_Hant: "zh-Hant",
};

type Params = { params: Promise<{ clueId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { clueId } = await params;
    const clue = await prisma.clue.findUnique({ where: { id: clueId } });
    if (!clue) return err("NOT_FOUND", "Clue not found.", 404);

    const body = await req.json();
    const { clueText, hint1Text, hint2Text } = body;
    if (!clueText) return err("UNPROCESSABLE", "clueText is required.", 422);

    const translations = await translateContent(
      { clueText, hint1Text, hint2Text },
      ["ja", "fr", "es", "zh-Hans", "zh-Hant"]
    );

    // Reverse the lang map for DB storage
    const DB_LANG_MAP: Record<string, LanguageCode> = {
      ja: "ja",
      fr: "fr",
      es: "es",
      "zh-Hans": "zh_Hans",
      "zh-Hant": "zh_Hant",
    };

    const rows = await prisma.$transaction(
      Object.entries(translations).map(([langCode, content]) => {
        const dbLang = DB_LANG_MAP[langCode];
        if (!dbLang) return prisma.clueContent.findFirst({ where: { clueId } }); // skip unknown
        return prisma.clueContent.upsert({
          where: { clueId_language_level: { clueId, language: dbLang, level: null as any } },
          update: {
            clueText: (content as any).clueText,
            hint1Text: (content as any).hint1Text ?? null,
            hint2Text: (content as any).hint2Text ?? null,
            approved: false,
            createdBy: admin.adminId,
          },
          create: {
            clueId,
            language: dbLang,
            level: null as any,
            clueText: (content as any).clueText,
            hint1Text: (content as any).hint1Text ?? null,
            hint2Text: (content as any).hint2Text ?? null,
            approved: false,
            createdBy: admin.adminId,
          },
        });
      })
    );

    return ok({ translated: Object.keys(translations).length, translations });
  } catch (e) {
    console.error("[POST /api/admin/clues/[clueId]/translate]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
