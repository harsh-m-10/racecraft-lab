import streamlit as st
import pandas as pd
import plotly.graph_objects as go

st.set_page_config(layout="wide")

st.title("Driver Profile")
st.subheader("Deep dive on a single driver's Racecraft Lab metrics")

try:
    overall = pd.read_csv("data/processed/final_power_rankings.csv")
    season_over = pd.read_csv("data/processed/season_overperformance.csv")
except Exception:
    st.error("Driver data is not available right now. Please check back later.")
    st.stop()

overall_active = overall[overall["is_active"] == True].copy()

if overall_active.empty:
    st.info("No active drivers found in the latest season yet.")
    st.stop()

driver_name = st.selectbox(
    "Select active driver",
    sorted(overall_active["driver"].unique()),
)

driver_row = overall_active[overall_active["driver"] == driver_name].iloc[0]

rank_df = overall_active.sort_values("power_score_norm", ascending=False).reset_index(drop=True)
driver_rank = int(rank_df.index[rank_df["driver"] == driver_name][0]) + 1
field_size = len(rank_df)

col_main, col_side = st.columns([2, 1], gap="large")

with col_main:
    st.markdown(f"### {driver_name} — Rank #{driver_rank} of {field_size}")

    m1, m2, m3 = st.columns(3)
    m1.metric("Power Score", f"{driver_row['power_score_norm']:.1f}")
    m2.metric("Chaos Index", f"{driver_row['chaos_score_norm']:.1f}")
    m3.metric("Sunday Edge", f"{driver_row['sunday_score_norm']:.1f}")

    st.markdown("#### Metric radar")

    metrics = ["Delta Score", "Chaos Index", "Sunday Edge"]
    values = [
        driver_row["avg_overperformance"],
        driver_row["chaos_score_norm"],
        driver_row["sunday_score_norm"],
    ]

    # Use global ranges for consistent radial axis
    over_min = overall_active["avg_overperformance"].min()
    over_max = overall_active["avg_overperformance"].max()
    chaos_min = overall_active["chaos_score_norm"].min()
    chaos_max = overall_active["chaos_score_norm"].max()
    sunday_min = overall_active["sunday_score_norm"].min()
    sunday_max = overall_active["sunday_score_norm"].max()

    radial_min = min(over_min, chaos_min, sunday_min)
    radial_max = max(over_max, chaos_max, sunday_max)

    fig = go.Figure(
        data=go.Scatterpolar(
            r=values + [values[0]],
            theta=metrics + [metrics[0]],
            fill="toself",
            name=driver_name,
            line=dict(color="#FF1E56"),
        )
    )
    fig.update_layout(
        polar=dict(
            radialaxis=dict(visible=True, range=[radial_min, radial_max]),
        ),
        showlegend=False,
        template="plotly_dark",
        margin=dict(l=10, r=10, t=30, b=10),
    )

    st.plotly_chart(fig, width="stretch")

    st.markdown("#### Delta Score (overperformance) by season")
    season_driver = season_over[season_over["driver"] == driver_name].sort_values("season")
    if season_driver.empty:
        st.info("No per-season data available for this driver yet.")
    else:
        season_driver["season_str"] = season_driver["season"].astype(str)
        trend_df = season_driver[["season_str", "overperformance_norm"]].set_index("season_str")
        st.line_chart(trend_df, width="stretch")

with col_side:
    st.markdown("#### Usage notes")
    st.write(
        "- **Power Score** combines Delta Score (Overperformance), Chaos Index, and Sunday Edge.\n"
        "- **Chaos Index** focuses only on high-DNF, high-variance races.\n"
        "- **Sunday Edge** blends average position gain with consistency across races."
    )