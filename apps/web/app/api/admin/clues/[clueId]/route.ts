import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";

type Params = { params: Promise<{ clueId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { clueId } = await params;
    const clue = await prisma.clue.findUnique({
      where: { id: clueId },
      include: { contents: true },
    });
    if (!clue) return err("NOT_FOUND", "Clue not found.", 404);
    return ok(clue);
  } catch (e) {
    console.error("[GET /api/admin/clues/[clueId]]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { clueId } = await params;
    const body = await req.json();
    const { sequenceIndex, isFinal, answer } = body;

    const clue = await prisma.clue.update({
      where: { id: clueId },
      data: {
        ...(sequenceIndex !== undefined ? { sequenceIndex } : {}),
        ...(isFinal !== undefined ? { isFinal } : {}),
        ...(answer !== undefined ? { answer: answer || null } : {}),
      },
    });
    return ok(clue);
  } catch (e: any) {
    if (e?.code === "P2025") return err("NOT_FOUND", "Clue not found.", 404);
    console.error("[PATCH /api/admin/clues/[clueId]]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { clueId } = await params;
    await prisma.clue.delete({ where: { id: clueId } });
    return ok({ deleted: true });
  } catch (e: any) {
    if (e?.code === "P2025") return err("NOT_FOUND", "Clue not found.", 404);
    console.error("[DELETE /api/admin/clues/[clueId]]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
