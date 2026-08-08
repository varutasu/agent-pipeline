import { DashboardView } from "@/components/dashboard-view";
import { loadRollupFromDb } from "@/lib/ingest";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rollup = await loadRollupFromDb();
  const last = await prisma.syncRun.findFirst({ orderBy: { createdAt: "desc" } });
  return (
    <DashboardView
      rollup={rollup}
      lastSync={last ? last.createdAt.toISOString().slice(0, 19) + "Z" : null}
    />
  );
}
