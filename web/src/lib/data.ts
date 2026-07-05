import fs from "node:fs";
import path from "node:path";

const EXPORTS_DIR = process.env.RACECRAFT_EXPORTS_DIR
  ? path.resolve(process.env.RACECRAFT_EXPORTS_DIR)
  : path.resolve(process.cwd(), "..", "data", "exports");

// ---------- schedule ----------

export interface SessionSlot {
  name: string;
  date_utc: string;
}

export interface ScheduleEvent {
  round: number;
  name: string;
  official_name: string;
  country: string;
  location: string;
  format: string;
  sessions: SessionSlot[];
}

export interface Schedule {
  season: number;
  events: ScheduleEvent[];
}

// ---------- standings ----------

export interface DriverStanding {
  position: number;
  driver: string;
  driver_id: string;
  team: string;
  points: number;
  wins: number;
  podiums: number;
}

export interface ConstructorStanding {
  position: number;
  team: string;
  points: number;
  wins: number;
}

export interface Standings {
  season: number;
  rounds_completed: number;
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
}

// ---------- event results ----------

export interface RaceResultRow {
  position: number;
  driver: string;
  team: string;
  grid: number | null;
  status: string;
  points: number;
}

export interface QualiResultRow {
  position: number;
  driver: string;
  team: string;
  q1: string | null;
  q2: string | null;
  q3: string | null;
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
  race_result: RaceResultRow[];
  sprint_result: RaceResultRow[];
  quali_result: QualiResultRow[];
  race_pace: PaceRow[];
  quali_h2h: QualiPair[];
}

export interface Season {
  season: number;
  events: SeasonEvent[];
}

export interface Meta {
  generated_at: string;
  seasons: number[];
  sessions_ingested: number;
  latest_season: number;
  latest_round: number;
}

// ---------- loaders ----------

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

export function getSchedule(): Schedule {
  return readJson<Schedule>(path.join(EXPORTS_DIR, "schedule.json"));
}

export function getStandings(): Standings {
  return readJson<Standings>(path.join(EXPORTS_DIR, "standings.json"));
}

export function getMeta(): Meta {
  return readJson<Meta>(path.join(EXPORTS_DIR, "meta.json"));
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

export function getEvent(year: number, round: number): SeasonEvent | null {
  const season = getSeason(year);
  return season?.events.find((e) => e.round === round) ?? null;
}

/** Most recent event that has any session result at all. */
export function latestEventWithResults(): { year: number; event: SeasonEvent } | null {
  for (const year of getSeasonYears()) {
    const season = getSeason(year);
    if (!season) continue;
    for (const ev of [...season.events].reverse()) {
      if (
        ev.race_result.length > 0 ||
        ev.sprint_result.length > 0 ||
        ev.quali_result.length > 0
      ) {
        return { year, event: ev };
      }
    }
  }
  return null;
}

/** Most recent event with a finished race (for the Debrief). */
export function latestRace(): { year: number; event: SeasonEvent } | null {
  for (const year of getSeasonYears()) {
    const season = getSeason(year);
    if (!season) continue;
    for (const ev of [...season.events].reverse()) {
      if (ev.race_result.length > 0) return { year, event: ev };
    }
  }
  return null;
}
