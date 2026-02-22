import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";

/** Public endpoint — returns active hunt(s) for leaderboard and player use. */
export async function GET(req: NextRequest) {
  try {
    const hunts = await prisma.hunt.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    });
    return ok(hunts);
  } catch (e) {
    console.error("[GET /api/hunts]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
