import fs from "node:fs";
import path from "node:path";

const EXPORTS_DIR = process.env.RACECRAFT_EXPORTS_DIR
  ? path.resolve(process.env.RACECRAFT_EXPORTS_DIR)
  : path.resolve(process.cwd(), "..", "data", "exports");

export interface LeaderboardRow {
  rank: number;
  driver: string;
  slug: string;
  power_score: number;
  power_score_v2: number;
  delta_score: number;
  chaos_index: number;
  sunday_edge: number;
  race_pace: number | null;
  quali_h2h: number | null;
  tyre_management: number | null;
  launch: number | null;
  low_confidence: boolean;
  total_races: number;
}

export interface DriverSeason {
  season: number;
  races: number;
  overperformance: number | null;
  overperformance_norm: number | null;
  race_pace_norm: number | null;
  avg_pace_gap_pct: number | null;
  quali_h2h_norm: number | null;
  quali_median_gap_pct: number | null;
  tyre_management_norm: number | null;
  launch_norm: number | null;
}

export interface Driver {
  driver: string;
  slug: string;
  is_active: boolean;
  power_score: number;
  power_score_v2: number;
  delta_score: number;
  chaos_index: number;
  sunday_edge: number;
  race_pace: number | null;
  quali_h2h: number | null;
  tyre_management: number | null;
  launch: number | null;
  low_confidence: boolean;
  total_races: number;
  seasons: DriverSeason[];
}

export interface PaceRow {
  driver: string;
  median_lap_s: number;
  gap_pct: number;
  clean_laps: number;
}

export interface QualiPair {
  team: string;
  driver: string;
  teammate: string;
  segment: string;
  gap_pct: number;
}

export interface SeasonEvent {
  round: number;
  event: string;
  race_pace: PaceRow[];
  quali_h2h: QualiPair[];
}

export interface Season {
  season: number;
  events: SeasonEvent[];
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

export function getLeaderboard(): LeaderboardRow[] {
  return readJson<LeaderboardRow[]>(path.join(EXPORTS_DIR, "leaderboard.json"));
}

export function getDriverSlugs(): string[] {
  return fs
    .readdirSync(path.join(EXPORTS_DIR, "drivers"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

export function getDriver(slug: string): Driver | null {
  const file = path.join(EXPORTS_DIR, "drivers", `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  const d = readJson<Driver>(file);
  // Sparse seasons (e.g. a one-race cameo) omit telemetry keys entirely;
  // normalize missing fields to null so consumers only handle one case.
  const nulls: Omit<DriverSeason, "season" | "races"> = {
    overperformance: null,
    overperformance_norm: null,
    race_pace_norm: null,
    avg_pace_gap_pct: null,
    quali_h2h_norm: null,
    quali_median_gap_pct: null,
    tyre_management_norm: null,
    launch_norm: null,
  };
  d.seasons = d.seasons.map((s) => ({ ...nulls, ...s }));
  return d;
}

export function getAllDrivers(): Driver[] {
  return getDriverSlugs()
    .map((slug) => getDriver(slug))
    .filter((d): d is Driver => d !== null)
    .sort((a, b) => b.power_score_v2 - a.power_score_v2);
}

export function getSeasonYears(): number[] {
  return fs
    .readdirSync(path.join(EXPORTS_DIR, "seasons"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => parseInt(f.replace(/\.json$/, ""), 10))
    .sort((a, b) => b - a);
}

export function getSeason(year: number): Season | null {
  const file = path.join(EXPORTS_DIR, "seasons", `${year}.json`);
  if (!fs.existsSync(file)) return null;
  return readJson<Season>(file);
}
