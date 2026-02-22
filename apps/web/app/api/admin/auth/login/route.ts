import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { createAdminSession, ADMIN_COOKIE } from "@/lib/auth";
import { ok, err } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;
    if (!email || !password) {
      return err("UNPROCESSABLE", "email and password are required.", 422);
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.passwordHash) {
      return err("UNAUTHORIZED", "Invalid credentials.", 401);
    }

    // Password is stored as SHA-256 hash for simplicity (bcrypt avoided to keep deps minimal)
    const hash = createHash("sha256").update(password).digest("hex");
    if (hash !== admin.passwordHash) {
      return err("UNAUTHORIZED", "Invalid credentials.", 401);
    }

    const token = await createAdminSession(admin.id);

    const response = ok({ adminId: admin.id, role: admin.role });
    (response as NextResponse).cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (e) {
    console.error("[POST /api/admin/auth/login]", e);
    return err("INTERNAL", "Unexpected error.", 500);
  }
}
