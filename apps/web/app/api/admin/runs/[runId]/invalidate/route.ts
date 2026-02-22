import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";

type Params = { params: Promise<{ runId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { runId } = await params;
    await prisma.run.update({
      where: { id: runId },
      data: { status: "invalid" },
    });

    return ok({ invalidated: true });
  } catch (e: any) {
    if (e?.code === "P2025") return err("NOT_FOUND", "Run not found.", 404);
    console.error("[POST /api/admin/runs/[runId]/invalidate]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
