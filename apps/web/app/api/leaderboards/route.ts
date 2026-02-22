import { NextRequest } from "next/server";
import { DifficultyLevel, LanguageCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";
import { startOfDay, startOfMonth } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const huntId = searchParams.get("huntId");
    const range = searchParams.get("range"); // today | month | all
    const level = searchParams.get("level") as DifficultyLevel | null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10)));

    if (!huntId) return err("UNPROCESSABLE", "huntId is required.", 422);
    if (!["today", "month", "all"].includes(range ?? "")) {
      return err("UNPROCESSABLE", "range must be today, month, or all.", 422);
    }

    const hunt = await prisma.hunt.findUnique({ where: { id: huntId } });
    if (!hunt) return err("NOT_FOUND", "Hunt not found.", 404);

    // Calculate time boundary
    let finishedAfter: Date | undefined;
    if (range === "today" || range === "month") {
      const timezone = hunt.timezone ?? "UTC";
      const nowInTz = toZonedTime(new Date(), timezone);
      finishedAfter =
        range === "today"
          ? startOfDay(nowInTz)
          : startOfMonth(nowInTz);
    }

    const where: any = {
      huntId,
      status: "finished",
      ...(level ? { levelAtStart: level } : {}),
      ...(finishedAfter ? { finishedAt: { gte: finishedAfter } } : {}),
    };

    const [total, runs] = await prisma.$transaction([
      prisma.run.count({ where }),
      prisma.run.findMany({
        where,
        orderBy: { totalTimeMs: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { player: { select: { name: true } } },
      }),
    ]);

    const entries = runs.map((r, i) => ({
      rank: (page - 1) * pageSize + i + 1,
      playerName: r.player.name,
      level: r.levelAtStart,
      totalTimeMs: r.totalTimeMs !== null ? Number(r.totalTimeMs) : null,
      hintsUsed: r.hintsUsedCount,
      finishedAt: r.finishedAt?.toISOString() ?? null,
    }));

    return ok({ entries, total, page, pageSize });
  } catch (e) {
    console.error("[GET /api/leaderboards]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
