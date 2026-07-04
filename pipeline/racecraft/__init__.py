from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data"
PARQUET_DIR = DATA_DIR / "parquet"
EXPORTS_DIR = DATA_DIR / "exports"
PROCESSED_DIR = DATA_DIR / "processed"
CACHE_DIR = DATA_DIR / "fastf1_cache"
MANIFEST_PATH = PARQUET_DIR / "manifest.json"

FIRST_SEASON = 2018

# Session names as they appear in the FastF1 event schedule (Session1..Session5).
# Practice sessions are deliberately excluded in Phase 1.
INGESTED_SESSION_NAMES = (
    "Qualifying",
    "Sprint Qualifying",
    "Sprint Shootout",
    "Sprint",
    "Race",
)

MAX_INGEST_ATTEMPTS = 5
