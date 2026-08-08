import type { Rollup } from "../../lib/rollup";

function fmt(n: number) {
  return n.toLocaleString();
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tableRows(obj: Record<string, number>, max = 10) {
  const entries = Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max);
  if (entries.length === 0) {
    return `<tr><td colspan="2" class="muted">No data</td></tr>`;
  }
  return entries
    .map(([k, v]) => `<tr><td>${escape(k)}</td><td class="num">${fmt(v)}</td></tr>`)
    .join("");
}

function durationRows(obj: Record<string, number | null>) {
  const entries = Object.entries(obj).sort((a, b) => (b[1] || 0) - (a[1] || 0));
  if (entries.length === 0) {
    return `<tr><td colspan="2" class="muted">No data</td></tr>`;
  }
  return entries
    .map(([k, v]) => `<tr><td>${escape(k)}</td><td class="num">${v == null ? "—" : fmt(v)}</td></tr>`)
    .join("");
}

function convoyRows(convoys: Rollup["convoys"], max = 25) {
  if (convoys.length === 0) {
    return `<tr><td colspan="6" class="muted">No convoys yet — run sync</td></tr>`;
  }
  return convoys
    .slice(0, max)
    .map(
      (c) =>
        `<tr>
      <td>${escape(c.repo)}</td>
      <td>${escape(c.convoy)}</td>
      <td>${escape(c.classification || "—")}</td>
      <td class="num">${c.roles_invoked.length}</td>
      <td class="num">${c.total_duration_s == null ? "—" : fmt(c.total_duration_s)}</td>
      <td>${escape(c.first_event.slice(0, 19))}</td>
    </tr>`,
    )
    .join("");
}

function signals(rollup: Rollup): string {
  const out: string[] = [];
  const tier = rollup.events_by_model_tier || {};
  const premium = tier.premium || 0;
  const fast = tier.fast || 0;
  if (premium > 0 && fast > 0 && premium > fast) {
    out.push(
      `<li class="warn"><strong>Premium tier dominates</strong> — ${premium} premium vs ${fast} fast events.</li>`,
    );
  }
  const skips = Object.entries(rollup.skip_flag_frequency).sort((a, b) => b[1] - a[1]);
  if (skips.length > 0 && skips[0][1] > rollup.convoy_count * 0.7 && rollup.convoy_count >= 3) {
    out.push(
      `<li class="warn"><strong>Skip flag <code>${escape(skips[0][0])}</code> is common</strong> — review whether that stage is needed.</li>`,
    );
  }
  if (rollup.event_count === 0) {
    out.push(
      `<li class="warn">No events in database. POST to <code>/api/sync/github</code> or push from local repos.</li>`,
    );
  }
  if (out.length === 0) {
    out.push(`<li class="good">No issues flagged. (${rollup.event_count} events loaded.)</li>`);
  }
  return out.join("\n");
}

export function DashboardView({
  rollup,
  lastSync,
  dbError,
}: {
  rollup: Rollup;
  lastSync: string | null;
  dbError?: string | null;
}) {
  return (
    <div className="page">
      <header>
        <h1>agent-pipeline · fleet dashboard</h1>
        <p className="meta">
          Generated {rollup.generated_at}
          {lastSync ? ` · last sync ${lastSync}` : ""}
        </p>
        {dbError ? (
          <p className="db-error">
            Database error: {dbError}. Check <code>DATABASE_URL</code> in Coolify (use
            <code>?sslmode=disable</code> for homelab Postgres) and that CT 107 can reach
            192.168.68.102:5432.
          </p>
        ) : null}
      </header>

      <div className="grid">
        <div className="card">
          <h2>Convoys</h2>
          <div className="stat">
            {fmt(rollup.convoy_count)}
            <span className="label">across {rollup.repo_count} repo(s)</span>
          </div>
        </div>
        <div className="card">
          <h2>Events</h2>
          <div className="stat">
            {fmt(rollup.event_count)}
            <span className="label">role invocations</span>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Role usage</h2>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th className="num">Events</th>
              </tr>
            </thead>
            <tbody dangerouslySetInnerHTML={{ __html: tableRows(rollup.events_by_role) }} />
          </table>
        </div>
        <div className="card">
          <h2>By repo</h2>
          <table>
            <thead>
              <tr>
                <th>Repo</th>
                <th className="num">Events</th>
              </tr>
            </thead>
            <tbody dangerouslySetInnerHTML={{ __html: tableRows(rollup.events_by_repo) }} />
          </table>
        </div>
        <div className="card">
          <h2>Classification</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th className="num">Count</th>
              </tr>
            </thead>
            <tbody
              dangerouslySetInnerHTML={{ __html: tableRows(rollup.classification_distribution) }}
            />
          </table>
        </div>
        <div className="card">
          <h2>Model tier</h2>
          <table>
            <thead>
              <tr>
                <th>Tier</th>
                <th className="num">Events</th>
              </tr>
            </thead>
            <tbody
              dangerouslySetInnerHTML={{ __html: tableRows(rollup.events_by_model_tier || {}) }}
            />
          </table>
        </div>
        <div className="card">
          <h2>Median duration (s)</h2>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th className="num">Seconds</th>
              </tr>
            </thead>
            <tbody
              dangerouslySetInnerHTML={{ __html: durationRows(rollup.median_duration_by_role_s) }}
            />
          </table>
        </div>
        <div className="card full">
          <h2>Signals</h2>
          <ul className="signals" dangerouslySetInnerHTML={{ __html: signals(rollup) }} />
        </div>
        <div className="card full">
          <h2>Recent convoys</h2>
          <table>
            <thead>
              <tr>
                <th>Repo</th>
                <th>Convoy</th>
                <th>Class</th>
                <th className="num">Roles</th>
                <th className="num">Duration s</th>
                <th>First event</th>
              </tr>
            </thead>
            <tbody dangerouslySetInnerHTML={{ __html: convoyRows(rollup.convoys) }} />
          </table>
        </div>
      </div>
    </div>
  );
}
