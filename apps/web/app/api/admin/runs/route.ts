import { NextRequest } from "next/server";
import { RunStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { searchParams } = req.nextUrl;
    const huntId = searchParams.get("huntId") ?? undefined;
    const status = searchParams.get("status") as RunStatus | null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10)));

    const where: any = {
      ...(huntId ? { huntId } : {}),
      ...(status ? { status } : {}),
    };

    const [total, runs] = await prisma.$transaction([
      prisma.run.count({ where }),
      prisma.run.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { player: { select: { id: true, name: true } } },
      }),
    ]);

    return ok({
      runs: runs.map((r) => ({
        ...r,
        totalTimeMs: r.totalTimeMs !== null ? Number(r.totalTimeMs) : null,
      })),
      total,
      page,
      pageSize,
    });
  } catch (e) {
    console.error("[GET /api/admin/runs]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
