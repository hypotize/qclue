import { NextRequest, NextResponse } from "next/server";

// TODO: implement
export async function GET(req: NextRequest) {
  return NextResponse.json({ data: null, error: { code: "NOT_IMPLEMENTED", message: "TODO" } }, { status: 501 });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ data: null, error: { code: "NOT_IMPLEMENTED", message: "TODO" } }, { status: 501 });
}
