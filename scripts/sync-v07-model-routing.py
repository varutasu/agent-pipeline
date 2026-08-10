#!/usr/bin/env python3
"""Sync v0.7 model-routing artifacts to all local repos with manifests."""
import hashlib
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

PIPELINE = Path(__file__).resolve().parent.parent
VERSION = "0.7.0"
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

SOURCES = {
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


def sha256(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def find_manifests() -> list[Path]:
    out = subprocess.run(
        ["find", str(PIPELINE.parent), "-maxdepth", "4", "-name", ".agent-context-manifest.yml"],
        capture_output=True,
        text=True,
        check=False,
    )
    return [Path(p) for p in out.stdout.strip().split("\n") if p]


def sync_repo(manifest: Path) -> int:
    repo = manifest.parent
    print(f"=== {repo.name} ===")
    text = manifest.read_text()
    updated = 0
    for src in SOURCES:
        src_path = PIPELINE / src
        if not src_path.exists():
            continue
        pattern = rf"- path: ([^\n]+)\n  source: {re.escape(src)}\n  version: [^\n]+\n  installed_hash: [^\n]+"
        m = re.search(pattern, text)
        if not m:
            continue
        dest_rel = m.group(1).strip()
        dest = repo / dest_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_path, dest)
        new_hash = sha256(dest)
        new_block = (
            f"- path: {dest_rel}\n  source: {src}\n  version: {VERSION}\n  installed_hash: {new_hash}"
        )
        text = text[:m.start()] + new_block + text[m.end():]
        updated += 1
        print(f"  updated {dest_rel}")

    text = re.sub(r"^pipeline_version:.*$", f"pipeline_version: {VERSION}", text, count=1, flags=re.M)
    text = re.sub(r"^last_synced_at:.*$", f"last_synced_at: '{NOW}'", text, count=1, flags=re.M)
    manifest.write_text(text)
    print(f"  manifest -> {VERSION} ({updated} artifacts)")
    return updated


def main() -> None:
    total = 0
    for manifest in find_manifests():
        total += sync_repo(manifest)
    print(f"Done. {total} artifact(s) updated across repos.")


if __name__ == "__main__":
    main()
