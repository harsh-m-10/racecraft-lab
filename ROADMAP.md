# Racecraft roadmap

The goal: **the app an F1 fan opens every day** — first for the schedule and results,
eventually for everything. Growth first, monetization only once there's a real audience.

Guiding rules learned so far:

1. **Real data only on main surfaces.** Standings are FIA points, results are official
   classifications. Derived analysis lives in the Debrief and is always framed as
   facts ("+0.4% slower"), never invented scores.
2. **The eye test beats the math.** If something looks wrong to a fan in 5 seconds,
   it's wrong for the product regardless of the calculation.
3. **Every feature must serve a daily or weekly habit loop.** One-time-wow features
   lose to "check it every morning" features.

---

## Now — feedback window (current)

Site is live and polished. While early users react, only fix what they report.
**Gate: 5–10 real users have used it across one race weekend.**

- [x] Fan hub: countdown, schedule, results, standings, news, Debrief
- [x] Data refresh every 2h on race weekends, auto-redeploy
- [x] Analytics wired (`@vercel/analytics` — needs one click to enable in the
  Vercel dashboard → Project → Analytics)
- [ ] Collect feedback: what did they open first? did they come back Sunday?
  what did they expect that wasn't there?

## Horizon 1 — Retention basics (1–2 weeks of work)

Make the site feel complete for a casual fan. Prioritize by feedback.

- **Driver & team pages (real stats)** — photo-free profile: current season
  results round by round, career wins/podiums/poles since 2018, teammate quali
  record. Standings rows link to them.
- **Starting grid view** — after quali, the race page shows the grid (with
  penalties applied when they differ from quali order).
- **OG share images** — every race page gets a generated share card (winner,
  podium, flag) so links posted in group chats/Reddit look rich. This is the
  #1 growth lever: shared links ARE the marketing.
- **PWA** — installable, offline schedule. "Add to home screen" turns a website
  into an app icon on a fan's phone.
- **Weekend mode home** — during a live session, the home hero becomes a
  "happening now" panel with the session and a link that will hold the result.
- **Circuit maps** — track outline per event drawn from telemetry position data
  (one-time heavy backfill; visually unique, nobody else generates these).

### Pulled forward from user feedback (2026-07-05)

- [x] **Driver of the Day vote** — race pages, opens at lights out, closes 36h
  later, archived forever. Needs Upstash Redis connected in Vercel.
- [x] **Race quiz** — auto-generated per race from real data (pole, winner,
  most places gained, true pace, teammate beatdown, last year's winner);
  shareable score.
- [ ] **Live driver tracking** — promoted to the flagship of Horizon 2 (see
  below): needs a persistent relay server for the live timing stream; start
  with a live position/interval list, track map after.

## Horizon 2 — Race-weekend live (the moat for habit)

The gap between "results in 2 hours" and "results in 2 minutes" is the gap
between a website and THE site. True live timing is licensed and off-limits;
everything below is legal and doable.

- **Fast results worker** — during session windows, poll Jolpica every ~2 min
  from a lightweight scheduled job and push provisional classification straight
  to the site (on-demand ISR revalidation instead of waiting for the pipeline).
- **Live championship math** — during a race: "as it stands, Antonelli leads
  by 43" projected standings.
- **Weather per session** — forecast on the schedule/race pages (open-meteo,
  free).
- **Penalty & stewards tracker** — grid penalties, time penalties, and
  post-race investigations in one place. Fans hunt for this after every race.
- **Push notifications (PWA)** — "Quali starts in 30 min", "Race result:
  Antonelli wins". Opt-in per session type. The single strongest retention
  feature on this list.

## Horizon 3 — Content & growth loops

Things people share, argue about, and Google.

- **Auto-Debrief social cards** — after each race, generate 2–3 shareable
  images: true-pace top 5, biggest teammate quali gap, most positions gained.
  One-tap share buttons. Post-race Reddit threads are the distribution channel.
- **All-time stats explorer** — backfill 1950–2017 results from Jolpica (points,
  wins, champions — no lap data needed) → "most wins at Silverstone",
  "youngest polesitter" pages. Evergreen SEO that compounds.
- **Head-to-head tool** — pick any two drivers → career + current-season
  comparison (results-based for all years, lap-data for 2018+). Endless
  bar-stool arguments, endlessly shareable URLs.
- **Season hub pages** — one page per season telling its story: standings
  progression chart, round-by-round winners. Ranks for "F1 2019 season".
- **"On this day" / anniversaries** — small daily-changing home module; cheap
  daily-habit fuel from the historical database.

## Horizon 4 — Community & identity

Only after there are repeat visitors worth recognizing.

- **Pick your driver/team** (no account; localStorage) — home page personalizes:
  your driver's result first, their gap in the Debrief highlighted.
- **Predictions game** — pick podium before each race, score points, season
  leaderboard. Accounts arrive here (magic link). This is the fantasy layer
  reborn as engagement, not paywall.
- **Private leagues** — predictions with friends; the viral unit. A league
  invite is a personal recommendation.

## Horizon 5 — Revenue (only with real traffic)

- **Supporter tier** (~$2–3/mo): notifications customization, deeper Debrief
  (stint-by-stint tyre analysis, strategy what-ifs), no house ads, name in
  credits. Price like a coffee, sell like a fan club.
- **Contextual affiliate** — race tickets, travel, merch links on race pages.
- **API access** for the clean-lap dataset (hobbyist tier free, commercial paid).
- Custom domain + brand identity happen at the start of this horizon (or
  earlier, the moment analytics shows organic return visitors).

## Infrastructure debt to watch

- **Data-in-git ceiling**: committing parquet/JSON to git works at 2h cadence;
  Horizon 2's minutes-cadence needs object storage (R2/S3) + on-demand ISR,
  with git remaining the weekly archive.
- **Streamlit retirement**: `Home.py` + `pages/` and the legacy CSVs still
  exist; delete once the Streamlit Cloud app is taken down (user action).
- **SQ empty-classification bug**: Sprint Qualifying results occasionally
  publish late and cache empty; add a "re-fetch results-empty sessions" pass
  to the weekend cron.
- **fastf1 pin**: FastF1 3.8.x pinned; check changelog before each season for
  schema drift (2027 rules era will change telemetry channels).
