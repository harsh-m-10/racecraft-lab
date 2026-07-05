"""Telemetry-grade metrics computed from lap-level data:

- Race Pace: median clean-lap % gap to the race-best median
- Tyre Management: stint degradation slope advantage vs teammate on same compound
- Qualifying Head-to-Head: teammate gap in the deepest shared quali segment
- Launch Rating: positions gained on lap 1
- Power Score v2: composite of the above plus the v1 metrics

All lap-based metrics use clean racing laps only (accurate, not deleted,
green-flag, no pit in/out) and exclude wet races. Everything is computed on
the stable driver_id and mapped to canonical display names at the end.
"""

import logging

import numpy as np
import pandas as pd

from .metrics import (
    WET_RAIN_SHARE,
    _load_dataset,
    canonical_name_map,
    zscore_normalize,
)

log = logging.getLogger("racecraft.telemetry")

MIN_CLEAN_LAPS_RACE = 10
MIN_RACES_SEASON = 5
MIN_STINT_LAPS = 5
MIN_QUALI_SESSIONS = 3

POWER_V2_WEIGHTS = {
    "race_pace": 0.25,
    "quali_h2h": 0.20,
    "delta": 0.20,
    "sunday": 0.10,
    "chaos": 0.10,
    "tyre_management": 0.10,
    "launch": 0.05,
}


def _wet_race_keys(weather: pd.DataFrame) -> set:
    wet = weather[(weather["session"] == "Race") & (weather["rain_share"].fillna(0) > WET_RAIN_SHARE)]
    return set(zip(wet["season"], wet["round"]))


def _attach_driver_id(laps: pd.DataFrame, results: pd.DataFrame) -> pd.DataFrame:
    ids = results[["season", "round", "session", "driver_number", "driver_id", "team"]].drop_duplicates()
    return laps.merge(ids, on=["season", "round", "session", "driver_number"], how="left",
                      suffixes=("", "_res"))


def load_clean_race_laps(laps: pd.DataFrame, results: pd.DataFrame, weather: pd.DataFrame) -> pd.DataFrame:
    race = laps[laps["session"] == "Race"].copy()
    clean = race[
        race["is_accurate"].fillna(False).astype(bool)
        & ~race["deleted"].fillna(False).astype(bool)
        & (race["track_status"] == "1")
        & race["pit_in_s"].isna()
        & race["pit_out_s"].isna()
        & race["lap_time_s"].notna()
    ].copy()

    wet_keys = _wet_race_keys(weather)
    if wet_keys:
        mask = clean.apply(lambda r: (r["season"], r["round"]) in wet_keys, axis=1)
        clean = clean[~mask]

    return _attach_driver_id(clean, results)


# ==========================
# RACE PACE
# ==========================
def compute_race_pace(clean: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Returns (per-event race pace table, per-season normalized scores)."""
    med = (
        clean.groupby(["season", "round", "event", "driver_id"])
        .agg(median_lap_s=("lap_time_s", "median"), clean_laps=("lap_time_s", "count"))
        .reset_index()
    )
    med = med[med["clean_laps"] >= MIN_CLEAN_LAPS_RACE].copy()
    med["best_median"] = med.groupby(["season", "round"])["median_lap_s"].transform("min")
    med["gap_pct"] = (med["median_lap_s"] / med["best_median"] - 1) * 100

    season = (
        med.groupby(["season", "driver_id"])
        .agg(avg_gap_pct=("gap_pct", "mean"), races=("gap_pct", "count"))
        .reset_index()
    )
    season = season[season["races"] >= MIN_RACES_SEASON].copy()
    season["pace_raw"] = -season["avg_gap_pct"]

    normalized = [
        zscore_normalize(g.copy(), "pace_raw") for _, g in season.groupby("season")
    ]
    season = pd.concat(normalized).reset_index(drop=True) if normalized else season
    season = season.rename(columns={"pace_raw_norm": "race_pace_norm"})

    return med, season[["season", "driver_id", "race_pace_norm", "avg_gap_pct", "races"]]


# ==========================
# TYRE MANAGEMENT
# ==========================
def _stint_slope(group: pd.DataFrame) -> float | None:
    if len(group) < MIN_STINT_LAPS or group["tyre_life"].nunique() < 3:
        return None
    return float(np.polyfit(group["tyre_life"], group["lap_time_s"], 1)[0])


def compute_tyre_management(clean: pd.DataFrame) -> pd.DataFrame:
    stints = (
        clean.dropna(subset=["tyre_life", "stint"])
        .groupby(["season", "round", "team", "driver_id", "stint", "compound"])
        .apply(_stint_slope, include_groups=False)
        .dropna()
        .reset_index(name="deg_slope")
    )

    driver_compound = (
        stints.groupby(["season", "round", "team", "driver_id", "compound"])
        .agg(deg=("deg_slope", "mean"))
        .reset_index()
    )

    # Pair teammates on the same race + compound; the shared fuel effect cancels.
    paired = driver_compound.merge(
        driver_compound,
        on=["season", "round", "team", "compound"],
        suffixes=("", "_mate"),
    )
    paired = paired[paired["driver_id"] != paired["driver_id_mate"]]
    paired["deg_advantage"] = paired["deg_mate"] - paired["deg"]

    season = (
        paired.groupby(["season", "driver_id"])
        .agg(avg_deg_advantage=("deg_advantage", "mean"), stint_comparisons=("deg_advantage", "count"))
        .reset_index()
    )
    season = season[season["stint_comparisons"] >= 3].copy()

    normalized = [
        zscore_normalize(g.copy(), "avg_deg_advantage") for _, g in season.groupby("season")
    ]
    season = pd.concat(normalized).reset_index(drop=True) if normalized else season
    return season.rename(columns={"avg_deg_advantage_norm": "tyre_management_norm"})[
        ["season", "driver_id", "tyre_management_norm", "avg_deg_advantage", "stint_comparisons"]
    ]


# ==========================
# QUALIFYING HEAD-TO-HEAD
# ==========================
def compute_quali_h2h(results: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Returns (per-event teammate gaps, per-season normalized scores)."""
    quali = results[results["session"] == "Qualifying"].copy()

    pairs = quali.merge(
        quali,
        on=["season", "round", "event", "team"],
        suffixes=("", "_mate"),
    )
    pairs = pairs[pairs["driver_id"] != pairs["driver_id_mate"]]

    def deepest_shared(row) -> tuple[str, float, float] | None:
        for seg in ("q3_s", "q2_s", "q1_s"):
            t1, t2 = row[seg], row[seg + "_mate"]
            if pd.notna(t1) and pd.notna(t2):
                return seg[:2].upper(), t1, t2
        return None

    shared = pairs.apply(deepest_shared, axis=1)
    pairs = pairs[shared.notna()].copy()
    pairs[["segment", "own_s", "mate_s"]] = pd.DataFrame(
        [s for s in shared if s is not None], index=pairs.index
    )
    pairs["gap_pct"] = (pairs["own_s"] / pairs["mate_s"] - 1) * 100
    pairs["beat_mate"] = pairs["own_s"] < pairs["mate_s"]

    event_gaps = pairs[[
        "season", "round", "event", "team", "driver_id", "driver_id_mate",
        "segment", "own_s", "mate_s", "gap_pct",
    ]].copy()

    season = (
        pairs.groupby(["season", "driver_id"])
        .agg(
            median_gap_pct=("gap_pct", "median"),
            win_rate=("beat_mate", "mean"),
            quali_sessions=("gap_pct", "count"),
        )
        .reset_index()
    )
    season = season[season["quali_sessions"] >= MIN_QUALI_SESSIONS].copy()
    season["gap_score"] = -season["median_gap_pct"]

    normalized = []
    for _, g in season.groupby("season"):
        g = zscore_normalize(g.copy(), "gap_score")
        g = zscore_normalize(g, "win_rate")
        g["quali_raw"] = 0.7 * g["gap_score_norm"] + 0.3 * g["win_rate_norm"]
        g = zscore_normalize(g, "quali_raw")
        normalized.append(g)
    season = pd.concat(normalized).reset_index(drop=True) if normalized else season
    season = season.rename(columns={"quali_raw_norm": "quali_h2h_norm"})

    return event_gaps, season[[
        "season", "driver_id", "quali_h2h_norm", "median_gap_pct", "win_rate", "quali_sessions",
    ]]


# ==========================
# LAUNCH RATING (LAP 1)
# ==========================
def compute_launch(laps: pd.DataFrame, results: pd.DataFrame) -> pd.DataFrame:
    lap1 = laps[(laps["session"] == "Race") & (laps["lap_number"] == 1) & laps["position"].notna()]
    lap1 = _attach_driver_id(lap1.copy(), results)

    grids = results[results["session"] == "Race"][["season", "round", "driver_id", "grid"]]
    lap1 = lap1.merge(grids, on=["season", "round", "driver_id"], how="left", suffixes=("", "_res"))
    lap1 = lap1[lap1["grid"].fillna(0) > 0]  # exclude pit-lane starts
    lap1["gained"] = lap1["grid"] - lap1["position"]

    season = (
        lap1.groupby(["season", "driver_id"])
        .agg(avg_lap1_gain=("gained", "mean"), starts=("gained", "count"))
        .reset_index()
    )
    season = season[season["starts"] >= MIN_RACES_SEASON].copy()

    normalized = [
        zscore_normalize(g.copy(), "avg_lap1_gain") for _, g in season.groupby("season")
    ]
    season = pd.concat(normalized).reset_index(drop=True) if normalized else season
    return season.rename(columns={"avg_lap1_gain_norm": "launch_norm"})[
        ["season", "driver_id", "launch_norm", "avg_lap1_gain", "starts"]
    ]


# ==========================
# ASSEMBLY
# ==========================
def build_telemetry() -> dict:
    """Compute all telemetry metrics. Returns dict with:
    season_scores, career_scores, event_race_pace, event_quali_gaps, name_map."""
    laps = _load_dataset("laps")
    results = _load_dataset("results")
    weather = _load_dataset("weather")

    clean = load_clean_race_laps(laps, results, weather)
    log.info("Clean race laps: %d of %d", len(clean), len(laps))

    event_pace, pace_season = compute_race_pace(clean)
    tyre_season = compute_tyre_management(clean)
    event_quali, quali_season = compute_quali_h2h(results)
    launch_season = compute_launch(laps, results)

    season_scores = (
        pace_season.merge(tyre_season, on=["season", "driver_id"], how="outer")
        .merge(quali_season, on=["season", "driver_id"], how="outer")
        .merge(launch_season, on=["season", "driver_id"], how="outer")
    )

    career = (
        season_scores.groupby("driver_id")
        .agg(
            race_pace=("race_pace_norm", "mean"),
            tyre_management=("tyre_management_norm", "mean"),
            quali_h2h=("quali_h2h_norm", "mean"),
            launch=("launch_norm", "mean"),
        )
        .reset_index()
    )
    career["low_confidence"] = career["race_pace"].isna() | career["quali_h2h"].isna()

    name_map = canonical_name_map(results)
    for df in (season_scores, career, event_pace, event_quali):
        df["driver"] = df["driver_id"].map(name_map)
    event_quali["teammate"] = event_quali["driver_id_mate"].map(name_map)

    log.info(
        "Telemetry: %d season scores, %d careers (%d low-confidence)",
        len(season_scores), len(career), int(career["low_confidence"].sum()),
    )
    return {
        "season_scores": season_scores,
        "career_scores": career,
        "event_race_pace": event_pace,
        "event_quali_gaps": event_quali,
    }


def compute_power_v2(final_v1: pd.DataFrame, career: pd.DataFrame) -> pd.DataFrame:
    """Blend v1 metrics (keyed on canonical driver name) with telemetry careers."""
    merged = final_v1.merge(
        career[["driver", "race_pace", "tyre_management", "quali_h2h", "launch", "low_confidence"]],
        on="driver", how="left",
    )
    merged["low_confidence"] = merged["low_confidence"].fillna(True)

    filled = {
        "race_pace": merged["race_pace"].fillna(50),
        "quali_h2h": merged["quali_h2h"].fillna(50),
        "tyre_management": merged["tyre_management"].fillna(50),
        "launch": merged["launch"].fillna(50),
        "delta": merged["avg_overperformance"],
        "sunday": merged["sunday_score_norm"],
        "chaos": merged["chaos_score_norm"],
    }
    merged["power_v2_raw"] = sum(POWER_V2_WEIGHTS[k] * v for k, v in filled.items())
    merged = zscore_normalize(merged, "power_v2_raw")
    return merged.rename(columns={"power_v2_raw_norm": "power_score_v2_norm"})
