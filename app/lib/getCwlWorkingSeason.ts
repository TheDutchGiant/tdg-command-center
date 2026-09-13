import { checkForNewCWL } from "@/app/lib/checkForNewCWL";

function previousMonth(season: string): string {
  const [year, month] = season.split("-").map(Number);

  if (month === 1) {
    return `${year - 1}-12`;
  }

  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

export async function getCwlWorkingSeason(): Promise<string> {
  const cwl = await checkForNewCWL();

  /*
   * Zolang er daadwerkelijk een actieve CWL is,
   * hoort de selectie bij de maand vóór de actieve CWL.
   *
   * Voorbeeld:
   * actieve CWL 2026-09 -> selectie 2026-08
   */
  if (cwl.active && cwl.league?.season) {
    const cwlSeason = cwl.league.season.slice(0, 7);

    return previousMonth(cwlSeason);
  }

  /*
   * Geen actieve CWL betekent dat de vorige CWL voorbij is
   * en dat we een nieuwe selectie voor de huidige/planningsmaand
   * moeten kunnen genereren.
   *
   * Voorbeeld:
   * september-CWL voorbij -> nieuwe selectie 2026-09
   */
  return new Date().toISOString().slice(0, 7);
}
