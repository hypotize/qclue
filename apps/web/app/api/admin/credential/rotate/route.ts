import { NextRequest } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    const rawToken = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(rawToken).digest("hex");

    await prisma.$transaction(async (tx) => {
      // Deactivate all existing credentials
      await tx.adminCredential.updateMany({
        where: { isActive: true },
        data: { isActive: false, rotatedAt: new Date(), rotatedById: admin.adminId },
      });
      // Create new credential
      await tx.adminCredential.create({
        data: { credentialHash: hash, isActive: true, createdById: admin.adminId },
      });
    });

    // Return the new raw token (this is the only time it's shown)
    return ok({ qrData: rawToken });
  } catch (e) {
    console.error("[POST /api/admin/credential/rotate]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
