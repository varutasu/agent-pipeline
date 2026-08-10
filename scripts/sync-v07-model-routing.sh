#!/usr/bin/env bash
# One-shot sync of v0.7 model-routing artifacts to all local repos with manifests.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="0.7.0"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

find "$ROOT/../" -maxdepth 4 -name '.agent-context-manifest.yml' 2>/dev/null | while read -r manifest; do
  repo="$(dirname "$manifest")"
  name="$(basename "$repo")"
  echo "=== $name ==="
  python3 - "$repo" "$ROOT" "$VERSION" "$NOW" "$manifest" <<'PY'
import hashlib, sys, shutil, re
from pathlib import Path

repo, pipeline_root, version, now, manifest_path = sys.argv[1:6]
pipeline = Path(pipeline_root)
repo_path = Path(repo)
manifest = Path(manifest_path)

sources = {
  "skills/bootstrap-agent-context/templates/L2-roles/role-a11y-auditor.md",
  "skills/bootstrap-agent-context/templates/L2-roles/role-architect.md",
  "skills/bootstrap-agent-context/templates/L2-roles/role-conductor.md",
  "skills/bootstrap-agent-context/templates/L2-roles/role-design-system-auditor.md",
  "skills/bootstrap-agent-context/templates/L2-roles/role-doc-writer.md",
  "skills/bootstrap-agent-context/templates/L2-roles/role-ia-architect.md",
  "skills/bootstrap-agent-context/templates/L2-roles/role-implementer.md",
  "skills/bootstrap-agent-context/templates/L2-roles/role-reviewer.md",
  "skills/bootstrap-agent-context/templates/L2-roles/role-security-auditor.md",
  "skills/bootstrap-agent-context/templates/L2-roles/role-ui-designer.md",
  "skills/bootstrap-agent-context/templates/L2-roles/role-ux-reviewer.md",
  "skills/bootstrap-agent-context/templates/L1-context/model-routing.mdc.template",
  "docs/model-routing-policy.md",
}

def sha256(p: Path) -> str:
    return "sha256:" + hashlib.sha256(p.read_bytes()).hexdigest()

text = manifest.read_text()
updated = 0
for src in sources:
    src_path = pipeline / src
    if not src_path.exists():
        continue
    pattern = rf"- path: ([^\n]+)\n  source: {re.escape(src)}\n  version: [^\n]+\n  installed_hash: [^\n]+"
    m = re.search(pattern, text)
    if not m:
        continue
    dest_rel = m.group(1).strip()
    dest = repo_path / dest_rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src_path, dest)
    new_hash = sha256(dest)
    new_block = f"- path: {dest_rel}\n  source: {src}\n  version: {version}\n  installed_hash: {new_hash}"
    text = text[:m.start()] + new_block + text[m.end():]
    updated += 1
    print(f"  updated {dest_rel}")

text = re.sub(r'^pipeline_version:.*$', f'pipeline_version: {version}', text, count=1, flags=re.M)
text = re.sub(r"^last_synced_at:.*$", f"last_synced_at: '{now}'", text, count=1, flags=re.M)
manifest.write_text(text)
print(f"  manifest -> {version} ({updated} artifacts)")
PY
done

echo "Done. Review git diffs in each repo and commit."
