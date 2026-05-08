#!/usr/bin/env tsx
/**
 * extract-transcripts.ts — mine Cursor's auto-captured chat transcripts and
 * emit one TranscriptSummary per chat to ~/agent-pipeline-data/transcripts.jsonl.
 *
 * Source: ~/.cursor/projects/<workspace-id>/agent-transcripts/<chat-id>/<chat-id>.jsonl
 * Output: ~/agent-pipeline-data/transcripts.jsonl (append-only; incremental)
 *
 * Privacy: extracts COUNTS only — no prompt text, no response text, no code.
 *
 * Cursor's transcript format (observed 2026-05):
 *   - Each line: { role: "user"|"assistant", message: { content: [...] } }
 *   - Timestamps embedded in user messages as <timestamp>...</timestamp> tags
 *   - Token usage NOT exposed (the assistant's `usage` field is missing in the
 *     auto-capture stream); we record the count of messages and tool calls but
 *     leave token fields null. If a future Cursor version starts emitting usage,
 *     this script will pick it up automatically (`message.usage` probe).
 *   - Tool calls: { type: "tool_use", name: "...", input: {...} } blocks
 *
 * Schema for output: ./schemas/transcript-summary.json
 */

import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import { createReadStream } from "fs";

const PROJECTS_DIR = path.join(os.homedir(), ".cursor", "projects");
const OUTPUT_DIR = path.join(os.homedir(), "agent-pipeline-data");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "transcripts.jsonl");
const SEEN_PATH = path.join(OUTPUT_DIR, ".transcripts.seen");

const TS_TAG_RE = /<timestamp>([^<]+)<\/timestamp>/;

interface TranscriptSummary {
  chat_id: string;
  workspace: string;
  is_subagent: boolean;
  parent_chat_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_s: number | null;
  model: string | null;
  input_tokens_total: number | null;
  output_tokens_total: number | null;
  cache_read_tokens: number | null;
  cache_creation_tokens: number | null;
  tool_calls_by_name: Record<string, number>;
  mcp_calls: number;
  user_prompts: number;
  assistant_messages: number;
}

const STANDARD_TOOLS = new Set([
  "Read", "Write", "Edit", "StrReplace", "Glob", "Grep", "Shell", "AwaitShell",
  "Delete", "ReadLints", "TodoWrite", "AskQuestion", "WebSearch", "WebFetch",
  "GenerateImage", "EditNotebook", "Task", "SemanticSearch", "SetActiveBranch",
  "SwitchMode", "FetchMcpResource",
]);

function parseTimestampTag(text: string): string | null {
  const m = text.match(TS_TAG_RE);
  if (!m) return null;
  const raw = m[1];
  // Format: "Wednesday, Apr 29, 2026, 11:39 PM (UTC-5)"
  // Strip the day prefix and timezone parens for Date parsing.
  const cleaned = raw
    .replace(/^[A-Z][a-z]+,\s*/, "")
    .replace(/\s*\([^)]+\)$/, "");
  const d = Date.parse(cleaned);
  if (isNaN(d)) return null;
  return new Date(d).toISOString();
}

interface FoundTranscript {
  jsonlPath: string;
  isSubagent: boolean;
  parentChatId: string | null;
}

async function findTranscriptFiles(): Promise<FoundTranscript[]> {
  const out: FoundTranscript[] = [];
  let projects: string[] = [];
  try {
    projects = await fs.readdir(PROJECTS_DIR);
  } catch {
    console.error(`No Cursor projects directory at ${PROJECTS_DIR}. Nothing to mine.`);
    return out;
  }
  for (const proj of projects) {
    const transcriptsDir = path.join(PROJECTS_DIR, proj, "agent-transcripts");
    let chats: string[] = [];
    try {
      chats = await fs.readdir(transcriptsDir);
    } catch { continue; }
    for (const chat of chats) {
      const chatDir = path.join(transcriptsDir, chat);
      let stat;
      try { stat = await fs.stat(chatDir); } catch { continue; }
      if (!stat.isDirectory()) continue;

      // Parent transcript
      const jsonl = path.join(chatDir, `${chat}.jsonl`);
      try {
        await fs.access(jsonl);
        out.push({ jsonlPath: jsonl, isSubagent: false, parentChatId: null });
      } catch { /* no parent .jsonl */ }

      // Subagent transcripts
      const subagentDir = path.join(chatDir, "subagents");
      let subagents: string[] = [];
      try { subagents = await fs.readdir(subagentDir); } catch { continue; }
      for (const sa of subagents) {
        if (!sa.endsWith(".jsonl")) continue;
        out.push({
          jsonlPath: path.join(subagentDir, sa),
          isSubagent: true,
          parentChatId: chat,
        });
      }
    }
  }
  return out;
}

async function loadSeen(): Promise<Set<string>> {
  try {
    const data = await fs.readFile(SEEN_PATH, "utf8");
    return new Set(data.split("\n").filter(Boolean));
  } catch {
    return new Set();
  }
}

async function appendSeen(paths: string[]) {
  if (paths.length === 0) return;
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.appendFile(SEEN_PATH, paths.map((p) => p + "\n").join(""));
}

function workspaceFromPath(jsonlPath: string): string {
  // .../<projects-id>/agent-transcripts/<chat>/<chat>.jsonl
  // .../<projects-id>/agent-transcripts/<chat>/subagents/<sub>.jsonl
  const parts = jsonlPath.split(path.sep);
  const idx = parts.indexOf("agent-transcripts");
  if (idx < 1) return "unknown";
  const projectId = parts[idx - 1];
  // Project IDs are kebab-cased absolute paths; pull the last segment.
  const tail = projectId.split("-").pop() || projectId;
  return tail;
}

function extractToolCalls(content: any, summary: TranscriptSummary) {
  if (!Array.isArray(content)) return;
  for (const block of content) {
    if (block?.type === "tool_use" && block?.name) {
      const name = String(block.name);
      summary.tool_calls_by_name[name] = (summary.tool_calls_by_name[name] || 0) + 1;
      if (!STANDARD_TOOLS.has(name)) summary.mcp_calls++;
    }
  }
}

function extractTextFromContent(content: any): string {
  if (!Array.isArray(content)) return "";
  let acc = "";
  for (const block of content) {
    if (block?.type === "text" && typeof block.text === "string") acc += block.text + "\n";
  }
  return acc;
}

async function summarize(found: FoundTranscript): Promise<TranscriptSummary | null> {
  const { jsonlPath, isSubagent, parentChatId } = found;
  const fileName = path.basename(jsonlPath, ".jsonl");
  const parentDirName = path.basename(path.dirname(jsonlPath));
  const chatId = isSubagent ? fileName : (parentDirName || fileName);

  const summary: TranscriptSummary = {
    chat_id: chatId,
    workspace: workspaceFromPath(jsonlPath),
    is_subagent: isSubagent,
    parent_chat_id: parentChatId,
    started_at: "",
    ended_at: null,
    duration_s: null,
    model: null,
    input_tokens_total: null,
    output_tokens_total: null,
    cache_read_tokens: null,
    cache_creation_tokens: null,
    tool_calls_by_name: {},
    mcp_calls: 0,
    user_prompts: 0,
    assistant_messages: 0,
  };

  const rl = readline.createInterface({
    input: createReadStream(jsonlPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let firstTs: string | null = null;
  let lastTs: string | null = null;
  let sawUsage = false;

  for await (const line of rl) {
    if (!line.trim()) continue;
    let ev: any;
    try { ev = JSON.parse(line); } catch { continue; }

    const role = ev.role;
    const content = ev.message?.content;

    if (role === "user") {
      summary.user_prompts++;
      // Extract embedded timestamp
      const text = extractTextFromContent(content);
      const ts = parseTimestampTag(text);
      if (ts) {
        if (!firstTs) firstTs = ts;
        lastTs = ts;
      }
    } else if (role === "assistant") {
      summary.assistant_messages++;
      // Future-proof: pick up usage if Cursor starts emitting it
      const usage = ev.message?.usage || ev.usage;
      if (usage) {
        sawUsage = true;
        summary.input_tokens_total = (summary.input_tokens_total || 0) + (usage.input_tokens || 0);
        summary.output_tokens_total = (summary.output_tokens_total || 0) + (usage.output_tokens || 0);
        summary.cache_read_tokens = (summary.cache_read_tokens || 0) + (usage.cache_read_input_tokens || 0);
        summary.cache_creation_tokens = (summary.cache_creation_tokens || 0) + (usage.cache_creation_input_tokens || 0);
      }
      const model = ev.message?.model || ev.model;
      if (model && !summary.model) summary.model = model;
    }

    extractToolCalls(content, summary);
  }

  // Fallback to file mtime if no embedded timestamps
  if (!firstTs) {
    try {
      const st = await fs.stat(jsonlPath);
      summary.started_at = st.mtime.toISOString();
      summary.ended_at = st.mtime.toISOString();
    } catch {
      return null;
    }
  } else {
    summary.started_at = firstTs;
    summary.ended_at = lastTs;
    if (firstTs && lastTs) {
      const start = Date.parse(firstTs);
      const end = Date.parse(lastTs);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        summary.duration_s = Math.round((end - start) / 1000);
      }
    }
  }

  // If we never saw usage, leave token fields as null (caller's UI can handle)
  if (!sawUsage) {
    summary.input_tokens_total = null;
    summary.output_tokens_total = null;
    summary.cache_read_tokens = null;
    summary.cache_creation_tokens = null;
  }

  return summary;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const all = await findTranscriptFiles();
  const seen = await loadSeen();
  const fresh = all.filter((p) => !seen.has(p.jsonlPath));

  console.log(`Found ${all.length} transcript file(s); ${fresh.length} new since last run.`);
  if (fresh.length === 0) return;

  let written = 0, skipped = 0;
  const newlySeen: string[] = [];

  for (const f of fresh) {
    try {
      const summary = await summarize(f);
      if (!summary) { skipped++; newlySeen.push(f.jsonlPath); continue; }
      await fs.appendFile(OUTPUT_PATH, JSON.stringify(summary) + "\n");
      written++;
      newlySeen.push(f.jsonlPath);
    } catch (err) {
      console.error(`  failed: ${f.jsonlPath}: ${(err as Error).message}`);
    }
  }

  await appendSeen(newlySeen);
  console.log(`Wrote ${written} summaries; skipped ${skipped}.`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`\nNote: Cursor's transcript format does not currently expose token usage in`);
  console.log(`auto-captured JSONL. Tool-call counts and message counts are reliable;`);
  console.log(`token fields will be null until Cursor adds usage to the stream.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
