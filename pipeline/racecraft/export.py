import json
import logging
import re
import unicodedata
from datetime import datetime, timezone

import pandas as pd

from . import EXPORTS_DIR, PROCESSED_DIR
from .manifest import load_manifest
from .metrics import build_rankings
from .telemetry import build_telemetry, compute_power_v2

log = logging.getLogger("racecraft.export")

FINAL_COLS = [
    "driver", "avg_overperformance", "total_races",
    "chaos_score_norm", "sunday_score_norm",
    "active_races_latest_season", "is_active",
    "power_score", "power_score_norm",
]

TELEMETRY_FIELDS = ("race_pace", "quali_h2h", "tyre_management", "launch")


def _slug(name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")


def _round2(value) -> float | None:
    return None if pd.isna(value) else round(float(value), 2)


def _clear_dir(path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    for f in path.glob("*.json"):
        f.unlink()


def _write_json(path, payload) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def _leaderboard_row(rank: int, row: pd.Series) -> dict:
    return {
        "rank": rank,
        "driver": row["driver"],
        "slug": _slug(row["driver"]),
        "power_score": _round2(row["power_score_norm"]),
        "power_score_v2": _round2(row["power_score_v2_norm"]),
        "delta_score": _round2(row["avg_overperformance"]),
        "chaos_index": _round2(row["chaos_score_norm"]),
        "sunday_edge": _round2(row["sunday_score_norm"]),
        "race_pace": _round2(row["race_pace"]),
        "quali_h2h": _round2(row["quali_h2h"]),
        "tyre_management": _round2(row["tyre_management"]),
        "launch": _round2(row["launch"]),
        "low_confidence": bool(row["low_confidence"]),
        "total_races": int(row["total_races"]),
    }


def _season_entry(trend_row: pd.Series, tele_row: pd.Series | None) -> dict:
    entry = {
        "season": int(trend_row["season"]),
        "overperformance": round(float(trend_row["overperformance"]), 3),
        "overperformance_norm": round(float(trend_row["overperformance_norm"]), 2),
        "races": int(trend_row["races"]),
    }
    if tele_row is not None:
        entry.update({
            "race_pace_norm": _round2(tele_row.get("race_pace_norm")),
            "avg_pace_gap_pct": _round2(tele_row.get("avg_gap_pct")),
            "quali_h2h_norm": _round2(tele_row.get("quali_h2h_norm")),
            "quali_median_gap_pct": _round2(tele_row.get("median_gap_pct")),
            "tyre_management_norm": _round2(tele_row.get("tyre_management_norm")),
            "launch_norm": _round2(tele_row.get("launch_norm")),
        })
    return entry


def _export_season_files(sessions: pd.DataFrame, event_pace: pd.DataFrame, event_quali: pd.DataFrame) -> int:
    seasons_dir = EXPORTS_DIR / "seasons"
    _clear_dir(seasons_dir)

    race_events = (
        sessions[sessions["session"] == "Race"][["season", "round", "event"]]
        .drop_duplicates()
        .sort_values(["season", "round"])
    )

    count = 0
    for season, events in race_events.groupby("season"):
        payload = {"season": int(season), "events": []}
        for _, ev in events.iterrows():
            rnd = int(ev["round"])
            pace = event_pace[(event_pace["season"] == season) & (event_pace["round"] == rnd)]
            pace = pace.sort_values("gap_pct")
            quali = event_quali[(event_quali["season"] == season) & (event_quali["round"] == rnd)]
            payload["events"].append({
                "round": rnd,
                "event": ev["event"],
                "race_pace": [
                    {
                        "driver": p["driver"],
                        "median_lap_s": round(float(p["median_lap_s"]), 3),
                        "gap_pct": round(float(p["gap_pct"]), 3),
                        "clean_laps": int(p["clean_laps"]),
                    }
                    for _, p in pace.iterrows()
                ],
                "quali_h2h": [
                    {
                        "team": q["team"],
                        "driver": q["driver"],
                        "teammate": q["teammate"],
                        "segment": q["segment"],
                        "gap_pct": round(float(q["gap_pct"]), 3),
                    }
                    for _, q in quali.iterrows()
                ],
            })
        _write_json(seasons_dir / f"{int(season)}.json", payload)
        count += 1
    return count


def export_all() -> None:
    final, season_over, multi_year_over, chaos_scores = build_rankings()
    telemetry = build_telemetry()
    final = compute_power_v2(final, telemetry["career_scores"])

    # Legacy CSVs consumed by the Streamlit app (schemas must not change).
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    final[FINAL_COLS].to_csv(PROCESSED_DIR / "final_power_rankings.csv", index=False)
    season_over.to_csv(PROCESSED_DIR / "season_overperformance.csv", index=False)
    multi_year_over.to_csv(PROCESSED_DIR / "3yr_overperformance.csv", index=False)
    chaos_scores.to_csv(PROCESSED_DIR / "chaos_score.csv", index=False)

    # Telemetry tables for the Streamlit Telemetry Lab page (and debugging).
    telemetry["season_scores"].to_csv(PROCESSED_DIR / "telemetry_seasons.csv", index=False)
    final_telemetry_cols = FINAL_COLS + [
        "power_score_v2_norm", *TELEMETRY_FIELDS, "low_confidence",
    ]
    final[final_telemetry_cols].to_csv(PROCESSED_DIR / "power_v2.csv", index=False)
    log.info("CSVs written to %s", PROCESSED_DIR)

    # JSON exports for the future web frontend.
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

    active = final[final["is_active"]].sort_values("power_score_v2_norm", ascending=False)
    leaderboard = [
        _leaderboard_row(i + 1, row) for i, (_, row) in enumerate(active.iterrows())
    ]
    _write_json(EXPORTS_DIR / "leaderboard.json", leaderboard)

    drivers_dir = EXPORTS_DIR / "drivers"
    _clear_dir(drivers_dir)
    season_scores = telemetry["season_scores"]
    for _, row in final.iterrows():
        driver = row["driver"]
        trend = season_over[season_over["driver"] == driver].sort_values("season")
        tele_seasons = season_scores[season_scores["driver"] == driver].set_index("season")
        payload = {
            "driver": driver,
            "slug": _slug(driver),
            "is_active": bool(row["is_active"]),
            "power_score": _round2(row["power_score_norm"]),
            "power_score_v2": _round2(row["power_score_v2_norm"]),
            "delta_score": _round2(row["avg_overperformance"]),
            "chaos_index": _round2(row["chaos_score_norm"]),
            "sunday_edge": _round2(row["sunday_score_norm"]),
            **{f: _round2(row[f]) for f in TELEMETRY_FIELDS},
            "low_confidence": bool(row["low_confidence"]),
            "total_races": int(row["total_races"]),
            "seasons": [
                _season_entry(
                    t,
                    tele_seasons.loc[t["season"]] if t["season"] in tele_seasons.index else None,
                )
                for _, t in trend.iterrows()
            ],
        }
        _write_json(drivers_dir / f"{_slug(driver)}.json", payload)

    sessions = pd.concat(
        [pd.read_parquet(f) for f in sorted((EXPORTS_DIR.parent / "parquet" / "sessions").glob("*.parquet"))],
        ignore_index=True,
    )
    n_seasons = _export_season_files(
        sessions, telemetry["event_race_pace"], telemetry["event_quali_gaps"]
    )

    manifest = load_manifest()
    ok_sessions = [s for s in manifest["sessions"].values() if s.get("status") == "ok"]
    meta = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "seasons": sorted({s["season"] for s in ok_sessions}),
        "sessions_ingested": len(ok_sessions),
        "drivers": len(final),
        "active_drivers": int(final["is_active"].sum()),
    }
    _write_json(EXPORTS_DIR / "meta.json", meta)

    log.info(
        "Exports written: leaderboard (%d active), %d driver files, %d season files",
        len(leaderboard), len(final), n_seasons,
    )
