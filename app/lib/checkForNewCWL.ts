import { fetchClash } from "@/app/lib/clash";
import { prisma } from "@/app/lib/prisma";
import { PHOENIX } from "./config";

export async function checkForNewCWL() {
  console.log("🔎 Zoeken naar een actieve CWL...");

  try {
    const primaryClan = PHOENIX.clans.find(
      (clan) => clan.primary
    );

    if (!primaryClan) {
      throw new Error(
        "Geen primary clan ingesteld."
      );
    }

    const league = await fetchClash(
      `/clans/%23${primaryClan.tag}/currentwar/leaguegroup`
    );

    if (!league?.season) {
      throw new Error(
        "Clash API gaf geen actieve CWL-season terug."
      );
    }

    console.log(
      `✅ Actieve CWL gevonden: ${league.season}`
    );

    return {
      active: true,
      league,
    };
  } catch {
    console.log(
      "😴 Geen actieve CWL gevonden."
    );

    /*
     * De CWL kan inmiddels afgelopen zijn.
     *
     * We zoeken daarom de laatst bekende
     * CWL-season in Phoenix.
     *
     * Dit gebruiken we om de laatste wars
     * nog één keer volledig bij Clash op te
     * halen en definitief op te slaan.
     */

    const latestMatchup =
      await prisma.cwlMatchup.findFirst({
        orderBy: [
          {
            season: "desc",
          },
          {
            round: "desc",
          },
        ],
      });

    if (!latestMatchup) {
      console.log(
        "ℹ️ Nog geen eerdere CWL gevonden in Phoenix."
      );

      return {
        active: false,
        league: null,
        lastSeason: null,
      };
    }

    console.log(
      `🏁 Laatst bekende CWL gevonden: ${latestMatchup.season}`
    );

    return {
      active: false,
      league: null,
      lastSeason: latestMatchup.season,
    };
  }
}