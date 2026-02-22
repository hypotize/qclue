import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getPlayerAndRun } from "@/lib/auth";
import { ok, err } from "@/lib/response";
import { ALL_LEVELS } from "@/lib/level";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const ctx = await getPlayerAndRun(req, runId);
    if (!ctx) return err("UNAUTHORIZED", "Invalid session.", 401);

    const { run } = ctx;
    if (run.levelOverridden) {
      return err("OVERRIDE_ALREADY_USED", "This run already had a level override.", 409);
    }

    const body = await req.json();
    const { adminCredentialToken } = body;
    if (!adminCredentialToken || typeof adminCredentialToken !== "string") {
      return err("UNPROCESSABLE", "adminCredentialToken is required.", 422);
    }

    // Hash the submitted token and look it up
    const hash = createHash("sha256").update(adminCredentialToken).digest("hex");
    const credential = await prisma.adminCredential.findFirst({
      where: { credentialHash: hash, isActive: true },
    });

    if (!credential) {
      return err("INVALID_CREDENTIAL", "Invalid or expired admin credential.", 401);
    }

    return ok({ overrideGranted: true, availableLevels: ALL_LEVELS });
  } catch (e) {
    console.error("[POST /api/runs/[runId]/override]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
