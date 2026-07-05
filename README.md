# Racecraft Lab

Racecraft Lab is an opinionated Formula 1 analytics lab that ranks active F1 drivers using custom, transparent metrics built from the last 10 seasons of race data.

## What you can explore

- **F1 Power Rankings**  
  A single Power Score that blends:
  - **Delta Score (Overperformance)** – how much a driver beats or loses to their grid spot, adjusted for teammate and starting position.
  - **Chaos Index** – performance in high-DNF, high-variance races.
  - **Sunday Edge** – race-day position gain blended with consistency.

- **Active driver focus**  
  Only drivers who appear in the latest season are treated as active and shown on the main leaderboard.

- **Driver deep dives**  
  For each driver you can:
  - See their Power Score, Delta Score, Chaos Index, and Sunday Edge.
  - View a radar chart comparing their strengths.
  - Track Delta Score by season to understand how their racecraft has evolved.

- **Telemetry metrics (new)**
  Built from 270k+ laps of FastF1 timing data (2018–present), updated automatically after every race weekend:
  - **Race Pace** – median clean-lap % gap to the fastest car, per dry race. Who actually had Sunday speed.
  - **Qualifying Head-to-Head** – teammate gap in the deepest shared quali segment. Same car, same day.
  - **Tyre Management** – stint degradation slope vs teammate on the same compound.
  - **Launch Rating** – positions gained or lost on lap 1.
  - **Power Score v2** – composite of all of the above plus the original three metrics.

## Pages

- **Home** – overview of the model and a snapshot of the current meta (top overall, Delta Score leader, Chaos Index leader).
- **Leaderboard** – sortable table of active drivers across Power Score, Delta Score, Chaos Index, and Sunday Edge.
- **Driver Profile** – per-driver radar chart and per-season trend line.
- **Methodology** – short explanation of how each metric is constructed and how Power Score is combined.
- **Telemetry Lab** – race pace, quali head-to-head, and tyre management charts per season, plus the Power Score v2 table.

## Data pipeline

`pipeline/racecraft/` ingests every race, qualifying and sprint session since 2018 via [FastF1](https://docs.fastf1.dev/) into Parquet (`data/parquet/`), validates it, and exports the processed CSVs/JSON the app reads. A GitHub Actions workflow tops up new sessions and refreshes all metrics every Monday after a race weekend.

## Philosophy

Racecraft Lab is designed to be a **debate-starter**, not a final answer.

The metrics simplify DNFs, weather, and strategy into a few signals so fans can quickly compare drivers and then dig into the races behind the numbers.