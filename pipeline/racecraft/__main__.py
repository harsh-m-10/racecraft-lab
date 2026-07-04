import argparse
import logging
import sys

from .ingest import default_seasons, ingest_seasons


def _parse_seasons(spec: str) -> list[int]:
    seasons: set[int] = set()
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-")
            seasons.update(range(int(start), int(end) + 1))
        elif part:
            seasons.add(int(part))
    return sorted(seasons)


def main() -> int:
    parser = argparse.ArgumentParser(prog="racecraft", description="Racecraft Lab data pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    p_ingest = sub.add_parser("ingest", help="Ingest missing completed sessions from FastF1")
    p_ingest.add_argument("--seasons", help="e.g. 2026 or 2024-2026 or 2024,2026 (default: 2018-current)")
    p_ingest.add_argument("--force", action="store_true", help="Re-ingest even if already in manifest")

    sub.add_parser("backfill", help="Ingest all seasons from 2018 to current (alias for ingest)")
    sub.add_parser("validate", help="Run integrity checks over the parquet datasets")
    sub.add_parser("export", help="Recompute metrics and write CSV/JSON exports")

    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

    if args.command in ("ingest", "backfill"):
        seasons = (
            _parse_seasons(args.seasons)
            if getattr(args, "seasons", None)
            else default_seasons()
        )
        ingest_seasons(seasons, force=getattr(args, "force", False))
        return 0

    if args.command == "validate":
        from .validate import validate

        failures = validate()
        return 1 if failures else 0

    if args.command == "export":
        from .export import export_all

        export_all()
        return 0

    return 2


if __name__ == "__main__":
    sys.exit(main())
