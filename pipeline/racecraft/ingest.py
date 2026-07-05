import logging
from datetime import datetime, timedelta, timezone

import pandas as pd

from . import (
    CACHE_DIR,
    FIRST_SEASON,
    INGESTED_SESSION_NAMES,
    MAX_INGEST_ATTEMPTS,
    PARQUET_DIR,
)
from .manifest import (
    attempts,
    is_ingested,
    load_manifest,
    mark_failed,
    mark_ok,
    save_manifest,
    session_key,
)

log = logging.getLogger("racecraft.ingest")

# A session is only ingested once it should have finished (start + margin).
# 2h15m covers a full race distance plus podium; if timing data isn't
# published yet the attempt fails softly and the next scheduled run retries.
SESSION_END_MARGIN = timedelta(hours=2, minutes=15)

RESULTS_COLS = [
    "season", "round", "event", "session",
    "driver_number", "code", "driver", "driver_id", "team",
    "grid", "position", "classified_position", "status", "points",
    "q1_s", "q2_s", "q3_s",
]
LAPS_COLS = [
    "season", "round", "event", "session",
    "driver_number", "code", "team",
    "lap_number", "stint", "compound", "tyre_life", "fresh_tyre",
    "lap_time_s", "sector1_s", "sector2_s", "sector3_s",
    "pit_in_s", "pit_out_s",
    "track_status", "position", "deleted", "is_accurate",
]
SESSIONS_COLS = [
    "season", "round", "event", "official_event_name", "circuit", "country",
    "session", "date_utc", "event_format", "total_laps",
]
WEATHER_COLS = [
    "season", "round", "event", "session",
    "air_temp_mean", "track_temp_mean", "humidity_mean", "wind_speed_mean",
    "rain_share", "rainfall_any",
]
PITSTOPS_COLS = [
    "season", "round", "event", "session",
    "driver_number", "code", "lap_number", "pit_in_s", "pit_out_next_s", "pit_lane_time_s",
]


def enable_cache() -> None:
    import fastf1

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(CACHE_DIR))


def _td_seconds(series: pd.Series) -> pd.Series:
    return pd.to_timedelta(series).dt.total_seconds()


def _upsert(dataset: str, season: int, new_df: pd.DataFrame, columns: list[str]) -> None:
    """Replace rows for the sessions contained in new_df within the season's parquet file."""
    new_df = new_df.reindex(columns=columns)
    path = PARQUET_DIR / dataset / f"{season}.parquet"
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        existing = pd.read_parquet(path)
        keys = new_df[["season", "round", "session"]].drop_duplicates()
        merged_keys = existing.merge(keys, on=["season", "round", "session"], how="left", indicator=True)
        existing = existing[merged_keys["_merge"] == "left_only"]
        new_df = pd.concat([existing, new_df], ignore_index=True)

    new_df = new_df.sort_values(["round", "session"]).reset_index(drop=True)
    new_df.to_parquet(path, index=False)


def _extract_results(session, meta: dict) -> pd.DataFrame:
    res = session.results.copy()
    out = pd.DataFrame(index=res.index)
    out["driver_number"] = res["DriverNumber"].astype(str)
    out["code"] = res["Abbreviation"].astype(str)
    out["driver"] = res["FullName"].astype(str)
    out["driver_id"] = res["DriverId"].astype(str) if "DriverId" in res.columns else pd.NA
    out["team"] = res["TeamName"].astype(str)
    out["grid"] = pd.to_numeric(res.get("GridPosition"), errors="coerce")
    out["position"] = pd.to_numeric(res.get("Position"), errors="coerce")
    out["classified_position"] = res.get("ClassifiedPosition", pd.Series(index=res.index, dtype=object)).astype(str)
    out["status"] = res.get("Status", pd.Series(index=res.index, dtype=object)).astype(str)
    out["points"] = pd.to_numeric(res.get("Points"), errors="coerce")
    for src, dst in (("Q1", "q1_s"), ("Q2", "q2_s"), ("Q3", "q3_s")):
        out[dst] = _td_seconds(res[src]) if src in res.columns else pd.NA
    for k, v in meta.items():
        out[k] = v
    return out


def _extract_laps(session, meta: dict) -> pd.DataFrame:
    laps = session.laps.copy()
    if laps is None or laps.empty:
        return pd.DataFrame(columns=LAPS_COLS)
    out = pd.DataFrame(index=laps.index)
    out["driver_number"] = laps["DriverNumber"].astype(str)
    out["code"] = laps["Driver"].astype(str)
    out["team"] = laps["Team"].astype(str)
    out["lap_number"] = pd.to_numeric(laps["LapNumber"], errors="coerce")
    out["stint"] = pd.to_numeric(laps["Stint"], errors="coerce")
    out["compound"] = laps["Compound"].astype(str)
    out["tyre_life"] = pd.to_numeric(laps["TyreLife"], errors="coerce")
    out["fresh_tyre"] = laps["FreshTyre"].astype("boolean")
    out["lap_time_s"] = _td_seconds(laps["LapTime"])
    out["sector1_s"] = _td_seconds(laps["Sector1Time"])
    out["sector2_s"] = _td_seconds(laps["Sector2Time"])
    out["sector3_s"] = _td_seconds(laps["Sector3Time"])
    out["pit_in_s"] = _td_seconds(laps["PitInTime"])
    out["pit_out_s"] = _td_seconds(laps["PitOutTime"])
    out["track_status"] = laps["TrackStatus"].astype(str)
    out["position"] = pd.to_numeric(laps["Position"], errors="coerce")
    out["deleted"] = laps["Deleted"].astype("boolean") if "Deleted" in laps.columns else pd.NA
    out["is_accurate"] = laps["IsAccurate"].astype("boolean")
    for k, v in meta.items():
        out[k] = v
    return out


def _extract_weather(session, meta: dict) -> pd.DataFrame:
    w = session.weather_data
    row = dict(meta)
    if w is None or w.empty:
        row.update({
            "air_temp_mean": None, "track_temp_mean": None, "humidity_mean": None,
            "wind_speed_mean": None, "rain_share": None, "rainfall_any": None,
        })
    else:
        rainfall = w["Rainfall"].astype(bool)
        row.update({
            "air_temp_mean": float(w["AirTemp"].mean()),
            "track_temp_mean": float(w["TrackTemp"].mean()),
            "humidity_mean": float(w["Humidity"].mean()),
            "wind_speed_mean": float(w["WindSpeed"].mean()),
            "rain_share": float(rainfall.mean()),
            "rainfall_any": bool(rainfall.any()),
        })
    return pd.DataFrame([row])


def _extract_pitstops(laps_df: pd.DataFrame, meta: dict) -> pd.DataFrame:
    stops = laps_df[laps_df["pit_in_s"].notna()][["driver_number", "code", "lap_number", "pit_in_s"]].copy()
    if stops.empty:
        return pd.DataFrame(columns=PITSTOPS_COLS)
    next_out = laps_df[laps_df["pit_out_s"].notna()][["driver_number", "lap_number", "pit_out_s"]].copy()
    next_out["lap_number"] = next_out["lap_number"] - 1
    stops = stops.merge(
        next_out.rename(columns={"pit_out_s": "pit_out_next_s"}),
        on=["driver_number", "lap_number"],
        how="left",
    )
    stops["pit_lane_time_s"] = stops["pit_out_next_s"] - stops["pit_in_s"]
    for k, v in meta.items():
        stops[k] = v
    return stops


def _session_meta(session, season: int, round_number: int, event_name: str, session_name: str) -> dict:
    return {
        "season": season,
        "round": round_number,
        "event": event_name,
        "session": session_name,
    }


def ingest_session(season: int, round_number: int, event, session_name: str) -> int:
    """Load one session via FastF1 and upsert all datasets. Returns number of laps stored."""
    import fastf1

    session = fastf1.get_session(season, round_number, session_name)
    session.load(laps=True, telemetry=False, weather=True, messages=False)

    event_name = str(event["EventName"])
    meta = _session_meta(session, season, round_number, event_name, session_name)

    results_df = _extract_results(session, meta)
    # A few old sessions have corrupt upstream timing archives (e.g. 2018 Italian GP):
    # results still exist, so store the session in degraded results-only form.
    try:
        laps_df = _extract_laps(session, meta)
    except Exception as exc:
        log.warning("No lap data for %s round %d %s (%s); storing results only",
                    season, round_number, session_name, exc)
        laps_df = pd.DataFrame(columns=LAPS_COLS)
    try:
        weather_df = _extract_weather(session, meta)
    except Exception:
        weather_df = pd.DataFrame([meta]).reindex(columns=WEATHER_COLS)
    pitstops_df = _extract_pitstops(laps_df, meta) if not laps_df.empty else pd.DataFrame(columns=PITSTOPS_COLS)

    total_laps = getattr(session, "total_laps", None)
    session_df = pd.DataFrame([{
        "season": season,
        "round": round_number,
        "event": event_name,
        "official_event_name": str(event.get("OfficialEventName", "")),
        "circuit": str(event.get("Location", "")),
        "country": str(event.get("Country", "")),
        "session": session_name,
        "date_utc": str(session.date) if session.date is not None else None,
        "event_format": str(event.get("EventFormat", "")),
        "total_laps": total_laps,
    }])

    _upsert("results", season, results_df, RESULTS_COLS)
    _upsert("laps", season, laps_df, LAPS_COLS)
    _upsert("weather", season, weather_df, WEATHER_COLS)
    _upsert("pitstops", season, pitstops_df, PITSTOPS_COLS)
    _upsert("sessions", season, session_df, SESSIONS_COLS)

    return len(laps_df)


def _completed_sessions_for_event(event) -> list[tuple[str, pd.Timestamp]]:
    now = datetime.now(timezone.utc)
    out = []
    for i in range(1, 6):
        name = event.get(f"Session{i}")
        if not isinstance(name, str) or name not in INGESTED_SESSION_NAMES:
            continue
        date_utc = event.get(f"Session{i}DateUtc")
        if pd.isna(date_utc):
            # No session timestamp available; fall back to the event date.
            date_utc = event.get("EventDate")
        if pd.isna(date_utc):
            continue
        date_utc = pd.Timestamp(date_utc)
        if date_utc.tzinfo is None:
            date_utc = date_utc.tz_localize("UTC")
        if date_utc + SESSION_END_MARGIN <= now:
            out.append((name, date_utc))
    return out


# Ergast/Jolpica publishes enriched results (driver ids, points) later than
# F1's own timing feed. Loading a session before that poisons the FastF1
# cache with an empty response, so probe readiness for young sessions first.
_ERGAST_ENDPOINTS = {
    "Race": "results",
    "Sprint": "sprint",
    "Qualifying": "qualifying",
}
_PROBE_WINDOW = timedelta(hours=12)


def _ergast_ready(season: int, round_number: int, session_name: str,
                  start: pd.Timestamp) -> bool:
    endpoint = _ERGAST_ENDPOINTS.get(session_name)
    if endpoint is None:
        return True  # no Ergast dependency for this session type
    if datetime.now(timezone.utc) - start.to_pydatetime() > _PROBE_WINDOW:
        return True  # old session; data long since published
    import requests

    try:
        res = requests.get(
            f"https://api.jolpi.ca/ergast/f1/{season}/{round_number}/{endpoint}.json",
            timeout=15,
        )
        res.raise_for_status()
        races = res.json()["MRData"]["RaceTable"]["Races"]
        return bool(races)
    except Exception as exc:
        log.warning("Ergast readiness probe failed (%s); assuming not ready", exc)
        return False


def ingest_seasons(seasons: list[int], force: bool = False) -> int:
    """Ingest all missing completed sessions for the given seasons. Returns count of newly ingested."""
    import fastf1
    from fastf1.req import RateLimitExceededError

    enable_cache()
    manifest = load_manifest()
    new_count = 0

    try:
        for season in seasons:
            schedule = fastf1.get_event_schedule(season, include_testing=False)
            for _, event in schedule.iterrows():
                round_number = int(event["RoundNumber"])
                for session_name, session_start in _completed_sessions_for_event(event):
                    key = session_key(season, round_number, session_name)
                    if not force:
                        if is_ingested(manifest, key):
                            continue
                        if attempts(manifest, key) >= MAX_INGEST_ATTEMPTS:
                            log.warning("Skipping %s: too many failed attempts", key)
                            continue
                    if not _ergast_ready(season, round_number, session_name, session_start):
                        log.info("Skipping %s: results not published yet", key)
                        continue
                    log.info("Ingesting %s (%s)", key, event["EventName"])
                    try:
                        n_laps = ingest_session(season, round_number, event, session_name)
                        mark_ok(manifest, key, season, round_number, session_name, n_laps)
                        new_count += 1
                    except RateLimitExceededError:
                        raise
                    except Exception as exc:
                        log.error("Failed to ingest %s: %s", key, exc)
                        mark_failed(manifest, key, season, round_number, session_name, str(exc))
                    save_manifest(manifest)
    except RateLimitExceededError:
        log.error("FastF1/Jolpica rate limit reached; stopping early. Re-run later to continue.")
    finally:
        save_manifest(manifest)

    log.info("Ingest complete: %d new sessions", new_count)
    return new_count


def default_seasons() -> list[int]:
    return list(range(FIRST_SEASON, datetime.now(timezone.utc).year + 1))
