import { NextRequest } from "next/server";
import { DifficultyLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlayerAndRun } from "@/lib/auth";
import { ok, err } from "@/lib/response";
import { ALL_LEVELS } from "@/lib/level";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const ctx = await getPlayerAndRun(req, runId);
    if (!ctx) return err("UNAUTHORIZED", "Invalid session.", 401);

    const { run } = ctx;

    // The run must not have already used its override (i.e. override was granted
    // but levelOverridden is still false when this endpoint is first called).
    // We allow this call only when levelOverridden is false — the grant was implicit
    // from the /override endpoint. On success we flip levelOverridden = true.
    if (run.levelOverridden) {
      return err("OVERRIDE_NOT_GRANTED", "Override has already been used for this run.", 403);
    }

    const body = await req.json();
    const { level } = body;

    if (!level || !ALL_LEVELS.includes(level as DifficultyLevel)) {
      return err("INVALID_LEVEL", "Unknown level value.", 422);
    }

    await prisma.$transaction([
      prisma.run.update({
        where: { id: runId },
        data: { levelAtStart: level as DifficultyLevel, levelOverridden: true },
      }),
      prisma.runEvent.create({
        data: { runId, eventType: "level_override", metadata: { newLevel: level } },
      }),
    ]);

    // Also update the player's assigned level
    await prisma.player.update({
      where: { id: ctx.player.id },
      data: { assignedLevel: level as DifficultyLevel },
    });

    return ok({ level });
  } catch (e) {
    console.error("[PATCH /api/runs/[runId]/level]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
