#!/usr/bin/env python3
"""Run the deterministic FigForge catalog pipeline locally.

This runner deliberately contains no AI, Codex, Rebrickable API, MOC, Git,
GitHub, Cloudflare, or deployment integration. It downloads only explicitly
allowlisted Rebrickable Catalog CSV files and the pinned official LDraw parts
archive, then invokes the repository's existing deterministic build commands.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import gzip
import hashlib
import json
import shutil
import subprocess
import sys
import urllib.parse
import zipfile
from pathlib import Path
from typing import Any, Iterable


SOURCE_POLICY = "Nur Rebrickable Catalog Downloads/CSV, keine MOC-Dateien."
REBRICKABLE_ORIGIN = "https://cdn.rebrickable.com"
REBRICKABLE_FILES = (
    "colors.csv.gz",
    "part_categories.csv.gz",
    "parts.csv.gz",
    "part_relationships.csv.gz",
    "elements.csv.gz",
    "sets.csv.gz",
    "inventories.csv.gz",
    "inventory_parts.csv.gz",
    "inventory_minifigs.csv.gz",
    "minifigs.csv.gz",
)
MAX_REBRICKABLE_BYTES = 64 * 1024 * 1024
MAX_LDRAW_BYTES = 512 * 1024 * 1024
MAX_LDRAW_UNCOMPRESSED_BYTES = 3 * 1024 * 1024 * 1024
MAX_LDRAW_FILES = 200_000


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Refresh, render, audit, and verify FigForge entirely on this computer.",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Reuse cached downloads and fail if a required file is missing.",
    )
    parser.add_argument(
        "--skip-install",
        action="store_true",
        help="Do not run npm ci when node_modules is missing.",
    )
    parser.add_argument(
        "--skip-verify",
        action="store_true",
        help="Skip the final npm run verify step.",
    )
    parser.add_argument(
        "--audit-set-prefix",
        action="append",
        default=None,
        metavar="SET",
        help="Audit a Rebrickable set family such as 71052. Repeat for more sets.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate configuration and print the planned work without changing files.",
    )
    return parser.parse_args(argv)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise RuntimeError(f"Expected a JSON object: {path}")
    return value


def validate_rebrickable_url(file_name: str, url: str) -> None:
    if file_name not in REBRICKABLE_FILES:
        raise RuntimeError(f"Rebrickable file is not allowlisted: {file_name}")
    parsed = urllib.parse.urlparse(url)
    expected_path = f"/media/downloads/{file_name}"
    if (
        parsed.scheme != "https"
        or parsed.netloc != "cdn.rebrickable.com"
        or parsed.path != expected_path
        or parsed.params
        or parsed.query
        or parsed.fragment
    ):
        raise RuntimeError(f"Rebrickable URL is outside the Catalog Downloads allowlist: {url}")
    lowered = url.lower()
    if "moc" in lowered or "/api/" in lowered:
        raise RuntimeError(f"Forbidden Rebrickable URL: {url}")


def validate_ldraw_lock(lock: dict[str, Any]) -> tuple[str, str, str]:
    if lock.get("sourcePolicy") != SOURCE_POLICY:
        raise RuntimeError("The LDraw source lock does not preserve the required source policy")
    if lock.get("library") != "LDraw Official Parts Library":
        raise RuntimeError("Only the LDraw Official Parts Library is accepted")
    if "MOC files are excluded" not in str(lock.get("contentPolicy", "")):
        raise RuntimeError("The LDraw lock must explicitly exclude MOC files")
    url = str(lock.get("archiveUrl", ""))
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != "library.ldraw.org" or parsed.path != "/library/updates/complete.zip":
        raise RuntimeError("The LDraw archive URL is outside the official allowlist")
    digest = str(lock.get("archiveSha256", ""))
    if len(digest) != 64 or any(character not in "0123456789abcdef" for character in digest):
        raise RuntimeError("The LDraw archive SHA-256 is invalid")
    release = str(lock.get("release", ""))
    return url, digest, release


def download(url: str, destination: Path, max_bytes: int, *, exact_final_url: bool) -> None:
    if shutil.which("curl") is None:
        raise RuntimeError("curl is required for HTTPS downloads")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".part")
    try:
        completed = subprocess.run(
            [
                "curl",
                "--fail",
                "--silent",
                "--show-error",
                "--location",
                "--retry",
                "3",
                "--connect-timeout",
                "30",
                "--max-time",
                "600",
                "--proto",
                "=https",
                "--proto-redir",
                "=https",
                "--max-filesize",
                str(max_bytes),
                "--user-agent",
                "FigForge-local-catalog-pipeline/1",
                "--output",
                str(temporary),
                "--write-out",
                "%{url_effective}",
                url,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        effective_url = completed.stdout.strip()
        if exact_final_url and effective_url != url:
            raise RuntimeError(f"Unexpected download redirect: {effective_url}")
        if not exact_final_url:
            effective = urllib.parse.urlparse(effective_url)
            if effective.scheme != "https" or effective.netloc != "library.ldraw.org":
                raise RuntimeError(f"LDraw download left the official host: {effective_url}")
        if not temporary.is_file() or temporary.stat().st_size > max_bytes:
            raise RuntimeError(f"Download exceeds the size limit: {destination.name}")
        temporary.replace(destination)
    except subprocess.CalledProcessError as error:
        message = error.stderr.strip() or f"curl exited with code {error.returncode}"
        raise RuntimeError(f"Download failed for {destination.name}: {message}") from error
    finally:
        temporary.unlink(missing_ok=True)


def ensure_rebrickable_downloads(cache_dir: Path, *, offline: bool) -> dict[str, dict[str, Any]]:
    metadata: dict[str, dict[str, Any]] = {}
    for file_name in REBRICKABLE_FILES:
        url = f"{REBRICKABLE_ORIGIN}/media/downloads/{file_name}"
        validate_rebrickable_url(file_name, url)
        path = cache_dir / file_name
        if offline:
            if not path.is_file():
                raise RuntimeError(f"Offline cache is missing {file_name}: {path}")
        else:
            print(f"Downloading Rebrickable Catalog CSV: {file_name}", flush=True)
            download(url, path, MAX_REBRICKABLE_BYTES, exact_final_url=True)
        metadata[file_name] = {
            "url": url,
            "sha256": sha256_file(path),
            "bytes": path.stat().st_size,
        }
    return metadata


def safe_extract_ldraw(archive_path: Path, destination: Path) -> None:
    destination_resolved = destination.resolve()
    with zipfile.ZipFile(archive_path) as archive:
        members = archive.infolist()
        if len(members) > MAX_LDRAW_FILES:
            raise RuntimeError("LDraw archive contains too many files")
        if sum(member.file_size for member in members) > MAX_LDRAW_UNCOMPRESSED_BYTES:
            raise RuntimeError("LDraw archive exceeds the uncompressed size limit")
        for member in members:
            target = (destination / member.filename).resolve()
            if target != destination_resolved and destination_resolved not in target.parents:
                raise RuntimeError(f"Unsafe path in LDraw archive: {member.filename}")
        if destination.exists():
            shutil.rmtree(destination)
        destination.mkdir(parents=True)
        archive.extractall(destination)


def ensure_ldraw(root: Path, *, offline: bool) -> dict[str, Any]:
    lock = read_json(root / "data/ldraw-source.lock.json")
    url, expected_hash, release = validate_ldraw_lock(lock)
    base = root / "data/incoming/ldraw-2608"
    archive_path = base / "complete.zip"
    extracted = base / "extracted"
    library = extracted / "ldraw"
    archive_is_valid = archive_path.is_file() and sha256_file(archive_path) == expected_hash
    if not archive_is_valid:
        if offline:
            raise RuntimeError("The pinned official LDraw archive is missing or has the wrong SHA-256")
        print(f"Downloading pinned official LDraw release {release}", flush=True)
        download(url, archive_path, MAX_LDRAW_BYTES, exact_final_url=False)
        if sha256_file(archive_path) != expected_hash:
            archive_path.unlink(missing_ok=True)
            raise RuntimeError("Downloaded LDraw archive does not match the pinned SHA-256")
    required_files = (library / "parts", library / "p", library / "LDConfig.ldr")
    if not all(path.exists() for path in required_files):
        print("Extracting pinned official LDraw archive", flush=True)
        safe_extract_ldraw(archive_path, extracted)
    if not all(path.exists() for path in required_files):
        raise RuntimeError("The extracted LDraw library is incomplete")
    return {
        "library": lock["library"],
        "release": release,
        "archiveUrl": url,
        "archiveSha256": expected_hash,
        "archiveBytes": archive_path.stat().st_size,
    }


def major_version(command: str, argument: str = "--version") -> int:
    completed = subprocess.run(
        [command, argument],
        check=True,
        capture_output=True,
        text=True,
    )
    value = completed.stdout.strip().lstrip("v")
    return int(value.split(".", maxsplit=1)[0])


def check_runtime(root: Path, *, skip_install: bool, dry_run: bool) -> None:
    if sys.version_info < (3, 11):
        raise RuntimeError("Python 3.11 or newer is required")
    if shutil.which("node") is None or shutil.which("npm") is None:
        raise RuntimeError("Node.js and npm are required")
    if major_version("node") != 24:
        raise RuntimeError("FigForge requires Node.js 24.x")
    if major_version("npm") < 11:
        raise RuntimeError("FigForge requires npm 11 or newer")
    if not (root / "node_modules").is_dir() and skip_install:
        raise RuntimeError("node_modules is missing but --skip-install was requested")
    if dry_run:
        print("Runtime preflight passed", flush=True)


def run_command(command: list[str], root: Path, log_handle: Any) -> None:
    rendered = " ".join(command)
    print(f"\n$ {rendered}", flush=True)
    log_handle.write(f"\n$ {rendered}\n")
    log_handle.flush()
    process = subprocess.Popen(
        command,
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    assert process.stdout is not None
    for line in process.stdout:
        print(line, end="", flush=True)
        log_handle.write(line)
    return_code = process.wait()
    log_handle.flush()
    if return_code != 0:
        raise RuntimeError(f"Command failed with exit code {return_code}: {rendered}")


def gzip_rows(path: Path) -> Iterable[dict[str, str]]:
    with gzip.open(path, "rt", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def load_package_parts(root: Path) -> list[dict[str, Any]]:
    package_dir = root / "data/generated/catalog-packages"
    rows: list[dict[str, Any]] = []
    for name in ("head.json", "headwear.json", "torso-assembly.json", "legs-assembly.json", "hand-accessory.json"):
        value = read_json(package_dir / name)
        rows.extend(value.get("parts", []))
    return rows


def audit_set_prefix(root: Path, cache_dir: Path, prefix: str) -> dict[str, Any]:
    set_prefix = f"{prefix}-"
    sets = {
        row["set_num"]: row
        for row in gzip_rows(cache_dir / "sets.csv.gz")
        if row.get("set_num", "").startswith(set_prefix)
    }
    if not sets:
        return {"setPrefix": prefix, "status": "not-found", "setCount": 0}

    inventories_for_sets = {
        row["set_num"]: row["id"]
        for row in gzip_rows(cache_dir / "inventories.csv.gz")
        if row.get("set_num") in sets
    }
    set_inventory_ids = set(inventories_for_sets.values())
    figure_numbers = {
        row["fig_num"]
        for row in gzip_rows(cache_dir / "inventory_minifigs.csv.gz")
        if row.get("inventory_id") in set_inventory_ids
    }
    inventories_for_figures = {
        row["set_num"]: row["id"]
        for row in gzip_rows(cache_dir / "inventories.csv.gz")
        if row.get("set_num") in figure_numbers
    }
    relevant_inventory_ids = set_inventory_ids | set(inventories_for_figures.values())
    part_numbers = {
        row["part_num"]
        for row in gzip_rows(cache_dir / "inventory_parts.csv.gz")
        if row.get("inventory_id") in relevant_inventory_ids
    }
    figure_names = {
        row["fig_num"]: row["name"]
        for row in gzip_rows(cache_dir / "minifigs.csv.gz")
        if row.get("fig_num") in figure_numbers
    }

    normalized = read_json(root / "data/generated/catalog-normalized.json").get("parts", [])
    normalized_ids = {row.get("partNum") for row in normalized}
    packaged = load_package_parts(root)
    packaged_ids = {row.get("rebrickablePartNum") for row in packaged}
    expanded = read_json(root / "data/generated/ldraw-expanded-catalog.json").get("entries", [])
    expanded_ids = {row.get("rebrickablePartNum") for row in expanded if row.get("status") == "verified"}

    return {
        "setPrefix": prefix,
        "status": "audited",
        "sets": [
            {
                "setNum": set_num,
                "name": sets[set_num].get("name"),
                "year": sets[set_num].get("year"),
            }
            for set_num in sorted(sets)
        ],
        "setCount": len(sets),
        "figureCount": len(figure_numbers),
        "figures": [
            {"figNum": number, "name": figure_names.get(number)}
            for number in sorted(figure_numbers)
        ],
        "uniqueInventoryPartCount": len(part_numbers),
        "normalizedPartCount": len(part_numbers & normalized_ids),
        "missingNormalizedPartNumbers": sorted(part_numbers - normalized_ids),
        "packagedMinifigPartCount": len(part_numbers & packaged_ids),
        "outsideCurrentMinifigPackagesCount": len(part_numbers - packaged_ids),
        "builderReadyPartCount": len(part_numbers & expanded_ids),
        "notBuilderReadyPartCount": len(part_numbers - expanded_ids),
    }


def write_report(
    report_path: Path,
    downloads: dict[str, dict[str, Any]],
    ldraw: dict[str, Any],
    audits: list[dict[str, Any]],
    commands: list[list[str]],
) -> None:
    report = {
        "schemaVersion": 1,
        "generatedAt": dt.datetime.now(dt.UTC).isoformat(),
        "sourcePolicy": SOURCE_POLICY,
        "execution": {
            "mode": "local-deterministic",
            "aiUsed": False,
            "codexUsed": False,
            "rebrickableApiUsed": False,
            "mocFilesUsed": 0,
            "gitMutationPerformed": False,
            "deploymentPerformed": False,
        },
        "rebrickableCatalogDownloads": downloads,
        "ldraw": ldraw,
        "setAudits": audits,
        "commands": commands,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    root = Path(__file__).resolve().parents[1]
    audit_prefixes = args.audit_set_prefix or ["71052"]
    cache_dir = root / "data/incoming/rebrickable-current"
    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = root / "work/local-catalog-pipeline" / timestamp
    commands: list[list[str]] = []
    if not (root / "package.json").is_file() or not (root / "data/sources.lock.json").is_file():
        raise RuntimeError(f"FigForge repository root is incomplete: {root}")

    check_runtime(root, skip_install=args.skip_install, dry_run=args.dry_run)
    if not (root / "node_modules").is_dir():
        commands.append(["npm", "ci"])
    commands.extend([
        ["npm", "run", "data:refresh:remote", "--", "--source-dir", str(cache_dir)],
        ["npm", "run", "assets:ldraw-expanded"],
        ["npm", "run", "assets:analyze:ldraw-coverage"],
        ["npm", "run", "assets:analyze:placement-candidates"],
    ])
    if not args.skip_verify:
        commands.append(["npm", "run", "verify"])

    if args.dry_run:
        print(SOURCE_POLICY)
        print("No AI/Codex calls, Git mutation, GitHub action, Cloudflare action, or deployment will run.")
        print("Allowed Rebrickable files:")
        for file_name in REBRICKABLE_FILES:
            print(f"  - {file_name}")
        print("Planned commands:")
        for command in commands:
            print(f"  $ {' '.join(command)}")
        print(f"Set audits: {', '.join(audit_prefixes)}")
        return 0

    run_dir.mkdir(parents=True)
    log_path = run_dir / "pipeline.log"
    report_path = run_dir / "report.json"
    print(f"Local pipeline log: {log_path}", flush=True)
    downloads = ensure_rebrickable_downloads(cache_dir, offline=args.offline)
    ldraw = ensure_ldraw(root, offline=args.offline)
    with log_path.open("w", encoding="utf-8") as log_handle:
        log_handle.write(f"{SOURCE_POLICY}\n")
        log_handle.write("Execution mode: local deterministic; no AI/Codex/API/MOC/deployment\n")
        for command in commands:
            run_command(command, root, log_handle)
    audits = [audit_set_prefix(root, cache_dir, prefix) for prefix in audit_prefixes]
    write_report(report_path, downloads, ldraw, audits, commands)
    print("\nLocal catalog pipeline completed.", flush=True)
    print(f"Audit report: {report_path}", flush=True)
    print("No commit, push, pull request, or deployment was performed.", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1) from error
