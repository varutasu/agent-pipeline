import { NextResponse } from "next/server";

/** Liveness probe — no database (used by Docker/Coolify healthcheck). */
export async function GET() {
  return NextResponse.json({ ok: true, service: "pipeline-analytics" });
}
