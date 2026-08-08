import { prisma } from "@/lib/db";
import { fromConvoyEvent, toConvoyEvent } from "@/lib/events";
import type { ConvoyEvent } from "../../lib/rollup";
import { rollupConvoyEvents } from "../../lib/rollup";

export async function loadRollupFromDb() {
  const rows = await prisma.convoyEvent.findMany({ orderBy: { ts: "asc" } });
  const events = rows.map((r) => toConvoyEvent(r));
  return rollupConvoyEvents(events);
}

export async function upsertEvents(
  events: ConvoyEvent[],
  source: string,
  sourceFullName?: string,
) {
  const rows = events.map((ev) => fromConvoyEvent(ev, sourceFullName));
  const createResult = await prisma.convoyEvent.createMany({
    data: rows,
    skipDuplicates: true,
  });
  const total = await prisma.convoyEvent.count();
  await prisma.syncRun.create({
    data: {
      source,
      eventsAdded: createResult.count,
      eventsTotal: total,
      detail: sourceFullName,
    },
  });
  return { added: createResult.count, total };
}
