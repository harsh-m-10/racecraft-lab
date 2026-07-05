# Racecraft

**[racecraft-lab.vercel.app](https://racecraft-lab.vercel.app)** — everything Formula 1 in one place.

- **Race weekend hub** — countdown to the next session, every session time in your timezone, live-now indicator.
- **Results** — race, sprint and qualifying classifications for every Grand Prix since 2018, updated throughout each race weekend.
- **Standings** — drivers' and constructors' championships from official points.
- **News** — headlines aggregated from BBC Sport, Autosport, RaceFans and Motorsport.com, refreshed every 30 minutes.
- **The Debrief** — the bit nobody else has: after each race, clean-lap analysis shows each driver's *true pace* (median clean racing lap as a % gap to the fastest car) and teammate qualifying margins. The finishing order tells you who won; the Debrief tells you who was fast.

## How it works

- `pipeline/` — Python ETL. Ingests every session since 2018 via [FastF1](https://docs.fastf1.dev/) into Parquet, validates it, and exports JSON (`data/exports/`): schedule, standings, per-event results, and clean-lap analysis.
- `web/` — Next.js app. Statically builds from `data/exports/` at deploy time; news is fetched with 30-minute revalidation.
- `.github/workflows/update-data.yml` — refreshes data every 2 hours on race weekends (plus a Monday sweep). Each data commit triggers a redeploy, so the site updates itself.

## Running locally

```bash
# pipeline (Python 3.12)
pip install -r pipeline/requirements.txt
PYTHONPATH=pipeline python -m racecraft ingest   # fetch new sessions
PYTHONPATH=pipeline python -m racecraft export   # rebuild data/exports

# web
cd web && npm install && npm run dev
```

Racecraft is an unofficial fan project, not associated with Formula 1 or the FIA.
