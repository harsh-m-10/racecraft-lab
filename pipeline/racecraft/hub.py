"""Fan-hub exports: race calendar, championship standings, session results.

Everything here is *official* data — FIA points, real finishing positions,
real session times. No derived scores.
"""

import logging

import pandas as pd

from . import CACHE_DIR, EXPORTS_DIR
from .metrics import _load_dataset, canonical_name_map

log = logging.getLogger("racecraft.hub")


def _fmt_lap(seconds) -> str | None:
    if pd.isna(seconds):
        return None
    m, s = divmod(float(seconds), 60)
    return f"{int(m)}:{s:06.3f}"


def export_schedule(season: int) -> dict:
    """Full season calendar with per-session UTC timestamps via FastF1."""
    import fastf1

    fastf1.Cache.enable_cache(str(CACHE_DIR))
    sched = fastf1.get_event_schedule(season, include_testing=False)

    events = []
    for _, ev in sched.iterrows():
        sessions = []
        for i in range(1, 6):
            name = ev.get(f"Session{i}")
            date = ev.get(f"Session{i}DateUtc")
            if isinstance(name, str) and name and pd.notna(date):
                sessions.append({
                    "name": name,
                    "date_utc": pd.Timestamp(date).strftime("%Y-%m-%dT%H:%M:%SZ"),
                })
        events.append({
            "round": int(ev["RoundNumber"]),
            "name": ev["EventName"],
            "official_name": ev["OfficialEventName"],
            "country": ev["Country"],
            "location": ev["Location"],
            "format": ev["EventFormat"],
            "sessions": sessions,
        })

    payload = {"season": season, "events": events}
    return payload


def build_standings(results: pd.DataFrame, season: int) -> dict:
    """Championship standings from official points in race + sprint results."""
    scoring = results[
        (results["season"] == season)
        & (results["session"].isin(["Race", "Sprint"]))
    ].copy()
    scoring["points"] = scoring["points"].fillna(0)

    name_map = canonical_name_map(results)
    latest_team = (
        scoring.sort_values(["round"])
        .groupby("driver_id")["team"]
        .last()
    )

    races = scoring[scoring["session"] == "Race"]

    drv = (
        scoring.groupby("driver_id")
        .agg(points=("points", "sum"))
        .reset_index()
    )
    wins = races[races["position"] == 1].groupby("driver_id").size()
    podiums = races[races["position"] <= 3].groupby("driver_id").size()
    drv["wins"] = drv["driver_id"].map(wins).fillna(0).astype(int)
    drv["podiums"] = drv["driver_id"].map(podiums).fillna(0).astype(int)
    drv["driver"] = drv["driver_id"].map(name_map)
    drv["team"] = drv["driver_id"].map(latest_team)
    drv = drv.sort_values(["points", "wins"], ascending=False).reset_index(drop=True)

    teams = (
        scoring.groupby("team")
        .agg(points=("points", "sum"))
        .reset_index()
    )
    team_wins = races[races["position"] == 1].groupby("team").size()
    teams["wins"] = teams["team"].map(team_wins).fillna(0).astype(int)
    teams = teams.sort_values(["points", "wins"], ascending=False).reset_index(drop=True)

    rounds_done = int(races["round"].nunique())

    return {
        "season": season,
        "rounds_completed": rounds_done,
        "drivers": [
            {
                "position": i + 1,
                "driver": r["driver"],
                "driver_id": r["driver_id"],
                "team": r["team"],
                "points": round(float(r["points"]), 1),
                "wins": int(r["wins"]),
                "podiums": int(r["podiums"]),
            }
            for i, r in drv.iterrows()
        ],
        "constructors": [
            {
                "position": i + 1,
                "team": r["team"],
                "points": round(float(r["points"]), 1),
                "wins": int(r["wins"]),
            }
            for i, r in teams.iterrows()
        ],
    }


def event_results(results: pd.DataFrame, season: int, rnd: int, name_map: dict) -> dict:
    """Official race / sprint / qualifying classification for one event."""
    ev = results[(results["season"] == season) & (results["round"] == rnd)]
    out: dict = {}

    for session, key in (("Race", "race_result"), ("Sprint", "sprint_result")):
        rows = ev[ev["session"] == session].sort_values("position")
        out[key] = [
            {
                "position": int(r["position"]) if pd.notna(r["position"]) else None,
                "driver": name_map.get(r["driver_id"], r["driver"]),
                "team": r["team"],
                "grid": int(r["grid"]) if pd.notna(r["grid"]) else None,
                "status": r["status"],
                "points": round(float(r["points"]), 1) if pd.notna(r["points"]) else 0,
            }
            for _, r in rows.iterrows()
            if pd.notna(r["position"])
        ]

    quali = ev[ev["session"] == "Qualifying"].sort_values("position")
    out["quali_result"] = [
        {
            "position": int(r["position"]) if pd.notna(r["position"]) else None,
            "driver": name_map.get(r["driver_id"], r["driver"]),
            "team": r["team"],
            "q1": _fmt_lap(r["q1_s"]),
            "q2": _fmt_lap(r["q2_s"]),
            "q3": _fmt_lap(r["q3_s"]),
        }
        for _, r in quali.iterrows()
        if pd.notna(r["position"])
    ]
    return out
