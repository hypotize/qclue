import { NextRequest } from "next/server";
import { DifficultyLevel, LanguageCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSessionToken } from "@/lib/auth";
import { assignLevel } from "@/lib/level";
import { ok, err } from "@/lib/response";

const SUPPORTED_LANGUAGES: LanguageCode[] = ["en", "ja", "fr", "es", "zh_Hans", "zh_Hant"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, age, language } = body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return err("UNPROCESSABLE", "Name must be 1–100 characters.", 422);
    }

    // Validate age
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 3 || ageNum > 120) {
      return err("AGE_OUT_OF_RANGE", "Age must be between 3 and 120.", 422);
    }

    // Validate language
    if (!SUPPORTED_LANGUAGES.includes(language as LanguageCode)) {
      return err("INVALID_LANGUAGE", "Unsupported language code.", 422);
    }

    // Find active hunt
    const hunt = await prisma.hunt.findFirst({
      where: { isActive: true },
      include: { clues: { orderBy: { sequenceIndex: "asc" }, take: 1 } },
    });
    if (!hunt) {
      return err("NO_ACTIVE_HUNT", "No hunt is currently active.", 409);
    }

    // Assign level
    const level = await assignLevel(ageNum);
    if (!level) {
      return err("AGE_OUT_OF_RANGE", "Age does not map to any configured level.", 422);
    }

    // Create player + run in a transaction
    const { token, hash } = generateSessionToken();

    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.player.create({
        data: {
          name: name.trim(),
          age: ageNum,
          preferredLanguage: language as LanguageCode,
          assignedLevel: level as DifficultyLevel,
          sessionTokenHash: hash,
        },
      });

      const run = await tx.run.create({
        data: {
          playerId: player.id,
          huntId: hunt.id,
          levelAtStart: level as DifficultyLevel,
          currentClueIndex: 1,
        },
      });

      // Log clue_viewed for clue #1
      const firstClue = hunt.clues[0];
      if (firstClue) {
        await tx.runEvent.create({
          data: {
            runId: run.id,
            eventType: "clue_viewed",
            clueId: firstClue.id,
          },
        });
      }

      return { player, run };
    });

    return ok(
      {
        playerId: result.player.id,
        name: result.player.name,
        age: result.player.age,
        language: result.player.preferredLanguage,
        assignedLevel: result.player.assignedLevel,
        runId: result.run.id,
        sessionToken: token,
      },
      201
    );
  } catch (e) {
    console.error("[POST /api/players]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
