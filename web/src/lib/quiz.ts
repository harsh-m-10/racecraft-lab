import type { SeasonEvent } from "@/lib/data";

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: string;
  explain?: string;
}

/** Deterministic RNG so server and client render identical quizzes. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** answer + 3 distinct decoys, shuffled deterministically. */
function options(
  answer: string,
  pool: string[],
  rnd: () => number,
): string[] {
  const decoys = shuffled(
    [...new Set(pool)].filter((p) => p !== answer),
    rnd,
  ).slice(0, 3);
  return shuffled([answer, ...decoys], rnd);
}

export function buildQuiz(
  year: number,
  ev: SeasonEvent,
  prevYear?: SeasonEvent | null,
): QuizQuestion[] {
  const rnd = mulberry32(year * 1000 + ev.round);
  const out: QuizQuestion[] = [];

  const quali = ev.quali_result;
  const race = ev.race_result;
  const sprint = ev.sprint_result;
  const allDrivers = [...new Set(quali.map((q) => q.driver))];

  if (quali.length >= 4) {
    out.push({
      q: `Who took pole position for the ${year} ${ev.event}?`,
      options: options(
        quali[0].driver,
        quali.slice(0, 6).map((q) => q.driver),
        rnd,
      ),
      answer: quali[0].driver,
      explain: quali[0].q3
        ? `${quali[0].driver} — ${quali[0].q3} in Q3.`
        : undefined,
    });
    out.push({
      q: `Who joined ${quali[0].driver} on the front row?`,
      options: options(
        quali[1].driver,
        quali.slice(1, 7).map((q) => q.driver),
        rnd,
      ),
      answer: quali[1].driver,
    });
  }

  if (sprint.length >= 4) {
    out.push({
      q: `Who won the ${year} ${ev.event} sprint?`,
      options: options(
        sprint[0].driver,
        sprint.slice(0, 6).map((s) => s.driver),
        rnd,
      ),
      answer: sprint[0].driver,
    });
  }

  if (race.length >= 4) {
    out.push({
      q: `Who won the ${year} ${ev.event}?`,
      options: options(
        race[0].driver,
        race.slice(0, 6).map((r) => r.driver),
        rnd,
      ),
      answer: race[0].driver,
    });

    const gainers = race
      .filter((r) => r.grid && r.grid > 0)
      .map((r) => ({ driver: r.driver, gained: (r.grid ?? 0) - r.position }))
      .sort((a, b) => b.gained - a.gained);
    if (gainers.length >= 4 && gainers[0].gained > 0) {
      out.push({
        q: `Who gained the most places in the race?`,
        options: options(
          gainers[0].driver,
          gainers.slice(0, 8).map((g) => g.driver),
          rnd,
        ),
        answer: gainers[0].driver,
        explain: `${gainers[0].driver} made up ${gainers[0].gained} places from the grid.`,
      });
    }
  }

  if (ev.race_pace.length >= 4) {
    const fastest = ev.race_pace[0];
    out.push({
      q: `Clean laps only — who had the fastest true race pace?`,
      options: options(
        fastest.driver,
        ev.race_pace.slice(0, 6).map((p) => p.driver),
        rnd,
      ),
      answer: fastest.driver,
      explain: `From the Debrief: ${fastest.driver}'s clean-lap median was the benchmark.`,
    });
  }

  const beatdowns = ev.quali_h2h
    .filter((q) => q.gap_pct < 0)
    .sort((a, b) => a.gap_pct - b.gap_pct);
  if (beatdowns.length >= 4) {
    out.push({
      q: `Who beat their teammate by the biggest margin in qualifying?`,
      options: options(
        beatdowns[0].driver,
        beatdowns.slice(0, 6).map((b) => b.driver),
        rnd,
      ),
      answer: beatdowns[0].driver,
      explain: `${beatdowns[0].driver} outqualified ${beatdowns[0].teammate} by ${Math.abs(beatdowns[0].gap_pct).toFixed(3)}% (${beatdowns[0].segment}).`,
    });
  }

  if (prevYear && prevYear.race_result.length > 0 && allDrivers.length >= 4) {
    out.push({
      q: `Who won this Grand Prix last year (${year - 1})?`,
      options: options(prevYear.race_result[0].driver, allDrivers, rnd),
      answer: prevYear.race_result[0].driver,
    });
  }

  return out.slice(0, 7);
}
