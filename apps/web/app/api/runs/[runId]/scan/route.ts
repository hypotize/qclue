import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerAndRun } from "@/lib/auth";
import { ok, err } from "@/lib/response";
import { decodeClueToken } from "@qclue/qr";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const ctx = await getPlayerAndRun(req, runId);
    if (!ctx) return err("UNAUTHORIZED", "Invalid session.", 401);

    const { run } = ctx;
    if (run.status !== "active") {
      return err("RUN_NOT_ACTIVE", "Run is already finished or abandoned.", 409);
    }

    const body = await req.json();
    const { token } = body;
    if (!token || typeof token !== "string") {
      return err("UNPROCESSABLE", "token is required.", 422);
    }

    // Decode the QR token
    const decoded = decodeClueToken(token);
    if (!decoded.valid) {
      await prisma.runEvent.create({
        data: { runId, eventType: "qr_unrecognized" },
      });
      return ok({ result: "unrecognized", message: "QR not recognized." });
    }

    const { huntId: tokenHuntId, clueId: tokenClueId } = decoded;

    // Wrong hunt
    if (tokenHuntId !== run.huntId) {
      await prisma.runEvent.create({
        data: { runId, eventType: "qr_scanned_wrong", clueId: tokenClueId },
      });
      return ok({ result: "wrong_hunt", message: "This treasure belongs to another hunt." });
    }

    // Look up the clue
    const clue = await prisma.clue.findUnique({ where: { id: tokenClueId } });
    if (!clue || clue.huntId !== run.huntId) {
      return ok({ result: "unrecognized", message: "QR not recognized." });
    }

    // Already used (player scanned a clue they already passed)
    if (clue.sequenceIndex < run.currentClueIndex) {
      return ok({ result: "already_used", message: "You've already found this one." });
    }

    // Wrong step (valid token but not the current clue)
    if (clue.sequenceIndex !== run.currentClueIndex) {
      await prisma.runEvent.create({
        data: { runId, eventType: "qr_scanned_wrong", clueId: clue.id },
      });
      return ok({ result: "wrong_step", message: "Not the right treasure for your current step." });
    }

    // Correct! Advance the run.
    const totalClues = await prisma.clue.count({ where: { huntId: run.huntId } });

    if (clue.isFinal) {
      // Finish the run
      const startedRun = await prisma.run.findUnique({
        where: { id: runId },
        select: { startedAt: true },
      });
      const totalTimeMs = BigInt(Date.now() - (startedRun?.startedAt.getTime() ?? 0));

      await prisma.$transaction([
        prisma.run.update({
          where: { id: runId },
          data: {
            status: "finished",
            finishedAt: new Date(),
            totalTimeMs,
            lastProgressedAt: new Date(),
            levelAtFinish: run.levelAtStart as any,
          },
        }),
        prisma.runEvent.create({
          data: { runId, eventType: "qr_scanned_ok", clueId: clue.id },
        }),
        prisma.runEvent.create({
          data: { runId, eventType: "finished", clueId: clue.id },
        }),
      ]);

      return ok({
        result: "finished",
        totalTimeMs: Number(totalTimeMs),
        treasureUrl: `/treasure/${runId}`,
      });
    } else {
      // Advance to next clue
      const nextIndex = run.currentClueIndex + 1;
      const nextClue = await prisma.clue.findFirst({
        where: { huntId: run.huntId, sequenceIndex: nextIndex },
      });

      await prisma.$transaction([
        prisma.run.update({
          where: { id: runId },
          data: { currentClueIndex: nextIndex, lastProgressedAt: new Date() },
        }),
        prisma.runEvent.create({
          data: { runId, eventType: "qr_scanned_ok", clueId: clue.id },
        }),
        ...(nextClue
          ? [
              prisma.runEvent.create({
                data: { runId, eventType: "clue_viewed", clueId: nextClue.id },
              }),
            ]
          : []),
      ]);

      return ok({
        result: "advanced",
        nextClueIndex: nextIndex,
        totalClues,
        isFinal: nextClue?.isFinal ?? false,
      });
    }
  } catch (e) {
    console.error("[POST /api/runs/[runId]/scan]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
