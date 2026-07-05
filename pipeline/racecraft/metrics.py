"""Racecraft Lab v1 metrics (Delta Score, Chaos Index, Sunday Edge, Power Score)
ported onto the FastF1 parquet datasets.

Changes vs the legacy Ergast pipeline:
- DNFs come from official status codes; retired drivers are placed at the back
  of that race's actual field instead of a hard-coded P20.
- Chaos races are flagged by high DNF count (legacy signal) OR real wetness /
  safety-car share derived from weather and track status data.
"""

import logging

import pandas as pd

from . import PARQUET_DIR

log = logging.getLogger("racecraft.metrics")

DRIVER_FAULT_MARKERS = ("Accident", "Collision", "Spun off", "Damage")
WET_RAIN_SHARE = 0.05
SC_LAP_SHARE = 0.25
SC_STATUS_CODES = ("4", "5", "6", "7")  # SC, red flag, VSC, VSC ending


def _load_dataset(name: str) -> pd.DataFrame:
    files = sorted((PARQUET_DIR / name).glob("*.parquet"))
    if not files:
        raise FileNotFoundError(f"No parquet files for dataset '{name}' — run ingest first")
    return pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)


def zscore_normalize(df: pd.DataFrame, column: str) -> pd.DataFrame:
    mean = df[column].mean()
    std = df[column].std()
    if std == 0 or pd.isna(std):
        df[column + "_norm"] = 50.0
        return df
    df[column + "_norm"] = 50 + (df[column] - mean) * (10 / std)
    return df


def canonical_name_map(results: pd.DataFrame) -> dict:
    """Map driver_id -> most recent display name. Display names drift across
    seasons (e.g. "Andrea Kimi Antonelli" -> "Kimi Antonelli")."""
    if "driver_id" not in results.columns:
        return {}
    latest = (
        results.dropna(subset=["driver_id"])
        .sort_values(["season", "round"])
        .drop_duplicates("driver_id", keep="last")
    )
    return dict(zip(latest["driver_id"], latest["driver"]))


def build_race_frame() -> pd.DataFrame:
    """Race-session results shaped like the legacy pipeline expected:
    season, race, driver, constructor, grid, position, dnf_type."""
    results = _load_dataset("results")
    races = results[results["session"] == "Race"].copy()

    name_map = canonical_name_map(races)
    if name_map:
        races["driver"] = races["driver_id"].map(name_map).fillna(races["driver"])

    field_size = (
        races.groupby(["season", "round"])["driver"]
        .transform("count")
    )

    finished = races["status"].eq("Finished") | races["status"].str.startswith("+")
    races["dnf_type"] = "none"
    fault = races["status"].str.contains("|".join(DRIVER_FAULT_MARKERS), case=False, na=False)
    races.loc[~finished & fault, "dnf_type"] = "driver_fault"
    races.loc[~finished & ~fault, "dnf_type"] = "mechanical"

    races["position"] = races["position"].where(finished, field_size)
    races["position"] = races["position"].fillna(field_size)

    races["grid"] = races["grid"].fillna(field_size)
    races.loc[races["grid"] <= 0, "grid"] = field_size  # pit-lane starts

    frame = races.rename(columns={"event": "race", "team": "constructor"})[
        ["season", "round", "race", "driver", "constructor", "grid", "position", "dnf_type"]
    ]
    return frame.reset_index(drop=True)


def build_chaos_flags(df: pd.DataFrame) -> pd.DataFrame:
    """Per-race chaos flag: legacy high-DNF quantile signal OR wet race OR heavy safety-car share."""
    race_dnf = (
        df.groupby(["season", "round", "race"])
        .agg(total_dnfs=("dnf_type", lambda x: (x != "none").sum()))
        .reset_index()
    )
    race_dnf["dnf_threshold"] = (
        race_dnf.groupby("season")["total_dnfs"].transform(lambda s: s.quantile(0.75))
    )
    race_dnf["high_dnf"] = race_dnf["total_dnfs"] >= race_dnf["dnf_threshold"]

    weather = _load_dataset("weather")
    weather_race = weather[weather["session"] == "Race"][["season", "round", "rain_share"]]
    race_dnf = race_dnf.merge(weather_race, on=["season", "round"], how="left")
    race_dnf["wet"] = race_dnf["rain_share"].fillna(0) > WET_RAIN_SHARE

    laps = _load_dataset("laps")
    race_laps = laps[laps["session"] == "Race"].copy()
    race_laps["neutralized"] = race_laps["track_status"].fillna("").apply(
        lambda s: any(c in s for c in SC_STATUS_CODES)
    )
    sc = (
        race_laps.groupby(["season", "round"])
        .agg(sc_share=("neutralized", "mean"))
        .reset_index()
    )
    race_dnf = race_dnf.merge(sc, on=["season", "round"], how="left")
    race_dnf["heavy_sc"] = race_dnf["sc_share"].fillna(0) > SC_LAP_SHARE

    race_dnf["chaos_race"] = race_dnf["high_dnf"] | race_dnf["wet"] | race_dnf["heavy_sc"]
    return race_dnf[["season", "round", "race", "chaos_race", "total_dnfs", "wet", "sc_share"]]


def compute_overperformance(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["finish_delta"] = df["grid"] - df["position"]

    df["dnf_penalty"] = 0
    df.loc[df["dnf_type"] == "mechanical", "dnf_penalty"] = -2
    df.loc[df["dnf_type"] == "driver_fault", "dnf_penalty"] = -5

    df["adjusted_delta"] = df["finish_delta"] + df["dnf_penalty"]
    df["grid_weight"] = 1 + (df["grid"] / 20)
    df["weighted_delta"] = df["adjusted_delta"] * df["grid_weight"]

    team_baseline = (
        df.groupby(["season", "constructor"])
        .agg(team_avg_delta=("weighted_delta", "mean"))
        .reset_index()
    )
    df = df.merge(team_baseline, on=["season", "constructor"], how="left")
    df["team_adjusted_delta"] = df["weighted_delta"] - df["team_avg_delta"]

    return (
        df.groupby(["season", "driver"])
        .agg(overperformance=("team_adjusted_delta", "mean"), races=("race", "count"))
        .reset_index()
    )


def compute_chaos_score(df: pd.DataFrame, chaos_flags: pd.DataFrame) -> pd.DataFrame:
    df = df.merge(
        chaos_flags[["season", "round", "chaos_race"]],
        on=["season", "round"],
        how="left",
    )
    chaos_df = df[df["chaos_race"] == True].copy()
    if chaos_df.empty:
        return pd.DataFrame(columns=["driver", "chaos_score", "chaos_races", "chaos_score_norm"])

    chaos_df["finish_delta"] = chaos_df["grid"] - chaos_df["position"]
    chaos_df["grid_weight"] = 1 + (chaos_df["grid"] / 20)
    chaos_df["weighted_delta"] = chaos_df["finish_delta"] * chaos_df["grid_weight"]

    team_baseline = (
        chaos_df.groupby(["season", "constructor"])
        .agg(team_avg_chaos=("weighted_delta", "mean"))
        .reset_index()
    )
    chaos_df = chaos_df.merge(team_baseline, on=["season", "constructor"], how="left")
    chaos_df["team_adjusted_chaos"] = chaos_df["weighted_delta"] - chaos_df["team_avg_chaos"]

    chaos_scores = (
        chaos_df.groupby("driver")
        .agg(chaos_score=("team_adjusted_chaos", "mean"), chaos_races=("race", "count"))
        .reset_index()
    )
    chaos_scores = chaos_scores[chaos_scores["chaos_races"] >= 2]
    return zscore_normalize(chaos_scores, "chaos_score")


def compute_sunday_score(df: pd.DataFrame) -> pd.DataFrame:
    sunday_df = df.copy()
    sunday_df["finish_delta"] = sunday_df["grid"] - sunday_df["position"]

    sunday = (
        sunday_df.groupby("driver")
        .agg(
            avg_delta=("finish_delta", "mean"),
            finish_std=("position", "std"),
            races=("race", "count"),
        )
        .reset_index()
    )
    sunday = sunday[sunday["races"] >= 10]
    sunday["consistency_raw"] = -sunday["finish_std"]

    sunday = zscore_normalize(sunday, "avg_delta")
    sunday = zscore_normalize(sunday, "consistency_raw")
    sunday["sunday_raw"] = 0.6 * sunday["avg_delta_norm"] + 0.4 * sunday["consistency_raw_norm"]
    sunday = zscore_normalize(sunday, "sunday_raw")

    return sunday[["driver", "sunday_raw_norm"]].rename(
        columns={"sunday_raw_norm": "sunday_score_norm"}
    )


def build_rankings() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Compute all metrics from the parquet datasets.
    Returns (final rankings, per-season overperformance, multi-year aggregate, chaos scores)."""
    df = build_race_frame()
    log.info("Race frame: %d rows across %d seasons", len(df), df["season"].nunique())

    driver_scores = compute_overperformance(df)
    normalized = [
        zscore_normalize(group.copy(), "overperformance")
        for _, group in driver_scores.groupby("season")
    ]
    driver_scores = pd.concat(normalized).reset_index(drop=True)

    aggregate_scores = (
        driver_scores.groupby("driver")
        .agg(avg_overperformance=("overperformance_norm", "mean"), total_races=("races", "sum"))
        .reset_index()
    )

    chaos_flags = build_chaos_flags(df)
    log.info("Chaos races flagged: %d of %d", int(chaos_flags["chaos_race"].sum()), len(chaos_flags))
    chaos_scores = compute_chaos_score(df, chaos_flags)
    sunday_scores = compute_sunday_score(df)

    final = aggregate_scores.merge(
        chaos_scores[["driver", "chaos_score_norm"]], on="driver", how="left"
    ).merge(sunday_scores, on="driver", how="left")
    final["chaos_score_norm"] = final["chaos_score_norm"].fillna(50)
    final["sunday_score_norm"] = final["sunday_score_norm"].fillna(50)

    latest_season = df["season"].max()
    active_latest = (
        df[df["season"] == latest_season]
        .groupby("driver")
        .agg(active_races_latest_season=("race", "count"))
        .reset_index()
    )
    final = final.merge(active_latest, on="driver", how="left")
    final["active_races_latest_season"] = final["active_races_latest_season"].fillna(0).astype(int)
    final["is_active"] = final["active_races_latest_season"] > 0

    final["power_score"] = (
        0.5 * final["avg_overperformance"]
        + 0.3 * final["chaos_score_norm"]
        + 0.2 * final["sunday_score_norm"]
    )
    final = zscore_normalize(final, "power_score")
    final = final.sort_values("power_score_norm", ascending=False).reset_index(drop=True)

    season_over = driver_scores[
        ["season", "driver", "overperformance", "races", "overperformance_norm"]
    ].copy()
    multi_year_over = aggregate_scores.copy()

    return final, season_over, multi_year_over, chaos_scores
