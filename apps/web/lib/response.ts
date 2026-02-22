import { NextResponse } from "next/server";

export type ApiResponse<T> = { data: T; error: null } | { data: null; error: ApiError };

export type ApiError = {
  code: string;
  message: string;
};

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, error: null }, { status });
}

export function err(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ data: null, error: { code, message } }, { status });
}
