import { createHmac, timingSafeEqual } from "crypto";

const KEY = process.env.QR_SIGNING_KEY;

function signingKey(): string {
  if (!KEY) throw new Error("QR_SIGNING_KEY is not set");
  return KEY;
}

export type ClueTokenPayload = {
  h: string; // huntId
  c: string; // clueId
  s: string; // signature (first 16 bytes of HMAC-SHA256, base64url)
};

function sign(huntId: string, clueId: string): string {
  const hmac = createHmac("sha256", signingKey());
  hmac.update(`${huntId}:${clueId}`);
  return hmac.digest().subarray(0, 16).toString("base64url");
}

export function encodeClueToken(huntId: string, clueId: string): string {
  const payload: ClueTokenPayload = { h: huntId, c: clueId, s: sign(huntId, clueId) };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeClueToken(
  raw: string
): { valid: true; huntId: string; clueId: string } | { valid: false } {
  try {
    const payload = JSON.parse(Buffer.from(raw, "base64url").toString()) as ClueTokenPayload;
    const expected = sign(payload.h, payload.c);
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(payload.s);
    if (expectedBuf.length !== actualBuf.length) return { valid: false };
    if (!timingSafeEqual(expectedBuf, actualBuf)) return { valid: false };
    return { valid: true, huntId: payload.h, clueId: payload.c };
  } catch {
    return { valid: false };
  }
}
