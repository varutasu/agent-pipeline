import { NextRequest, NextResponse } from "next/server";

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function requireSyncToken(req: NextRequest): boolean {
  const expected = process.env.SYNC_TOKEN;
  if (!expected) return false;
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  return header.slice(7) === expected;
}
