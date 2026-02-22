import { NextRequest, NextResponse } from "next/server";

// TODO: implement
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ contentId: string }> }) {
  return NextResponse.json({ data: null, error: { code: "NOT_IMPLEMENTED", message: "TODO" } }, { status: 501 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ contentId: string }> }) {
  return NextResponse.json({ data: null, error: { code: "NOT_IMPLEMENTED", message: "TODO" } }, { status: 501 });
}
