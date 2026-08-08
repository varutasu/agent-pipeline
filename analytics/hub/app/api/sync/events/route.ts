import { NextRequest, NextResponse } from "next/server";
import { requireSyncToken, unauthorized } from "@/lib/auth";
import { upsertEvents } from "@/lib/ingest";
import type { ConvoyEvent } from "../../../../../lib/rollup";

export async function POST(req: NextRequest) {
  if (!requireSyncToken(req)) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw =
    typeof body === "object" && body !== null && "events" in body
      ? (body as { events: unknown }).events
      : body;

  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "Expected { events: [...] } or array" }, { status: 400 });
  }

  const valid = raw.filter(
    (e): e is ConvoyEvent =>
      typeof e === "object" &&
      e !== null &&
      typeof (e as ConvoyEvent).ts === "string" &&
      typeof (e as ConvoyEvent).role === "string" &&
      typeof (e as ConvoyEvent).convoy === "string" &&
      typeof (e as ConvoyEvent).repo === "string",
  );

  const sourceFullName =
    typeof body === "object" && body !== null && "source" in body
      ? String((body as { source?: string }).source ?? "")
      : req.headers.get("x-source-repo") || undefined;

  const result = await upsertEvents(valid, "api:events", sourceFullName || undefined);
  return NextResponse.json(result);
}
