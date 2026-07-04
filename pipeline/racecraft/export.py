import json
import logging
import re
from datetime import datetime, timezone

from . import EXPORTS_DIR, PROCESSED_DIR
from .manifest import load_manifest
from .metrics import build_rankings

log = logging.getLogger("racecraft.export")

FINAL_COLS = [
    "driver", "avg_overperformance", "total_races",
    "chaos_score_norm", "sunday_score_norm",
    "active_races_latest_season", "is_active",
    "power_score", "power_score_norm",
]


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def export_all() -> None:
    final, season_over, multi_year_over, chaos_scores = build_rankings()

    # Legacy CSVs consumed by the Streamlit app (schemas must not change).
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    final[FINAL_COLS].to_csv(PROCESSED_DIR / "final_power_rankings.csv", index=False)
    season_over.to_csv(PROCESSED_DIR / "season_overperformance.csv", index=False)
    multi_year_over.to_csv(PROCESSED_DIR / "3yr_overperformance.csv", index=False)
    chaos_scores.to_csv(PROCESSED_DIR / "chaos_score.csv", index=False)
    log.info("Legacy CSVs written to %s", PROCESSED_DIR)

    # JSON exports for the future web frontend.
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (EXPORTS_DIR / "drivers").mkdir(exist_ok=True)

    active = final[final["is_active"]].copy()
    leaderboard = [
        {
            "rank": i + 1,
            "driver": row["driver"],
            "slug": _slug(row["driver"]),
            "power_score": round(float(row["power_score_norm"]), 2),
            "delta_score": round(float(row["avg_overperformance"]), 2),
            "chaos_index": round(float(row["chaos_score_norm"]), 2),
            "sunday_edge": round(float(row["sunday_score_norm"]), 2),
            "total_races": int(row["total_races"]),
        }
        for i, (_, row) in enumerate(active.iterrows())
    ]
    with open(EXPORTS_DIR / "leaderboard.json", "w", encoding="utf-8") as f:
        json.dump(leaderboard, f, indent=2)

    for _, row in final.iterrows():
        driver = row["driver"]
        trend = season_over[season_over["driver"] == driver].sort_values("season")
        payload = {
            "driver": driver,
            "slug": _slug(driver),
            "is_active": bool(row["is_active"]),
            "power_score": round(float(row["power_score_norm"]), 2),
            "delta_score": round(float(row["avg_overperformance"]), 2),
            "chaos_index": round(float(row["chaos_score_norm"]), 2),
            "sunday_edge": round(float(row["sunday_score_norm"]), 2),
            "total_races": int(row["total_races"]),
            "seasons": [
                {
                    "season": int(t["season"]),
                    "overperformance": round(float(t["overperformance"]), 3),
                    "overperformance_norm": round(float(t["overperformance_norm"]), 2),
                    "races": int(t["races"]),
                }
                for _, t in trend.iterrows()
            ],
        }
        with open(EXPORTS_DIR / "drivers" / f"{_slug(driver)}.json", "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

    manifest = load_manifest()
    ok_sessions = [s for s in manifest["sessions"].values() if s.get("status") == "ok"]
    seasons = sorted({s["season"] for s in ok_sessions})
    meta = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "seasons": seasons,
        "sessions_ingested": len(ok_sessions),
        "drivers": len(final),
        "active_drivers": int(final["is_active"].sum()),
    }
    with open(EXPORTS_DIR / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    log.info(
        "Exports written: leaderboard (%d active), %d driver files",
        len(leaderboard), len(final),
    )
