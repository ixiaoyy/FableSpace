"""Permanently retire the reviewed legacy FableSpace runtime and private data."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path


LEGACY_SERVICES = {"backend", "memory-worker", "llm-proxy"}
PRESERVED_BACKUP_DIRECTORIES = {"mirror-island-keycloak", "mirror-island-game"}
LEGACY_DATABASE = "fablespace"


def checked_child(root: Path, target: Path) -> Path:
    """Resolve one target and require it to remain below the explicitly owned root."""
    resolved_root = root.resolve()
    resolved_target = target.resolve()
    if resolved_target == resolved_root or resolved_root not in resolved_target.parents:
        raise ValueError(f"Retirement target escapes owned root: {resolved_target}")
    return resolved_target


def docker_output(arguments: list[str], *, cwd: Path | None = None) -> str:
    """Run one read-only Docker inventory command and return stripped stdout."""
    completed = subprocess.run(
        ["docker", *arguments],
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
    )
    return completed.stdout.strip()


def legacy_containers(project: str) -> list[str]:
    """Return exact container IDs for reviewed legacy services in one Compose project."""
    output = docker_output(
        [
            "ps",
            "-a",
            "--filter",
            f"label=com.docker.compose.project={project}",
            "--format",
            "{{.ID}} {{.Label \"com.docker.compose.service\"}}",
        ]
    )
    result: list[str] = []
    for line in output.splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[1] in LEGACY_SERVICES:
            result.append(parts[0])
    return sorted(result)


def legacy_volume(project: str) -> str | None:
    """Resolve only the project-owned named volume ending in the exact legacy suffix."""
    output = docker_output(
        [
            "volume",
            "ls",
            "--filter",
            f"label=com.docker.compose.project={project}",
            "--format",
            "{{.Name}}",
        ]
    )
    matches = sorted(
        name for name in output.splitlines() if name == f"{project}_fablespace_data"
    )
    if len(matches) > 1:
        raise ValueError("Legacy FableSpace volume is ambiguous")
    return matches[0] if matches else None


def old_backup_targets(workspace: Path) -> list[Path]:
    """List non-symlink legacy backup children while preserving new Mirror Island backups."""
    backup_root = workspace / "backups"
    if not backup_root.exists():
        return []
    if backup_root.is_symlink():
        raise ValueError("Backup root must not be a symlink")
    targets: list[Path] = []
    for child in backup_root.iterdir():
        if child.name in PRESERVED_BACKUP_DIRECTORIES:
            continue
        if child.is_symlink():
            raise ValueError(f"Backup target must not be a symlink: {child}")
        targets.append(checked_child(backup_root, child))
    return sorted(targets)


def remove_path(path: Path) -> None:
    """Permanently remove one already-validated file or directory target."""
    if path.is_dir():
        shutil.rmtree(path)
    elif path.exists():
        path.unlink()


def drop_legacy_database(parallellines_path: Path) -> None:
    """Drop only the exact FableSpace database through the existing ParallelLines DB service."""
    sql = f"DROP DATABASE IF EXISTS `{LEGACY_DATABASE}`;"
    subprocess.run(
        [
            "docker",
            "compose",
            "-p",
            "parallellines",
            "exec",
            "-T",
            "db",
            "sh",
            "-ec",
            f'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e {json.dumps(sql)}',
        ],
        cwd=parallellines_path,
        check=True,
    )


def main() -> None:
    """Print the exact retirement inventory and apply it only with the explicit flag."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", type=Path, default=Path("/opt/fablespace"))
    parser.add_argument(
        "--parallellines-path",
        type=Path,
        default=Path("/opt/parallellines"),
    )
    parser.add_argument("--compose-project", default="fablespace")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    workspace = args.workspace.resolve()
    if workspace == Path("/") or not workspace.is_dir():
        raise SystemExit("FableSpace workspace is missing or unsafe")
    parallellines_path = args.parallellines_path.resolve()
    if parallellines_path == Path("/") or not parallellines_path.is_dir():
        raise SystemExit("ParallelLines workspace is missing or unsafe")
    if args.compose_project != "fablespace":
        raise SystemExit("Legacy Compose project must be exactly fablespace")

    containers = legacy_containers(args.compose_project)
    volume = legacy_volume(args.compose_project)
    backups = old_backup_targets(workspace)
    host_targets = [
        checked_child(workspace, workspace / "apps" / "api"),
        checked_child(Path("/opt"), Path("/opt/fablespace-schema")),
        checked_child(Path("/opt"), Path("/opt/fablespace-secrets") / "llm-proxy"),
    ]
    inventory = {
        "apply": args.apply,
        "containers": containers,
        "database": LEGACY_DATABASE,
        "volume": volume,
        "host_targets": [str(path) for path in host_targets if path.exists()],
        "backup_targets": [str(path) for path in backups],
        "preserved_backups": sorted(PRESERVED_BACKUP_DIRECTORIES),
    }
    print(json.dumps(inventory, ensure_ascii=False, sort_keys=True))
    if not args.apply:
        return

    if containers:
        subprocess.run(["docker", "rm", "-f", *containers], check=True)
    drop_legacy_database(parallellines_path)
    if volume:
        subprocess.run(["docker", "volume", "rm", volume], check=True)
    for target in [*host_targets, *backups]:
        remove_path(target)
    subprocess.run(
        ["docker", "image", "rm", "fablespace-backend:local"],
        check=False,
    )
    print("legacy_fablespace_retirement=complete")


if __name__ == "__main__":
    main()
