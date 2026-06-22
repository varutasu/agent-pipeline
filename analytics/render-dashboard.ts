#!/usr/bin/env tsx
/**
 * render-dashboard.ts — produce ~/agent-pipeline-data/dashboard.html
 * from convoys.json + transcripts.jsonl using dashboard-template.html.
 *
 * Run extract-transcripts.ts and analyze-convoys.ts first.
 */

import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";

const DATA_DIR = path.join(os.homedir(), "agent-pipeline-data");
const TEMPLATE = path.join(__dirname, "dashboard-template.html");
const OUTPUT = path.join(DATA_DIR, "dashboard.html");

const CONVOYS_PATH = path.join(DATA_DIR, "convoys.json");
const TRANSCRIPTS_PATH = path.join(DATA_DIR, "transcripts.jsonl");

interface ConvoyRollup {
  generated_at: string;
  repo_count: number;
  event_count: number;
  convoy_count: number;
  events_by_role: Record<string, number>;
  events_by_repo: Record<string, number>;
  events_by_model: Record<string, number>;
  events_by_model_tier: Record<string, number>;
  estimated_cost_usd_total: number | null;
  classification_distribution: Record<string, number>;
  skip_flag_frequency: Record<string, number>;
  median_duration_by_role_s: Record<string, number | null>;
  convoys: Array<{
    repo: string;
    convoy: string;
    classification: string | null;
    skip_flags: string[];
    roles_invoked: string[];
    first_event: string;
    last_event: string;
    total_duration_s: number | null;
    outcome: string | null;
  }>;
}

interface TranscriptSummary {
  chat_id: string;
  workspace: string;
  input_tokens_total: number;
  output_tokens_total: number;
  tool_calls_by_name: Record<string, number>;
  mcp_calls: number;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtNumber(n: number): string {
  return n.toLocaleString();
}

function row(...cells: Array<string | number>): string {
  return `<tr>${cells.map((c, i) => `<td${typeof c === "number" || i > 0 ? ' class="num"' : ""}>${escapeHtml(String(c))}</td>`).join("")}</tr>`;
}

function tableRows(obj: Record<string, number>, max = 10): string {
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, max);
  if (entries.length === 0) return `<tr><td colspan="2" style="color:var(--muted)">No data</td></tr>`;
  return entries.map(([k, v]) => row(k, fmtNumber(v))).join("");
}

function durationRows(obj: Record<string, number | null>): string {
  const entries = Object.entries(obj).sort((a, b) => (b[1] || 0) - (a[1] || 0));
  if (entries.length === 0) return `<tr><td colspan="2" style="color:var(--muted)">No data</td></tr>`;
  return entries.map(([k, v]) => row(k, v == null ? "—" : fmtNumber(v))).join("");
}

function convoyRows(convoys: ConvoyRollup["convoys"], max = 20): string {
  if (convoys.length === 0) return `<tr><td colspan="6" style="color:var(--muted)">No convoys yet</td></tr>`;
  return convoys.slice(0, max).map((c) => `<tr>
    <td>${escapeHtml(c.repo)}</td>
    <td>${escapeHtml(c.convoy)}</td>
    <td>${escapeHtml(c.classification || "—")}</td>
    <td>${escapeHtml(c.roles_invoked.length.toString())}</td>
    <td class="num">${c.total_duration_s == null ? "—" : fmtNumber(c.total_duration_s)}</td>
    <td>${escapeHtml(c.first_event.slice(0, 19))}</td>
  </tr>`).join("");
}

function signals(rollup: ConvoyRollup, transcripts: TranscriptSummary[]): string {
  const out: string[] = [];

  // Signal 1: total token usage trend (single number for now)
  const totalTokens = transcripts.reduce((s, t) => s + t.input_tokens_total + t.output_tokens_total, 0);

  // Signal 2: MCP utilisation
  const mcpCalls = transcripts.reduce((s, t) => s + t.mcp_calls, 0);
  const allCalls = transcripts.reduce((s, t) => s + Object.values(t.tool_calls_by_name).reduce((x, y) => x + y, 0), 0);
  if (allCalls > 0 && (mcpCalls / allCalls) < 0.01 && allCalls > 50) {
    out.push(`<li class="signal-warn"><strong>MCP layer not pulling weight</strong> — ${mcpCalls} MCP calls out of ${allCalls} total tool calls (&lt;1%). Consider disabling the MCP nudge rule and reclaiming the always-apply budget.</li>`);
  }

  // Signal 3: skip flag dominance
  const skips = Object.entries(rollup.skip_flag_frequency).sort((a, b) => b[1] - a[1]);
  if (skips.length > 0) {
    const [topFlag, topCount] = skips[0];
    if (topCount > rollup.convoy_count * 0.7 && rollup.convoy_count >= 3) {
      out.push(`<li class="signal-warn"><strong>Most convoys skip <code>${escapeHtml(topFlag)}</code></strong> — ${topCount}/${rollup.convoy_count} convoys. Investigate whether the corresponding role is needed for your stack.</li>`);
    }
  }

  // Signal 4: classification skew toward hotfix
  const classes = rollup.classification_distribution;
  const totalClassified = Object.values(classes).reduce((a, b) => a + b, 0);
  if (totalClassified > 0 && (classes["hotfix"] || 0) > totalClassified * 0.5) {
    out.push(`<li class="signal-warn"><strong>Hotfixes dominate classification</strong> — pipeline overhead may be too high for normal feature work. Lower the activation energy for <code>feature</code> runs.</li>`);
  }

  // Signal 5: premium tier dominates fast (cost leak)
  const tierCounts = rollup.events_by_model_tier || {};
  const premiumCount = tierCounts["premium"] || 0;
  const fastCount = tierCounts["fast"] || 0;
  if (premiumCount > 0 && fastCount > 0 && premiumCount > fastCount) {
    out.push(`<li class="signal-warn"><strong>Premium model tier dominates convoy events</strong> — ${premiumCount} premium vs ${fastCount} fast. Audit/implementer roles should use <code>composer-2.5-fast</code>. See <code>docs/model-routing-policy.md</code>.</li>`);
  }

  // Signal 6: role under-use
  for (const [role, count] of Object.entries(rollup.events_by_role)) {
    if (count === 0) {
      out.push(`<li class="signal-warn"><strong><code>${escapeHtml(role)}</code> never invoked</strong> — consider whether the role is needed.</li>`);
    }
  }

  // Signal 7: token volume context
  if (totalTokens > 0) {
    out.push(`<li>Total tokens across mined chats: <strong>${fmtNumber(totalTokens)}</strong>. Watch this trend — sustained increases without convoy growth suggests rule bloat.</li>`);
  }

  if (out.length === 0) {
    out.push(`<li class="signal-good">No issues detected. (Either everything's healthy, or there isn't enough data yet — run more convoys and re-render.)</li>`);
  }

  return out.join("\n    ");
}

async function loadTranscripts(): Promise<TranscriptSummary[]> {
  try {
    const raw = await fs.readFile(TRANSCRIPTS_PATH, "utf8");
    return raw.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

async function loadConvoys(): Promise<ConvoyRollup> {
  try {
    return JSON.parse(await fs.readFile(CONVOYS_PATH, "utf8"));
  } catch {
    return {
      generated_at: new Date().toISOString(),
      repo_count: 0, event_count: 0, convoy_count: 0,
      events_by_role: {}, events_by_repo: {}, events_by_model: {}, events_by_model_tier: {},
      estimated_cost_usd_total: null,
      classification_distribution: {},
      skip_flag_frequency: {}, median_duration_by_role_s: {}, convoys: [],
    };
  }
}

function aggregateTools(transcripts: TranscriptSummary[]): Record<string, number> {
  const agg: Record<string, number> = {};
  for (const t of transcripts) {
    for (const [name, count] of Object.entries(t.tool_calls_by_name)) {
      agg[name] = (agg[name] || 0) + count;
    }
  }
  return agg;
}

async function main() {
  const tmpl = await fs.readFile(TEMPLATE, "utf8");
  const convoys = await loadConvoys();
  const transcripts = await loadTranscripts();

  const totalTokens = transcripts.reduce((s, t) => s + t.input_tokens_total + t.output_tokens_total, 0);
  const mcpCalls = transcripts.reduce((s, t) => s + t.mcp_calls, 0);
  const allCalls = transcripts.reduce((s, t) => s + Object.values(t.tool_calls_by_name).reduce((x, y) => x + y, 0), 0);
  const mcpPct = allCalls > 0 ? Math.round((mcpCalls / allCalls) * 1000) / 10 : 0;

  const replacements: Record<string, string> = {
    "<!--GENERATED_AT-->": escapeHtml(new Date().toISOString()),
    "<!--CONVOY_COUNT-->": fmtNumber(convoys.convoy_count),
    "<!--REPO_COUNT-->": fmtNumber(convoys.repo_count),
    "<!--EVENT_COUNT-->": fmtNumber(convoys.event_count),
    "<!--CHAT_COUNT-->": fmtNumber(transcripts.length),
    "<!--TOTAL_TOKENS-->": fmtNumber(totalTokens),
    "<!--MCP_CALLS-->": fmtNumber(mcpCalls),
    "<!--MCP_PCT-->": String(mcpPct),
    "<!--ROLES_TABLE-->": tableRows(convoys.events_by_role),
    "<!--CLASS_TABLE-->": tableRows(convoys.classification_distribution),
    "<!--SKIPS_TABLE-->": tableRows(convoys.skip_flag_frequency),
    "<!--MODEL_TIER_TABLE-->": tableRows(convoys.events_by_model_tier || {}),
    "<!--MODEL_TABLE-->": tableRows(convoys.events_by_model || {}, 12),
    "<!--DURATION_TABLE-->": durationRows(convoys.median_duration_by_role_s),
    "<!--TOOLS_TABLE-->": tableRows(aggregateTools(transcripts), 15),
    "<!--SIGNALS-->": signals(convoys, transcripts),
    "<!--CONVOYS_TABLE-->": convoyRows(convoys.convoys),
    "<!--RAW_JSON-->": escapeHtml(JSON.stringify({ convoys, transcript_count: transcripts.length, total_tokens: totalTokens }, null, 2)),
  };

  let html = tmpl;
  for (const [k, v] of Object.entries(replacements)) {
    html = html.split(k).join(v);
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(OUTPUT, html);
  console.log(`Wrote ${OUTPUT}`);
  console.log(`Open with: open ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
