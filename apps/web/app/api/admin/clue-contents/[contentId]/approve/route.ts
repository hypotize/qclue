import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";

type Params = { params: Promise<{ contentId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { contentId } = await params;
    const content = await prisma.clueContent.update({
      where: { id: contentId },
      data: { approved: true },
    });

    return ok(content);
  } catch (e: any) {
    if (e?.code === "P2025") return err("NOT_FOUND", "Content not found.", 404);
    console.error("[POST /api/admin/clue-contents/[contentId]/approve]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
