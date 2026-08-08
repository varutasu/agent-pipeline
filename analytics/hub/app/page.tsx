import { DashboardView } from "@/components/dashboard-view";
import { loadRollupFromDb } from "@/lib/ingest";
import { prisma } from "@/lib/db";
import { rollupConvoyEvents } from "../../lib/rollup";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const rollup = await loadRollupFromDb();
    const last = await prisma.syncRun.findFirst({ orderBy: { createdAt: "desc" } });
    return (
      <DashboardView
        rollup={rollup}
        lastSync={last ? last.createdAt.toISOString().slice(0, 19) + "Z" : null}
        dbError={null}
      />
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    const empty = rollupConvoyEvents([]);
    return (
      <DashboardView
        rollup={empty}
        lastSync={null}
        dbError={message}
      />
    );
  }
}
