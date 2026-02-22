import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";

type Params = { params: Promise<{ contentId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { contentId } = await params;
    const body = await req.json();
    const { clueText, hint1Text, hint2Text, imageUrl } = body;

    const content = await prisma.clueContent.update({
      where: { id: contentId },
      data: {
        ...(clueText !== undefined ? { clueText, approved: false } : {}), // edit resets approval
        ...(hint1Text !== undefined ? { hint1Text } : {}),
        ...(hint2Text !== undefined ? { hint2Text } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      },
    });

    return ok(content);
  } catch (e: any) {
    if (e?.code === "P2025") return err("NOT_FOUND", "Content not found.", 404);
    console.error("[PATCH /api/admin/clue-contents/[contentId]]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { contentId } = await params;
    await prisma.clueContent.delete({ where: { id: contentId } });
    return ok({ deleted: true });
  } catch (e: any) {
    if (e?.code === "P2025") return err("NOT_FOUND", "Content not found.", 404);
    console.error("[DELETE /api/admin/clue-contents/[contentId]]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
