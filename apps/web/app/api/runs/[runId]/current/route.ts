import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerAndRun } from "@/lib/auth";
import { ok, err } from "@/lib/response";

const HINT1_MS = 60_000;
const HINT2_MS = 180_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const ctx = await getPlayerAndRun(req, runId);
    if (!ctx) return err("UNAUTHORIZED", "Invalid session.", 401);

    const { player, run } = ctx;
    if (run.status !== "active") return err("RUN_NOT_ACTIVE", "Run is not active.", 409);

    // Load the current clue
    const clue = await prisma.clue.findFirst({
      where: { huntId: run.huntId, sequenceIndex: run.currentClueIndex },
    });
    if (!clue) return err("NOT_FOUND", "Clue not found.", 404);

    const totalClues = await prisma.clue.count({ where: { huntId: run.huntId } });

    // Find the clue_viewed timestamp for this clue
    const viewedEvent = await prisma.runEvent.findFirst({
      where: { runId, clueId: clue.id, eventType: "clue_viewed" },
      orderBy: { timestamp: "asc" },
    });
    const clueViewedAt = viewedEvent?.timestamp ?? new Date();

    // Find content for this clue (level-specific, then shared fallback)
    const level = run.levelAtStart;
    const lang = player.preferredLanguage;
    const contents = await prisma.clueContent.findMany({
      where: { clueId: clue.id, language: lang as any, approved: true },
    });

    const levelContent = contents.find((c) => c.level === level);
    const sharedContent = contents.find((c) => c.level === null);
    const content = levelContent ?? sharedContent;

    // If no content in preferred language, try fallback (en)
    let fallbackContent = null;
    if (!content && lang !== "en") {
      const fbContents = await prisma.clueContent.findMany({
        where: { clueId: clue.id, language: "en", approved: true },
      });
      fallbackContent = fbContents.find((c) => c.level === level) ?? fbContents.find((c) => c.level === null);
    }

    const activeContent = content ?? fallbackContent;

    // Determine hint availability
    const now = Date.now();
    const viewedMs = clueViewedAt.getTime();
    const hint1AvailableAt = new Date(viewedMs + HINT1_MS);
    const hint2AvailableAt = new Date(viewedMs + HINT2_MS);
    const hint1Available = now >= viewedMs + HINT1_MS;
    const hint2Available = now >= viewedMs + HINT2_MS;

    // Check which hints have already been revealed
    const revealedEvents = await prisma.runEvent.findMany({
      where: {
        runId,
        clueId: clue.id,
        eventType: { in: ["hint1_shown", "hint2_shown"] },
      },
    });
    const hint1Revealed = revealedEvents.some((e) => e.eventType === "hint1_shown");
    const hint2Revealed = revealedEvents.some((e) => e.eventType === "hint2_shown");

    return ok({
      runId: run.id,
      huntId: run.huntId,
      clueIndex: run.currentClueIndex,
      totalClues,
      isFinal: clue.isFinal,
      clue: {
        id: clue.id,
        text: activeContent?.clueText ?? null,
        imageUrl: activeContent?.imageUrl ?? null,
      },
      hints: {
        hint1: {
          available: hint1Available,
          availableAt: hint1AvailableAt.toISOString(),
          text: hint1Revealed ? (activeContent?.hint1Text ?? null) : null,
        },
        hint2: {
          available: hint2Available,
          availableAt: hint2AvailableAt.toISOString(),
          text: hint2Revealed ? (activeContent?.hint2Text ?? null) : null,
        },
      },
      clueViewedAt: clueViewedAt.toISOString(),
    });
  } catch (e) {
    console.error("[GET /api/runs/[runId]/current]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
