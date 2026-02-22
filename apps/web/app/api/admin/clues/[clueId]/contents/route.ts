import { NextRequest } from "next/server";
import { DifficultyLevel, LanguageCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";

type Params = { params: Promise<{ clueId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { clueId } = await params;
    const contents = await prisma.clueContent.findMany({
      where: { clueId },
      orderBy: [{ language: "asc" }, { level: "asc" }],
    });
    return ok(contents);
  } catch (e) {
    console.error("[GET /api/admin/clues/[clueId]/contents]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { clueId } = await params;
    const body = await req.json();
    const { language, level, clueText, hint1Text, hint2Text, imageUrl } = body;

    if (!language || !clueText) {
      return err("UNPROCESSABLE", "language and clueText are required.", 422);
    }

    const content = await prisma.clueContent.create({
      data: {
        clueId,
        language: language as LanguageCode,
        level: level as DifficultyLevel | null ?? null,
        clueText,
        hint1Text: hint1Text ?? null,
        hint2Text: hint2Text ?? null,
        imageUrl: imageUrl ?? null,
        approved: true, // manually entered content is auto-approved
        createdBy: admin.adminId,
      },
    });

    return ok(content, 201);
  } catch (e: any) {
    if (e?.code === "P2002") return err("CONFLICT", "Content for this language/level already exists.", 409);
    console.error("[POST /api/admin/clues/[clueId]/contents]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
