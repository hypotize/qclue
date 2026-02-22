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

    const run = await prisma.run.findUnique({ where: { id: runId } });
    if (!run) return err("NOT_FOUND", "Run not found.", 404);

    // Find first clue
    const firstClue = await prisma.clue.findFirst({
      where: { huntId: run.huntId, sequenceIndex: 1 },
    });

    await prisma.$transaction([
      prisma.run.update({
        where: { id: runId },
        data: {
          status: "active",
          currentClueIndex: 1,
          finishedAt: null,
          totalTimeMs: null,
          hintsUsedCount: 0,
          startedAt: new Date(),
          lastProgressedAt: new Date(),
        },
      }),
      prisma.runEvent.deleteMany({ where: { runId } }),
      ...(firstClue
        ? [prisma.runEvent.create({ data: { runId, eventType: "clue_viewed", clueId: firstClue.id } })]
        : []),
    ]);

    return ok({ reset: true });
  } catch (e) {
    console.error("[POST /api/admin/runs/[runId]/reset]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
