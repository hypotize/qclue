import { NextRequest } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { ok, err } from "@/lib/response";
import { encodeClueToken } from "@qclue/qr";

/** GET — return the QR data for the active admin credential (creates one if none exists). */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return err("UNAUTHORIZED", "Admin session required.", 401);

    let credential = await prisma.adminCredential.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!credential) {
      // Bootstrap first credential
      const rawToken = randomBytes(32).toString("base64url");
      const hash = createHash("sha256").update(rawToken).digest("hex");
      credential = await prisma.adminCredential.create({
        data: { credentialHash: hash, isActive: true, createdById: admin.adminId },
      });
      // Return raw token once — subsequent GETs only return the ID (not the secret)
      return ok({ credentialId: credential.id, qrData: rawToken, isNew: true });
    }

    return ok({ credentialId: credential.id, qrData: null, isNew: false });
  } catch (e) {
    console.error("[GET /api/admin/credential]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
