/** Team accent colors for the current grid (and recent names). */
const TEAM_COLORS: Record<string, string> = {
  McLaren: "#FF8000",
  Ferrari: "#E8002D",
  "Red Bull Racing": "#3671C6",
  Mercedes: "#27F4D2",
  "Aston Martin": "#229971",
  Alpine: "#0093CC",
  Williams: "#64C4FF",
  "Racing Bulls": "#6692FF",
  Audi: "#CDCDCD",
  Cadillac: "#D4AF37",
  "Haas F1 Team": "#B6BABD",
  // Recent historical names, for archive pages
  "Kick Sauber": "#52E252",
  Sauber: "#52E252",
  "Alfa Romeo": "#900000",
  "Alfa Romeo Racing": "#900000",
  AlphaTauri: "#2B4562",
  "Toro Rosso": "#469BFF",
  RB: "#6692FF",
  "Force India": "#F596C8",
  "Racing Point": "#F596C8",
  Renault: "#FFF500",
};

export function teamColor(team: string | null | undefined): string {
  return (team && TEAM_COLORS[team]) || "#71717c";
}
