import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerAndRun } from "@/lib/auth";
import { ok, err } from "@/lib/response";

const HINT_THRESHOLDS: Record<1 | 2, number> = { 1: 60_000, 2: 180_000 };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const ctx = await getPlayerAndRun(req, runId);
    if (!ctx) return err("UNAUTHORIZED", "Invalid session.", 401);

    const { player, run } = ctx;
    if (run.status !== "active") return err("RUN_NOT_ACTIVE", "Run is not active.", 409);

    const body = await req.json();
    const hintNumber = Number(body.hintNumber);
    if (hintNumber !== 1 && hintNumber !== 2) {
      return err("UNPROCESSABLE", "hintNumber must be 1 or 2.", 422);
    }

    const eventType = hintNumber === 1 ? "hint1_shown" : "hint2_shown";

    // Find current clue
    const clue = await prisma.clue.findFirst({
      where: { huntId: run.huntId, sequenceIndex: run.currentClueIndex },
    });
    if (!clue) return err("NOT_FOUND", "Clue not found.", 404);

    // Check if already revealed
    const alreadyRevealed = await prisma.runEvent.findFirst({
      where: { runId, clueId: clue.id, eventType },
    });

    // Find clue_viewed timestamp
    const viewedEvent = await prisma.runEvent.findFirst({
      where: { runId, clueId: clue.id, eventType: "clue_viewed" },
      orderBy: { timestamp: "asc" },
    });
    const viewedAt = viewedEvent?.timestamp ?? new Date(0);
    const threshold = HINT_THRESHOLDS[hintNumber as 1 | 2];

    if (!alreadyRevealed && Date.now() < viewedAt.getTime() + threshold) {
      return err("HINT_NOT_AVAILABLE", "Hint is not yet available.", 409);
    }

    // Get hint content
    const level = run.levelAtStart;
    const lang = player.preferredLanguage;
    const contents = await prisma.clueContent.findMany({
      where: { clueId: clue.id, language: lang as any, approved: true },
    });
    const levelContent = contents.find((c) => c.level === level);
    const sharedContent = contents.find((c) => c.level === null);
    let content = levelContent ?? sharedContent;

    if (!content && lang !== "en") {
      const fbContents = await prisma.clueContent.findMany({
        where: { clueId: clue.id, language: "en", approved: true },
      });
      content = fbContents.find((c) => c.level === level) ?? fbContents.find((c) => c.level === null);
    }

    const hintText = hintNumber === 1 ? content?.hint1Text : content?.hint2Text;
    if (!hintText) return err("HINT_NOT_FOUND", "No hint configured for this clue.", 404);

    // Log event (idempotent — only once)
    if (!alreadyRevealed) {
      await prisma.$transaction([
        prisma.runEvent.create({ data: { runId, clueId: clue.id, eventType } }),
        prisma.run.update({
          where: { id: runId },
          data: { hintsUsedCount: { increment: 1 } },
        }),
      ]);
    }

    return ok({ hintNumber, text: hintText });
  } catch (e) {
    console.error("[POST /api/runs/[runId]/hint]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
