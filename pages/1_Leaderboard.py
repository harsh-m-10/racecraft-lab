import streamlit as st
import pandas as pd

st.set_page_config(layout="wide")

st.title("🏁 Racecraft Lab")
st.subheader("Power Rankings (Last 10 Seasons, Active Drivers Only)")

df = pd.read_csv("data/processed/final_power_rankings.csv")

# Keep only drivers who raced in the most recent season
df = df[df["is_active"] == True].copy()

sort_metric = st.selectbox(
    "Sort leaderboard by",
    ("Power Score", "Delta Score (Overperformance)", "Chaos Index", "Sunday Edge"),
)

metric_to_column = {
    "Power Score": "power_score_norm",
    "Delta Score (Overperformance)": "avg_overperformance",
    "Chaos Index": "chaos_score_norm",
    "Sunday Edge": "sunday_score_norm",
}

sort_col = metric_to_column[sort_metric]

df = df.sort_values(sort_col, ascending=False).reset_index(drop=True)

top_n = st.slider("How many drivers to show", min_value=5, max_value=len(df), value=min(20, len(df)))
display_df = df[["driver", "power_score_norm", "avg_overperformance", "chaos_score_norm", "sunday_score_norm", "total_races"]].head(top_n)
display_df = display_df.rename(
    columns={
        "driver": "Driver",
        "power_score_norm": "Power Score",
        "avg_overperformance": "Delta Score",
        "chaos_score_norm": "Chaos Index",
        "sunday_score_norm": "Sunday Edge",
        "total_races": "Races (10 seasons)",
    }
)
display_df.index = range(1, len(display_df) + 1)

st.dataframe(
    display_df,
    width="stretch",
)

st.markdown("---")
st.caption("Power Score = 50% Delta Score | 30% Chaos Index | 20% Sunday Edge (last 10 seasons)")