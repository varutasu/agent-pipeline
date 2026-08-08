/**
 * Shared convoy-event rollup — used by analyze-convoys.ts, render-dashboard.ts,
 * and the remote analytics hub.
 */

export interface ConvoyEvent {
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
  multitask_group?: string | null;
  model?: string | null;
  model_tier?: string | null;
  estimated_cost_usd?: number | null;
}

export interface ConvoySummary {
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

export interface Rollup {
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
  convoys: ConvoySummary[];
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export function rollupConvoyEvents(events: ConvoyEvent[], repoCount?: number): Rollup {
  const events_by_role: Record<string, number> = {};
  const events_by_repo: Record<string, number> = {};
  const events_by_model: Record<string, number> = {};
  const events_by_model_tier: Record<string, number> = {};
  let estimated_cost_usd_total = 0;
  let has_cost = false;
  const classification_distribution: Record<string, number> = {};
  const skip_flag_frequency: Record<string, number> = {};
  const durations_by_role: Record<string, number[]> = {};

  const uniqueRepos = new Set<string>();

  for (const ev of events) {
    uniqueRepos.add(ev.repo);
    events_by_role[ev.role] = (events_by_role[ev.role] || 0) + 1;
    events_by_repo[ev.repo] = (events_by_repo[ev.repo] || 0) + 1;
    if (ev.model) {
      events_by_model[ev.model] = (events_by_model[ev.model] || 0) + 1;
    }
    if (ev.model_tier) {
      events_by_model_tier[ev.model_tier] = (events_by_model_tier[ev.model_tier] || 0) + 1;
    }
    if (typeof ev.estimated_cost_usd === "number" && ev.estimated_cost_usd >= 0) {
      estimated_cost_usd_total += ev.estimated_cost_usd;
      has_cost = true;
    }
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

  const byConvoy = new Map<string, ConvoyEvent[]>();
  for (const ev of events) {
    const key = `${ev.repo}::${ev.convoy}`;
    const list = byConvoy.get(key) || [];
    list.push(ev);
    byConvoy.set(key, list);
  }

  const convoys: ConvoySummary[] = [];
  for (const evs of byConvoy.values()) {
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
    repo_count: repoCount ?? uniqueRepos.size,
    event_count: events.length,
    convoy_count: convoys.length,
    events_by_role,
    events_by_repo,
    events_by_model,
    events_by_model_tier,
    estimated_cost_usd_total: has_cost ? Math.round(estimated_cost_usd_total * 100) / 100 : null,
    classification_distribution,
    skip_flag_frequency,
    median_duration_by_role_s,
    convoys,
  };
}

export function parseMetricsJsonl(text: string): ConvoyEvent[] {
  const events: ConvoyEvent[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line) as ConvoyEvent);
    } catch {
      /* skip malformed */
    }
  }
  return events;
}
