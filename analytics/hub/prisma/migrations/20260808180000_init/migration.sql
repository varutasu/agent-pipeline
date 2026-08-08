-- CreateTable
CREATE TABLE "convoy_events" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "role" TEXT NOT NULL,
    "convoy" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "brief" INTEGER,
    "classification" TEXT,
    "skip_flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duration_s" INTEGER,
    "stack_class" TEXT,
    "outcome" TEXT,
    "multitask_group" TEXT,
    "model" TEXT,
    "model_tier" TEXT,
    "estimated_cost_usd" DOUBLE PRECISION,
    "source_full_name" TEXT,
    "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convoy_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "events_added" INTEGER NOT NULL,
    "events_total" INTEGER NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "convoy_events_repo_convoy_idx" ON "convoy_events"("repo", "convoy");

-- CreateIndex
CREATE INDEX "convoy_events_ts_idx" ON "convoy_events"("ts");
