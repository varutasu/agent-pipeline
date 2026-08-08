#!/usr/bin/env tsx
/**
 * push-to-hub.ts — read .convoys/.metrics.jsonl from local repos and POST to the remote hub.
 *
 * Usage:
 *   HUB_URL=https://pipeline.stillwell.cloud SYNC_TOKEN=... \
 *     npx tsx push-to-hub.ts <repo-path> [<repo-path>...]
 *
 * Or set HUB_URL + SYNC_TOKEN in ~/.agent-pipeline-data/hub.env
 */

import { promises as fs } from "fs";
import * as path from "path";
import { parseMetricsJsonl, type ConvoyEvent } from "./lib/rollup";

const HUB_URL = process.env.HUB_URL?.replace(/\/$/, "");
const SYNC_TOKEN = process.env.SYNC_TOKEN;

async function readEventsFromRepo(repoPath: string): Promise<ConvoyEvent[]> {
  const file = path.join(repoPath, ".convoys", ".metrics.jsonl");
  let text: string;
  try {
    text = await fs.readFile(file, "utf8");
  } catch {
    return [];
  }
  return parseMetricsJsonl(text);
}

async function main() {
  if (!HUB_URL || !SYNC_TOKEN) {
    console.error("Set HUB_URL and SYNC_TOKEN (env or hub.env)");
    process.exit(1);
  }
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npx tsx push-to-hub.ts <repo-path> [...]");
    process.exit(1);
  }

  const all: ConvoyEvent[] = [];
  for (const repo of args) {
    const events = await readEventsFromRepo(path.resolve(repo));
    console.log(`  ${path.basename(repo)}: ${events.length} event(s)`);
    all.push(...events);
  }

  const res = await fetch(`${HUB_URL}/api/sync/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SYNC_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ events: all }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`Hub returned ${res.status}: ${body}`);
    process.exit(1);
  }
  console.log(body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
