import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

// ── Player session ───────────────────────────────────────────────────────────

/** Generate a new opaque session token and its hash for storage. */
export function generateSessionToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  const hash = hashSessionToken(token);
  return { token, hash };
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verify the player Bearer token from the Authorization header and return the
 * matching player row, or null if invalid.
 */
export async function getPlayerFromRequest(
  req: Request
): Promise<{ id: string; preferredLanguage: string; assignedLevel: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const hash = hashSessionToken(token);
  const player = await prisma.player.findFirst({ where: { sessionTokenHash: hash } });
  return player;
}

/** Verify token and return player + active run, or null. */
export async function getPlayerAndRun(
  req: Request,
  runId: string
): Promise<{ player: { id: string; preferredLanguage: string; assignedLevel: string }; run: { id: string; huntId: string; status: string; currentClueIndex: number; levelOverridden: boolean; levelAtStart: string } } | null> {
  const player = await getPlayerFromRequest(req);
  if (!player) return null;
  const run = await prisma.run.findFirst({
    where: { id: runId, playerId: player.id },
    select: {
      id: true,
      huntId: true,
      status: true,
      currentClueIndex: true,
      levelOverridden: true,
      levelAtStart: true,
    },
  });
  if (!run) return null;
  return { player, run };
}

// ── Admin session (JWT cookie) ───────────────────────────────────────────────

const ADMIN_COOKIE = "qclue_admin_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-secret-change-in-production"
);

export async function createAdminSession(adminId: string): Promise<string> {
  return new SignJWT({ sub: adminId, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function getAdminFromRequest(
  req: Request
): Promise<{ adminId: string } | null> {
  // Check Authorization header first (for API clients), then cookie
  const authHeader = req.headers.get("authorization");
  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(ADMIN_COOKIE)?.value;
  }

  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (typeof payload.sub !== "string") return null;
    return { adminId: payload.sub };
  } catch {
    return null;
  }
}

export { ADMIN_COOKIE };
