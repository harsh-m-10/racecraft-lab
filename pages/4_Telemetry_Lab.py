import json
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

st.set_page_config(page_title="Telemetry Lab | Racecraft Lab", page_icon="📡", layout="wide")

BLUE = "#3987e5"   # faster / better pole
RED = "#FF1E56"    # slower / worse pole (brand red)
INK = "#c3c2b7"
GRID = "#2c2c2a"

st.title("Telemetry Lab")
st.subheader("Lap-level metrics: race pace, qualifying head-to-head, tyre management")

try:
    tele = pd.read_csv("data/processed/telemetry_seasons.csv")
    power = pd.read_csv("data/processed/power_v2.csv")
except Exception:
    st.error("Telemetry data is not available right now. Run the pipeline export first.")
    st.stop()

seasons = sorted(tele["season"].dropna().unique().astype(int), reverse=True)
season = st.selectbox("Season", seasons)
ts = tele[tele["season"] == season]


def styled(fig: go.Figure, height: int) -> go.Figure:
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        height=height,
        margin=dict(l=10, r=30, t=10, b=10),
        showlegend=False,
        font=dict(color=INK),
        bargap=0.35,
    )
    fig.update_xaxes(gridcolor=GRID, zerolinecolor=INK, zerolinewidth=1)
    fig.update_yaxes(gridcolor="rgba(0,0,0,0)")
    return fig


def hbar(df, x, y, colors, hovertemplate, x_title):
    fig = go.Figure(
        go.Bar(
            x=df[x], y=df[y], orientation="h",
            marker=dict(color=colors, line=dict(width=0)),
            hovertemplate=hovertemplate, name="",
        )
    )
    fig.update_xaxes(title_text=x_title, title_font=dict(size=12, color=INK))
    return styled(fig, height=max(300, 26 * len(df) + 80))


# ---------- Race pace ----------
st.markdown("### Race pace — average gap to the fastest car (%)")
st.caption("Median clean-lap time per dry race vs the race-best median. Lower is faster. Traffic, strategy and luck removed.")

pace = ts.dropna(subset=["avg_gap_pct"]).sort_values("avg_gap_pct", ascending=False)
if pace.empty:
    st.info("No race pace data for this season yet.")
else:
    st.plotly_chart(
        hbar(
            pace, "avg_gap_pct", "driver", BLUE,
            "%{y}: +%{x:.2f}% off best pace<extra></extra>",
            "avg gap to best race pace (%) — shorter bar = faster",
        ),
        width="stretch",
    )

# ---------- Quali head-to-head ----------
st.markdown("### Qualifying head-to-head — median gap to teammate (%)")
st.caption("Deepest shared quali segment, same car, same day. Negative (blue) = faster than teammate.")

quali = ts.dropna(subset=["median_gap_pct"]).sort_values("median_gap_pct", ascending=False)
if quali.empty:
    st.info("No qualifying head-to-head data for this season yet.")
else:
    colors = [BLUE if v < 0 else RED for v in quali["median_gap_pct"]]
    st.plotly_chart(
        hbar(
            quali, "median_gap_pct", "driver", colors,
            "%{y}: %{x:+.3f}% vs teammate · beats teammate "
            + quali["win_rate"].map(lambda w: f"{w:.0%}").astype(str)
            + " of sessions<extra></extra>",
            "median quali gap vs teammate (%) — negative = faster",
        ),
        width="stretch",
    )

# ---------- Tyre management ----------
st.markdown("### Tyre management — degradation advantage vs teammate (s/lap)")
st.caption("Stint-slope comparison on the same compound in the same race. Positive (blue) = tyres last longer than teammate's.")

tyre = ts.dropna(subset=["avg_deg_advantage"]).sort_values("avg_deg_advantage")
if tyre.empty:
    st.info("No tyre data for this season yet.")
else:
    colors = [BLUE if v > 0 else RED for v in tyre["avg_deg_advantage"]]
    st.plotly_chart(
        hbar(
            tyre, "avg_deg_advantage", "driver", colors,
            "%{y}: %{x:+.3f} s/lap deg advantage<extra></extra>",
            "tyre degradation advantage vs teammate (s/lap) — positive = better",
        ),
        width="stretch",
    )

# ---------- Event drill-down ----------
st.markdown("### Race-by-race pace")
season_file = Path(f"data/exports/seasons/{season}.json")
if season_file.exists():
    events = json.loads(season_file.read_text(encoding="utf-8"))["events"]
    events_with_pace = [e for e in events if e["race_pace"]]
    if events_with_pace:
        ev = st.selectbox("Grand Prix", events_with_pace, format_func=lambda e: e["event"])
        ep = pd.DataFrame(ev["race_pace"]).sort_values("gap_pct", ascending=False)
        st.plotly_chart(
            hbar(
                ep, "gap_pct", "driver", BLUE,
                "%{y}: +%{x:.3f}% (median %{customdata[0]:.3f}s over %{customdata[1]} clean laps)<extra></extra>",
                f"{ev['event']} — gap to best median clean lap (%)",
            ).update_traces(customdata=ep[["median_lap_s", "clean_laps"]]),
            width="stretch",
        )
    else:
        st.info("No dry-race pace data for this season yet.")
else:
    st.info("Season export not found.")

# ---------- Power Score v2 ----------
st.markdown("### Power Score v2 — the full picture (2018–present)")
st.caption(
    "25% race pace · 20% quali H2H · 20% delta score · 10% Sunday edge · 10% chaos index · "
    "10% tyre management · 5% launch. Low-confidence rows lack enough telemetry history."
)

table = power[power["is_active"] == True].sort_values("power_score_v2_norm", ascending=False)
table = table[[
    "driver", "power_score_v2_norm", "race_pace", "quali_h2h",
    "tyre_management", "launch", "avg_overperformance",
    "sunday_score_norm", "chaos_score_norm", "low_confidence",
]].rename(columns={
    "power_score_v2_norm": "Power v2",
    "driver": "Driver",
    "race_pace": "Race Pace",
    "quali_h2h": "Quali H2H",
    "tyre_management": "Tyre Mgmt",
    "launch": "Launch",
    "avg_overperformance": "Delta Score",
    "sunday_score_norm": "Sunday Edge",
    "chaos_score_norm": "Chaos Index",
    "low_confidence": "Low confidence",
})
st.dataframe(
    table.style.format({c: "{:.1f}" for c in table.columns if c not in ("Driver", "Low confidence")}),
    width="stretch",
    hide_index=True,
    height=min(800, 38 * len(table) + 40),
)
