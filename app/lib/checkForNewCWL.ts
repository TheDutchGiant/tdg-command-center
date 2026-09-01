import { fetchClash } from "@/app/lib/clash";
import { PHOENIX } from "./config";

export async function checkForNewCWL() {
  console.log("🔎 Zoeken naar een actieve CWL...");

  const primaryClan = PHOENIX.clans.find(
    (clan) => clan.primary
  );

  if (!primaryClan) {
    throw new Error("Geen primary clan ingesteld.");
  }

  /*
   * De leaguegroup-endpoint kan rond de overgang van een CWL
   * tijdelijk notFound teruggeven. Dat mag NIET worden
   * geïnterpreteerd als: "de CWL is afgelopen".
   */
  try {
    const league = await fetchClash(
      `/clans/%23${primaryClan.tag}/currentwar/leaguegroup`
    );

    if (league?.season) {
      console.log(
        `✅ Actieve CWL gevonden: ${league.season}`
      );

      return {
        active: true,
        league,
        lastSeason: league.season,
      };
    }
  } catch (error) {
    console.log(
      "⚠️ CWL leaguegroup tijdelijk niet beschikbaar."
    );
    console.log(error);
  }

  /*
   * Belangrijk:
   * geen leaguegroup = onbekende status.
   *
   * We geven GEEN lastSeason terug. Daardoor kan de import
   * de CWL niet ten onrechte als afgelopen finaliseren.
   */
  return {
    active: false,
    league: null,
    lastSeason: null,
  };
}
