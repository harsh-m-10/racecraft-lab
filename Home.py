import streamlit as st
import pandas as pd

st.set_page_config(
    page_title="Racecraft Lab | F1 Power Rankings & Metrics",
    page_icon="🏁",
    layout="wide",
)

st.markdown(
    """
    <style>
    body {
        background: radial-gradient(circle at top left, #1b1f3a 0, #05060b 45%, #000000 100%);
        color: #f4f4f4;
        font-family: "Roboto", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .metric-card {
        padding: 1rem 1.25rem;
        border-radius: 0.75rem;
        background: rgba(12, 14, 23, 0.9);
        border: 1px solid rgba(255, 30, 86, 0.4);
        box-shadow: 0 0 24px rgba(0, 245, 255, 0.25);
    }
    .metric-label {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #c0c4ff;
    }
    .metric-value {
        font-size: 1.6rem;
        font-weight: 700;
        color: #ffffff;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("Racecraft Lab")
st.subheader("F1 power rankings and racecraft metrics for active drivers")

st.caption(
    "An opinionated Formula 1 analytics lab using Delta Score, Chaos Index, and Sunday Edge over the last 10 seasons."
)

try:
    df = pd.read_csv("data/processed/final_power_rankings.csv")
    active_df = df[df["is_active"] == True].copy()
except Exception:
    active_df = None

col_left, col_right = st.columns([2, 1], gap="large")

with col_left:
    st.markdown("### What is Racecraft Lab?")
    st.write(
        "- **Delta Score (Overperformance)**: grid-to-finish execution versus your teammate baseline.\n"
        "- **Chaos Index**: how well you survive and deliver in high-DNF, high-variance races.\n"
        "- **Sunday Edge**: race-day execution combining position gain and consistency.\n\n"
        "These roll up into a single **Power Score** ranking only *current* F1 drivers over the last ten seasons."
    )

    st.markdown("### Navigate the lab")
    st.write(
        "- **Leaderboard**: see the full active-driver rankings.\n"
        "- **Driver Profile**: deep dive on a single driver's metrics and trends.\n"
        "- **Methodology**: full breakdown of how every metric is built."
    )

with col_right:
    st.markdown("### Current meta snapshot")
    if active_df is not None and not active_df.empty:
        active_df = active_df.sort_values("power_score_norm", ascending=False)
        top_power = active_df.iloc[0]
        top_over = active_df.sort_values("avg_overperformance", ascending=False).iloc[0]
        top_chaos = active_df.sort_values("chaos_score_norm", ascending=False).iloc[0]
        top_sunday = active_df.sort_values("sunday_score_norm", ascending=False).iloc[0]

        st.markdown(
            f"""
            <div class="metric-card">
              <div class="metric-label">Top overall</div>
              <div class="metric-value">{top_power['driver']}</div>
              <div>Power Score: {top_power['power_score_norm']:.1f}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown("")

        col_a, col_b = st.columns(2)
        with col_a:
            st.markdown(
                f"""
                <div class="metric-card">
                  <div class="metric-label">Delta Score leader</div>
                  <div class="metric-value">{top_over['driver']}</div>
                  <div>Avg Overperf: {top_over['avg_overperformance']:.2f}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with col_b:
            st.markdown(
                f"""
                <div class="metric-card">
                  <div class="metric-label">Chaos Index leader</div>
                  <div class="metric-value">{top_chaos['driver']}</div>
                  <div>Chaos Index: {top_chaos['chaos_score_norm']:.1f}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
    else:
        st.info("Rankings are temporarily unavailable. Please try again in a few minutes.")

