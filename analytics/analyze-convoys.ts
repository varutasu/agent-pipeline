#!/usr/bin/env tsx
/**
 * analyze-convoys.ts — aggregate convoy events across one or more repos.
 *
 * Reads <repo>/.convoys/.metrics.jsonl from each repo path argument and
 * writes a consolidated rollup to ~/agent-pipeline-data/convoys.json.
 *
 * Usage:
 *   tsx analyze-convoys.ts <repo-path> [<repo-path>...]
 */

import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";
import { createReadStream } from "fs";
import * as readline from "readline";
import { rollupConvoyEvents, type ConvoyEvent } from "./lib/rollup";

const OUTPUT_DIR = path.join(os.homedir(), "agent-pipeline-data");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "convoys.json");

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
      try {
        events.push(JSON.parse(line) as ConvoyEvent);
      } catch {
        /* skip malformed */
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  return events;
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

  const result = rollupConvoyEvents(allEvents, args.length);
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(
    `  ${result.convoy_count} convoy(s) across ${result.repo_count} repo(s); ${result.event_count} event(s)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
