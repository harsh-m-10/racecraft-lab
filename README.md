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

## Pages

- **Home** – overview of the model and a snapshot of the current meta (top overall, Delta Score leader, Chaos Index leader).
- **Leaderboard** – sortable table of active drivers across Power Score, Delta Score, Chaos Index, and Sunday Edge.
- **Driver Profile** – per-driver radar chart and per-season trend line.
- **Methodology** – short explanation of how each metric is constructed and how Power Score is combined.

## Philosophy

Racecraft Lab is designed to be a **debate-starter**, not a final answer.

The metrics simplify DNFs, weather, and strategy into a few signals so fans can quickly compare drivers and then dig into the races behind the numbers.