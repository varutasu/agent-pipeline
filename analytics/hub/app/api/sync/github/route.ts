import { NextRequest, NextResponse } from "next/server";
import { requireSyncToken, unauthorized } from "@/lib/auth";
import { upsertEvents } from "@/lib/ingest";
import { fetchMetricsFromGithub, parseRepoTargets } from "@/lib/github";

export async function POST(req: NextRequest) {
  if (!requireSyncToken(req)) return unauthorized();

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_TOKEN not configured" }, { status: 503 });
  }

  const targets = parseRepoTargets(process.env.SYNC_REPOS);
  if (targets.length === 0) {
    return NextResponse.json({ error: "SYNC_REPOS not configured" }, { status: 503 });
  }

  const results: Array<{
    repo: string;
    added: number;
    fetched: number;
    error?: string;
  }> = [];

  let totalAdded = 0;

  for (const target of targets) {
    const { events, error } = await fetchMetricsFromGithub(target, token);
    if (error && events.length === 0) {
      results.push({
        repo: target.fullName,
        added: 0,
        fetched: 0,
        error,
      });
      continue;
    }
    const { added } = await upsertEvents(events, "github", target.fullName);
    totalAdded += added;
    results.push({ repo: target.fullName, added, fetched: events.length, error });
  }

  return NextResponse.json({ totalAdded, results });
}
