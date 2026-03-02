import requests
import pandas as pd
import numpy as np
from datetime import datetime

BASE_URL = "https://api.jolpi.ca/ergast/f1"


# ==========================
# DATA FETCHING
# ==========================
def fetch_season(year: int) -> pd.DataFrame:
    url = f"{BASE_URL}/{year}/results?limit=1000"
    response = requests.get(url)
    response.raise_for_status()

    data = response.json()
    races = data["MRData"]["RaceTable"]["Races"]

    rows = []

    for race in races:
        race_name = race["raceName"]

        for result in race["Results"]:
            try:
                grid = int(result["grid"])
            except:
                grid = None

            try:
                position = int(result["position"])
            except:
                position = None

            status = result["status"]

            # DNF classification
            if position is None:
                if "Accident" in status or "Collision" in status:
                    dnf_type = "driver_fault"
                else:
                    dnf_type = "mechanical"
                position = 20
            else:
                dnf_type = "none"

            rows.append({
                "season": year,
                "race": race_name,
                "driver": f"{result['Driver']['givenName']} {result['Driver']['familyName']}",
                "constructor": result["Constructor"]["name"],
                "grid": grid,
                "position": position,
                "dnf_type": dnf_type
            })

    # If there are no race results yet for this season (e.g. future season),
    # return an empty dataframe with the expected columns.
    if not rows:
        return pd.DataFrame(
            columns=["season", "race", "driver", "constructor", "grid", "position", "dnf_type"]
        )

    df = pd.DataFrame(rows)
    if "grid" in df.columns:
        df = df.dropna(subset=["grid"])

    return df


# ==========================
# NORMALIZATION
# ==========================
def zscore_normalize(df: pd.DataFrame, column: str) -> pd.DataFrame:
    mean = df[column].mean()
    std = df[column].std()

    if std == 0:
        df[column + "_norm"] = 50
        return df

    df[column + "_norm"] = 50 + (df[column] - mean) * (10 / std)
    return df


# ==========================
# OVERPERFORMANCE
# ==========================
def compute_overperformance(df: pd.DataFrame) -> pd.DataFrame:

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

    driver_scores = (
        df.groupby(["season", "driver"])
        .agg(
            overperformance=("team_adjusted_delta", "mean"),
            races=("race", "count")
        )
        .reset_index()
    )

    return driver_scores


# ==========================
# CHAOS SCORE
# ==========================
def compute_chaos_score(df: pd.DataFrame) -> pd.DataFrame:

    race_dnf_counts = (
        df.groupby(["season", "race"])
        .agg(total_dnfs=("dnf_type", lambda x: (x != "none").sum()))
        .reset_index()
    )

    race_dnf_counts["dnf_threshold"] = (
        race_dnf_counts
        .groupby("season")["total_dnfs"]
        .transform(lambda s: s.quantile(0.75))
    )

    race_dnf_counts["chaos_race"] = (
        race_dnf_counts["total_dnfs"] >= race_dnf_counts["dnf_threshold"]
    )

    df = df.merge(
        race_dnf_counts[["season", "race", "chaos_race"]],
        on=["season", "race"],
        how="left"
    )

    chaos_df = df[df["chaos_race"] == True].copy()

    if chaos_df.empty:
        return pd.DataFrame()

    chaos_df["finish_delta"] = chaos_df["grid"] - chaos_df["position"]
    chaos_df["grid_weight"] = 1 + (chaos_df["grid"] / 20)
    chaos_df["weighted_delta"] = chaos_df["finish_delta"] * chaos_df["grid_weight"]

    team_baseline = (
        chaos_df.groupby(["season", "constructor"])
        .agg(team_avg_chaos=("weighted_delta", "mean"))
        .reset_index()
    )

    chaos_df = chaos_df.merge(team_baseline, on=["season", "constructor"], how="left")

    chaos_df["team_adjusted_chaos"] = (
        chaos_df["weighted_delta"] - chaos_df["team_avg_chaos"]
    )

    chaos_scores = (
        chaos_df.groupby("driver")
        .agg(chaos_score=("team_adjusted_chaos", "mean"),
             chaos_races=("race", "count"))
        .reset_index()
    )

    chaos_scores = chaos_scores[chaos_scores["chaos_races"] >= 2]

    chaos_scores = zscore_normalize(chaos_scores, "chaos_score")

    return chaos_scores


# ==========================
# SUNDAY SCORE (RACE EXECUTION)
# ==========================
def compute_sunday_score(df: pd.DataFrame) -> pd.DataFrame:

    sunday_df = df.copy()
    sunday_df["finish_delta"] = sunday_df["grid"] - sunday_df["position"]

    sunday = (
        sunday_df.groupby("driver")
        .agg(
            avg_delta=("finish_delta", "mean"),
            finish_std=("position", "std"),
            races=("race", "count")
        )
        .reset_index()
    )

    sunday = sunday[sunday["races"] >= 10]

    sunday["consistency_raw"] = -sunday["finish_std"]

    sunday = zscore_normalize(sunday, "avg_delta")
    sunday = zscore_normalize(sunday, "consistency_raw")

    sunday["sunday_raw"] = (
        0.6 * sunday["avg_delta_norm"] +
        0.4 * sunday["consistency_raw_norm"]
    )

    sunday = zscore_normalize(sunday, "sunday_raw")

    sunday = sunday[["driver", "sunday_raw_norm"]].rename(
        columns={"sunday_raw_norm": "sunday_score_norm"}
    )

    return sunday


def build_metrics_for_seasons(seasons: list[int]) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Core pipeline to compute all Racecraft Lab metrics for a list of seasons.
    Returns:
      - final rankings dataframe
      - per-season overperformance dataframe
      - three+ year aggregate overperformance dataframe
      - chaos scores dataframe
    """
    all_data: list[pd.DataFrame] = []

    print("Fetching seasons...")
    for year in seasons:
        print(f"Fetching {year}...")
        all_data.append(fetch_season(year))

    df = pd.concat(all_data, ignore_index=True)

    print("Computing Overperformance...")
    driver_scores = compute_overperformance(df)

    # Normalize per season for overperformance
    normalized_list: list[pd.DataFrame] = []
    for season, group in driver_scores.groupby("season"):
        group = zscore_normalize(group, "overperformance")
        normalized_list.append(group)

    driver_scores = pd.concat(normalized_list).reset_index(drop=True)

    # Multi-season aggregate across the analysis window
    aggregate_scores = (
        driver_scores
        .groupby("driver")
        .agg(
            avg_overperformance=("overperformance_norm", "mean"),
            total_races=("races", "sum"),
        )
        .reset_index()
    )

    print("Computing Chaos...")
    chaos_scores = compute_chaos_score(df)

    print("Computing Sunday Score...")
    sunday_scores = compute_sunday_score(df)

    # Merge all into final rankings
    final = aggregate_scores.merge(
        chaos_scores[["driver", "chaos_score_norm"]],
        on="driver", how="left"
    ).merge(
        sunday_scores[["driver", "sunday_score_norm"]],
        on="driver", how="left"
    )

    final["chaos_score_norm"] = final["chaos_score_norm"].fillna(50)
    final["sunday_score_norm"] = final["sunday_score_norm"].fillna(50)

    # Mark active drivers based on participation in the latest season
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

    # Composite Power Score
    final["power_score"] = (
        0.5 * final["avg_overperformance"] +
        0.3 * final["chaos_score_norm"] +
        0.2 * final["sunday_score_norm"]
    )

    final = zscore_normalize(final, "power_score")
    final = final.sort_values("power_score_norm", ascending=False)

    # Per-season overperformance (already contains overperformance_norm)
    season_over = driver_scores[[
        "season",
        "driver",
        "overperformance",
        "races",
        "overperformance_norm",
    ]].copy()

    # Three+ year aggregate overperformance
    multi_year_over = aggregate_scores.copy()

    return final, season_over, multi_year_over, chaos_scores


# ==========================
# MAIN PIPELINE ENTRYPOINT
# ==========================
if __name__ == "__main__":

    # Last 10 seasons up to the current year (auto-updating as time passes)
    current_year = datetime.utcnow().year
    start_year = current_year - 9
    seasons = list(range(start_year, current_year + 1))

    final, season_over, multi_year_over, chaos_scores = build_metrics_for_seasons(seasons)

    # Persist processed datasets for the Streamlit UI
    final.to_csv("data/processed/final_power_rankings.csv", index=False)
    season_over.to_csv("data/processed/season_overperformance.csv", index=False)
    multi_year_over.to_csv("data/processed/3yr_overperformance.csv", index=False)
    chaos_scores.to_csv("data/processed/chaos_score.csv", index=False)

    print("\n🔥 FINAL POWER RANKINGS:")
    print(final[["driver", "power_score_norm"]].head(10))