import { NextRequest, NextResponse } from "next/server";
import { getEvent, getSchedule } from "@/lib/data";
import { pairsToRecord, redis, redisConfigured } from "@/lib/redis";

export const dynamic = "force-dynamic";

const WINDOW_MS = 36 * 3600_000; // voting stays open 36h after race start

function voteWindow(year: number, round: number): { open: boolean } {
  const schedule = getSchedule();
  if (schedule.season !== year) return { open: false };
  const ev = schedule.events.find((e) => e.round === round);
  const race = ev?.sessions.find((s) => s.name === "Race");
  if (!race) return { open: false };
  const start = new Date(race.date_utc).getTime();
  const now = Date.now();
  return { open: now >= start && now <= start + WINDOW_MS };
}

function participants(year: number, round: number): Set<string> {
  const ev = getEvent(year, round);
  const names = new Set<string>();
  for (const r of [
    ...(ev?.quali_result ?? []),
    ...(ev?.race_result ?? []),
    ...(ev?.sprint_result ?? []),
  ]) {
    names.add(r.driver);
  }
  return names;
}

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? "", 10);
  const round = parseInt(req.nextUrl.searchParams.get("round") ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(round)) {
    return NextResponse.json({ error: "bad params" }, { status: 400 });
  }
  if (!redisConfigured) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  const votes = pairsToRecord(await redis("HGETALL", `dotd:${year}:${round}`));
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const results = Object.entries(votes)
    .map(([driver, n]) => ({ driver, votes: n }))
    .sort((a, b) => b.votes - a.votes);

  return NextResponse.json({
    configured: true,
    open: voteWindow(year, round).open,
    total,
    results,
    voted: req.cookies.get(`dotd_${year}_${round}`)?.value ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (!redisConfigured) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as {
    year?: number;
    round?: number;
    driver?: string;
  } | null;
  const { year, round, driver } = body ?? {};
  if (!year || !round || !driver) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  if (!voteWindow(year, round).open) {
    return NextResponse.json({ error: "voting closed" }, { status: 403 });
  }
  if (!participants(year, round).has(driver)) {
    return NextResponse.json({ error: "unknown driver" }, { status: 400 });
  }
  if (req.cookies.get(`dotd_${year}_${round}`)) {
    return NextResponse.json({ error: "already voted" }, { status: 409 });
  }

  // Soft per-IP throttle: at most 5 votes per hour (covers shared households).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipKey = `dotd_ip:${year}:${round}:${ip}`;
  const count = Number(await redis("INCR", ipKey));
  if (count === 1) await redis("EXPIRE", ipKey, 3600);
  if (count > 5) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  await redis("HINCRBY", `dotd:${year}:${round}`, driver, 1);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`dotd_${year}_${round}`, driver, {
    maxAge: 60 * 24 * 3600,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
