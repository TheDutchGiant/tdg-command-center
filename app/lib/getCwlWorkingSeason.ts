import { checkForNewCWL } from "@/app/lib/checkForNewCWL";

export async function getCwlWorkingSeason(): Promise<string> {
  const cwl = await checkForNewCWL();

  /*
   * Tijdens een actieve CWL is de season van Clash leidend.
   *
   * Voorbeeld:
   * kalender = september 2026
   * actieve Clash CWL = 2026-08
   *
   * Dan blijven we dus 2026-08 gebruiken.
   */
  if (cwl.active && cwl.league?.season) {
    return cwl.league.season;
  }

  /*
   * Buiten een actieve CWL gebruiken we de huidige
   * kalendermaand voor de nieuwe aanmeldings-/voorbereidingsfase.
   */
  return new Date()
    .toISOString()
    .slice(0, 7);
}
