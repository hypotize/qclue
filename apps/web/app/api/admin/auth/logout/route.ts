import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";
import { ok } from "@/lib/response";

export async function POST() {
  const response = ok({ loggedOut: true }) as NextResponse;
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
