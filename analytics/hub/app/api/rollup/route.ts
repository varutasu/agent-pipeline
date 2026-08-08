import { NextResponse } from "next/server";
import { loadRollupFromDb } from "@/lib/ingest";

export async function GET() {
  const rollup = await loadRollupFromDb();
  return NextResponse.json(rollup);
}
