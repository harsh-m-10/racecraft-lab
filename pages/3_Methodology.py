import streamlit as st

st.set_page_config(layout="wide")

st.title("Methodology")
st.subheader("How Racecraft Lab builds its metrics")

st.markdown("### Data & scope")
st.write(
    "- **Source**: public Ergast F1 results API.\n"
    "- **Window**: last 10 seasons up to the current year.\n"
    "- **Active drivers**: only drivers who appear in the latest season are shown on the main leaderboard."
)

st.markdown("### Delta Score (Overperformance)")
st.write(
    "- Measures **how much you beat or lose to your grid spot**, adjusted for teammate and starting position.\n"
    "- DNFs get a small time‑loss penalty (driver vs mechanical) so repeated mistakes hurt more than pure bad luck.\n"
    "- Scores are normalised per season and then averaged across the 10‑season window."
)

st.markdown("### Chaos Index")
st.write(
    "- Looks only at **high‑DNF, high‑variance races** in each season.\n"
    "- Ranks how much a driver outperforms their teammate specifically on those chaotic days."
)

st.markdown("### Sunday Edge")
st.write(
    "- Blends **average race‑day position gain** with **how consistent your finishes are**.\n"
    "- Drivers need a minimum race sample; scores are normalised so 50 is average."
)

st.markdown("### Power Score & caveats")
st.write(
    "- **Power Score** = 50% Delta Score + 30% Chaos Index + 20% Sunday Edge, all normalised.\n"
    "- DNFs, weather and strategy are simplified; this is a **debate‑starter model**, not absolute truth."
)