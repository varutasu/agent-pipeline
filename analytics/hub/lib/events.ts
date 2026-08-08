import { createHash } from "crypto";
import type { ConvoyEvent } from "../../lib/rollup";

export function eventId(ev: ConvoyEvent): string {
  const canonical = JSON.stringify({
    ts: ev.ts,
    role: ev.role,
    convoy: ev.convoy,
    repo: ev.repo,
    brief: ev.brief ?? null,
    multitask_group: ev.multitask_group ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

export function toConvoyEvent(row: {
  ts: Date;
  role: string;
  convoy: string;
  repo: string;
  brief: number | null;
  classification: string | null;
  skipFlags: string[];
  durationS: number | null;
  stackClass: string | null;
  outcome: string | null;
  multitaskGroup: string | null;
  model: string | null;
  modelTier: string | null;
  estimatedCostUsd: number | null;
}): ConvoyEvent {
  return {
    ts: row.ts.toISOString(),
    role: row.role,
    convoy: row.convoy,
    repo: row.repo,
    brief: row.brief,
    classification: row.classification,
    skip_flags: row.skipFlags,
    duration_s: row.durationS,
    stack_class: row.stackClass,
    outcome: row.outcome,
    multitask_group: row.multitaskGroup,
    model: row.model,
    model_tier: row.modelTier,
    estimated_cost_usd: row.estimatedCostUsd,
  };
}

export function fromConvoyEvent(ev: ConvoyEvent, sourceFullName?: string) {
  return {
    id: eventId(ev),
    ts: new Date(ev.ts),
    role: ev.role,
    convoy: ev.convoy,
    repo: ev.repo,
    brief: ev.brief ?? null,
    classification: ev.classification ?? null,
    skipFlags: ev.skip_flags ?? [],
    durationS: ev.duration_s ?? null,
    stackClass: ev.stack_class ?? null,
    outcome: ev.outcome ?? null,
    multitaskGroup: ev.multitask_group ?? null,
    model: ev.model ?? null,
    modelTier: ev.model_tier ?? null,
    estimatedCostUsd: ev.estimated_cost_usd ?? null,
    sourceFullName: sourceFullName ?? null,
  };
}
