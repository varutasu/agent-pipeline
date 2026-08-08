import { parseMetricsJsonl, type ConvoyEvent } from "../../lib/rollup";

export interface GithubRepoTarget {
  fullName: string;
  branch: string;
}

export function parseRepoTargets(raw: string | undefined): GithubRepoTarget[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((part) => {
    const [fullName, branch = "main"] = part.trim().split(":");
    return { fullName: fullName.trim(), branch: branch.trim() };
  });
}

export async function fetchMetricsFromGithub(
  target: GithubRepoTarget,
  token: string,
): Promise<{ events: ConvoyEvent[]; error?: string }> {
  const url = `https://api.github.com/repos/${target.fullName}/contents/.convoys/.metrics.jsonl?ref=${encodeURIComponent(target.branch)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "agent-pipeline-analytics-hub",
    },
    cache: "no-store",
  });

  if (res.status === 404) {
    return { events: [], error: "metrics file not found" };
  }
  if (!res.ok) {
    const body = await res.text();
    return { events: [], error: `${res.status}: ${body.slice(0, 200)}` };
  }

  const payload = (await res.json()) as { content?: string; encoding?: string };
  if (!payload.content) {
    return { events: [], error: "empty content from GitHub API" };
  }

  const decoded =
    payload.encoding === "base64"
      ? Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8")
      : payload.content;

  return { events: parseMetricsJsonl(decoded) };
}
