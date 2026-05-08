#!/usr/bin/env tsx
/**
 * analyze-convoys.ts — aggregate convoy events across one or more repos.
 *
 * Reads <repo>/.convoys/.metrics.jsonl from each repo path argument and
 * writes a consolidated rollup to ~/agent-pipeline-data/convoys.json.
 *
 * Usage:
 *   tsx analyze-convoys.ts <repo-path> [<repo-path>...]
 *
 * Schema for input rows: ./schemas/convoy-event.json
 */

import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import { createReadStream } from "fs";

const OUTPUT_DIR = path.join(os.homedir(), "agent-pipeline-data");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "convoys.json");

interface ConvoyEvent {
  ts: string;
  role: string;
  convoy: string;
  brief?: number | null;
  classification?: string | null;
  skip_flags?: string[];
  duration_s?: number | null;
  stack_class?: string | null;
  repo: string;
  outcome?: string | null;
}

interface Rollup {
  generated_at: string;
  repo_count: number;
  event_count: number;
  convoy_count: number;
  events_by_role: Record<string, number>;
  events_by_repo: Record<string, number>;
  classification_distribution: Record<string, number>;
  skip_flag_frequency: Record<string, number>;
  median_duration_by_role_s: Record<string, number | null>;
  convoys: ConvoySummary[];
}

interface ConvoySummary {
  repo: string;
  convoy: string;
  classification: string | null;
  skip_flags: string[];
  roles_invoked: string[];
  first_event: string;
  last_event: string;
  total_duration_s: number | null;
  outcome: string | null;
}

async function readEventsFromRepo(repoPath: string): Promise<ConvoyEvent[]> {
  const file = path.join(repoPath, ".convoys", ".metrics.jsonl");
  const events: ConvoyEvent[] = [];
  let rl: readline.Interface;
  try {
    rl = readline.createInterface({
      input: createReadStream(file, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });
  } catch {
    return events;
  }
  try {
    for await (const line of rl) {
      if (!line.trim()) continue;
      try { events.push(JSON.parse(line) as ConvoyEvent); } catch { /* skip malformed */ }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  return events;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function rollup(events: ConvoyEvent[], repoPaths: string[]): Rollup {
  const events_by_role: Record<string, number> = {};
  const events_by_repo: Record<string, number> = {};
  const classification_distribution: Record<string, number> = {};
  const skip_flag_frequency: Record<string, number> = {};
  const durations_by_role: Record<string, number[]> = {};

  for (const ev of events) {
    events_by_role[ev.role] = (events_by_role[ev.role] || 0) + 1;
    events_by_repo[ev.repo] = (events_by_repo[ev.repo] || 0) + 1;
    if (ev.classification) {
      classification_distribution[ev.classification] =
        (classification_distribution[ev.classification] || 0) + 1;
    }
    for (const flag of ev.skip_flags || []) {
      skip_flag_frequency[flag] = (skip_flag_frequency[flag] || 0) + 1;
    }
    if (typeof ev.duration_s === "number" && ev.duration_s >= 0) {
      (durations_by_role[ev.role] = durations_by_role[ev.role] || []).push(ev.duration_s);
    }
  }

  const median_duration_by_role_s: Record<string, number | null> = {};
  for (const role of Object.keys(durations_by_role)) {
    median_duration_by_role_s[role] = median(durations_by_role[role]);
  }

  // Per-convoy summary
  const byConvoy = new Map<string, ConvoyEvent[]>();
  for (const ev of events) {
    const key = `${ev.repo}::${ev.convoy}`;
    (byConvoy.get(key) || byConvoy.set(key, []).get(key)!).push(ev);
  }

  const convoys: ConvoySummary[] = [];
  for (const [, evs] of byConvoy) {
    evs.sort((a, b) => a.ts.localeCompare(b.ts));
    const first = evs[0];
    const last = evs[evs.length - 1];
    const totalDuration = evs.reduce((sum, e) => sum + (e.duration_s || 0), 0);
    convoys.push({
      repo: first.repo,
      convoy: first.convoy,
      classification: first.classification || null,
      skip_flags: first.skip_flags || [],
      roles_invoked: [...new Set(evs.map((e) => e.role))],
      first_event: first.ts,
      last_event: last.ts,
      total_duration_s: totalDuration > 0 ? totalDuration : null,
      outcome: last.outcome || null,
    });
  }
  convoys.sort((a, b) => b.first_event.localeCompare(a.first_event));

  return {
    generated_at: new Date().toISOString(),
    repo_count: repoPaths.length,
    event_count: events.length,
    convoy_count: convoys.length,
    events_by_role,
    events_by_repo,
    classification_distribution,
    skip_flag_frequency,
    median_duration_by_role_s,
    convoys,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: tsx analyze-convoys.ts <repo-path> [<repo-path>...]");
    process.exit(1);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const allEvents: ConvoyEvent[] = [];
  for (const repo of args) {
    const abs = path.resolve(repo);
    const events = await readEventsFromRepo(abs);
    console.log(`  ${path.basename(abs)}: ${events.length} event(s)`);
    allEvents.push(...events);
  }

  if (allEvents.length === 0) {
    console.log("No convoy events found. Have any L2 roles run yet?");
  }

  const result = rollup(allEvents, args);
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`  ${result.convoy_count} convoy(s) across ${result.repo_count} repo(s); ${result.event_count} event(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
