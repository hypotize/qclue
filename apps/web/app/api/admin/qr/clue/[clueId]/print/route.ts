import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { err } from "@/lib/response";
import { generateQrBuffer } from "@qclue/qr";

type Params = { params: Promise<{ clueId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const { clueId } = await params;
    const clue = await prisma.clue.findUnique({ where: { id: clueId } });
    if (!clue) return err("NOT_FOUND", "Clue not found.", 404);

    const body = await req.json().catch(() => ({}));
    const { foregroundColor = "#000000", backgroundColor = "#ffffff" } = body;

    const pngBuffer = await generateQrBuffer(clue.token, {
      foreground: foregroundColor,
      background: backgroundColor,
    });

    return new NextResponse(pngBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="clue-${clue.sequenceIndex}-qr.png"`,
      },
    });
  } catch (e) {
    console.error("[POST /api/admin/qr/clue/[clueId]/print]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
