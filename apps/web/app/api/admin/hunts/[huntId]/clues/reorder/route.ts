import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";

type Params = { params: Promise<{ huntId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { huntId } = await params;
    const body = await req.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return err("UNPROCESSABLE", "orderedIds must be a non-empty array.", 422);
    }

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.clue.update({
          where: { id, huntId },
          data: { sequenceIndex: index + 1 },
        })
      )
    );

    return ok({ reordered: true });
  } catch (e) {
    console.error("[POST /api/admin/hunts/[huntId]/clues/reorder]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
