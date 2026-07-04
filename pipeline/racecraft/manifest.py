import json
from datetime import datetime, timezone

from . import MANIFEST_PATH


def session_key(season: int, round_number: int, session_name: str) -> str:
    return f"{season}-{round_number:02d}-{session_name}"


def load_manifest() -> dict:
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {"sessions": {}}


def save_manifest(manifest: dict) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    manifest["updated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)


def is_ingested(manifest: dict, key: str) -> bool:
    entry = manifest["sessions"].get(key)
    return bool(entry) and entry.get("status") == "ok"


def attempts(manifest: dict, key: str) -> int:
    entry = manifest["sessions"].get(key)
    return entry.get("attempts", 0) if entry else 0


def mark_ok(manifest: dict, key: str, season: int, round_number: int, session_name: str, laps: int) -> None:
    manifest["sessions"][key] = {
        "season": season,
        "round": round_number,
        "session": session_name,
        "status": "ok",
        "laps": laps,
        "ingested_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def mark_failed(manifest: dict, key: str, season: int, round_number: int, session_name: str, error: str) -> None:
    prev = manifest["sessions"].get(key, {})
    manifest["sessions"][key] = {
        "season": season,
        "round": round_number,
        "session": session_name,
        "status": "failed",
        "attempts": prev.get("attempts", 0) + 1,
        "error": error[:300],
        "last_attempt_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
