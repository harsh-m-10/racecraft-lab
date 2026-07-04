import logging

import pandas as pd

from . import PARQUET_DIR
from .manifest import load_manifest

log = logging.getLogger("racecraft.validate")

MIN_DRIVERS = 16
MAX_DRIVERS = 26


def _load(name: str) -> pd.DataFrame:
    files = sorted((PARQUET_DIR / name).glob("*.parquet"))
    if not files:
        raise FileNotFoundError(f"No parquet files for dataset '{name}'")
    return pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)


def validate() -> list[str]:
    """Run integrity checks over the parquet datasets. Returns a list of failures."""
    failures: list[str] = []

    results = _load("results")
    laps = _load("laps")
    sessions = _load("sessions")
    manifest = load_manifest()

    # Manifest vs stored sessions.
    ok_keys = {
        k for k, v in manifest["sessions"].items() if v.get("status") == "ok"
    }
    stored_keys = {
        f"{int(r.season)}-{int(r.round):02d}-{r.session}"
        for r in sessions.itertuples()
    }
    missing_in_store = ok_keys - stored_keys
    if missing_in_store:
        failures.append(f"{len(missing_in_store)} manifest sessions missing from parquet: {sorted(missing_in_store)[:5]}")

    dup_sessions = sessions.duplicated(subset=["season", "round", "session"]).sum()
    if dup_sessions:
        failures.append(f"{dup_sessions} duplicate session rows in sessions dataset")

    # Field size per session.
    counts = results.groupby(["season", "round", "session"]).size()
    bad = counts[(counts < MIN_DRIVERS) | (counts > MAX_DRIVERS)]
    if not bad.empty:
        failures.append(f"{len(bad)} sessions with implausible driver counts: {bad.head().to_dict()}")

    dup_results = results.duplicated(subset=["season", "round", "session", "driver_number"]).sum()
    if dup_results:
        failures.append(f"{dup_results} duplicate driver rows in results dataset")

    # Every race session should have a healthy lap count.
    race_keys = sessions[sessions["session"] == "Race"][["season", "round"]]
    lap_counts = (
        laps[laps["session"] == "Race"]
        .groupby(["season", "round"])
        .size()
        .reset_index(name="n_laps")
    )
    degraded = {
        (v["season"], v["round"])
        for v in manifest["sessions"].values()
        if v.get("status") == "ok" and v.get("session") == "Race" and v.get("laps", 0) == 0
    }
    if degraded:
        log.warning("%d race sessions stored results-only (no lap data upstream): %s",
                    len(degraded), sorted(degraded))
    merged = race_keys.merge(lap_counts, on=["season", "round"], how="left")
    merged["n_laps"] = merged["n_laps"].fillna(0)
    merged = merged[~merged.apply(lambda r: (r["season"], r["round"]) in degraded, axis=1)]
    empty = merged[merged["n_laps"] == 0]
    if not empty.empty:
        failures.append(
            f"{len(empty)} race sessions with no lap rows: "
            f"{empty[['season', 'round']].to_dict('records')[:5]}"
        )
    # Shortened races (e.g. Spa 2021) legitimately have very few laps — warn only.
    thin = merged[(merged["n_laps"] > 0) & (merged["n_laps"] < 100)]
    if not thin.empty:
        log.warning("%d race sessions with unusually few lap rows: %s",
                    len(thin), thin[["season", "round"]].to_dict("records")[:5])

    failed_entries = {
        k: v.get("error", "")
        for k, v in manifest["sessions"].items()
        if v.get("status") == "failed"
    }
    if failed_entries:
        log.warning("%d sessions in failed state (non-fatal): %s",
                    len(failed_entries), sorted(failed_entries)[:5])

    if failures:
        for f in failures:
            log.error("VALIDATION FAILURE: %s", f)
    else:
        log.info(
            "Validation OK: %d sessions, %d result rows, %d lap rows",
            len(sessions), len(results), len(laps),
        )
    return failures
