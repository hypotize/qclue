import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";
import { encodeClueToken } from "@qclue/qr";

type Params = { params: Promise<{ huntId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { huntId } = await params;
    const hunt = await prisma.hunt.findUnique({ where: { id: huntId } });
    if (!hunt) return err("NOT_FOUND", "Hunt not found.", 404);

    const clues = await prisma.clue.findMany({
      where: { huntId },
      orderBy: { sequenceIndex: "asc" },
      include: { contents: true },
    });

    return ok(clues);
  } catch (e) {
    console.error("[GET /api/admin/hunts/[huntId]/clues]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { huntId } = await params;
    const hunt = await prisma.hunt.findUnique({ where: { id: huntId } });
    if (!hunt) return err("NOT_FOUND", "Hunt not found.", 404);

    const body = await req.json();
    const { sequenceIndex, isFinal } = body;

    if (typeof sequenceIndex !== "number") {
      return err("UNPROCESSABLE", "sequenceIndex is required.", 422);
    }

    // Generate a unique signed token for this clue
    const tempId = randomBytes(16).toString("hex"); // placeholder until clue is created
    const clue = await prisma.$transaction(async (tx) => {
      const c = await tx.clue.create({
        data: {
          huntId,
          sequenceIndex,
          isFinal: isFinal ?? false,
          token: randomBytes(16).toString("hex"), // temporary; updated next
        },
      });
      // Update with proper signed token
      const token = encodeClueToken(huntId, c.id);
      return tx.clue.update({ where: { id: c.id }, data: { token } });
    });

    return ok(clue, 201);
  } catch (e) {
    console.error("[POST /api/admin/hunts/[huntId]/clues]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
