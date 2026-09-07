import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { fetchClash } from "@/app/lib/clash";
import { checkForNewCWL } from "@/app/lib/checkForNewCWL";
import { PHOENIX } from "@/app/lib/config";
import {
  saveWar,
  savePlayers,
  saveAttacks,
  saveCwlMatchup,
} from "@/app/actions/cwlActions";

const PRIMARY_CLAN = PHOENIX.clans.find(
  (clan) => clan.primary
);

if (!PRIMARY_CLAN) {
  throw new Error(
    "Geen primary clan ingesteld."
  );
}

function normalizeTag(tag: string) {
  return tag.replace("#", "");
}

function findOurClan(war: any) {
  return PHOENIX.clans.find(
    (clan) =>
      normalizeTag(war.clan.tag) ===
        normalizeTag(clan.tag) ||
      normalizeTag(war.opponent.tag) ===
        normalizeTag(clan.tag)
  );
}

async function importWar(
  warTag: string,
  season: string,
  round: number,
  war: any
) {
  await saveCwlMatchup(
    warTag,
    season,
    round,
    war,
    PHOENIX.clans.map(
      (clan) => clan.tag
    )
  );

  const ourClan = findOurClan(war);

  if (!ourClan) {
    return {
      isOurClan: false,
      players: 0,
      attacks: 0,
    };
  }

  await saveWar(
    warTag,
    season,
    round,
    war,
    ourClan.tag,
    ourClan.name
  );

  const players =
    await savePlayers(
      war,
      ourClan.tag
    );

  const attacks =
    await saveAttacks(
      warTag,
      war,
      ourClan.tag
    );

  return {
    isOurClan: true,
    players,
    attacks,
  };
}

export async function GET() {
  try {
    let importedWars = 0;
    let importedPlayers = 0;
    let importedAttacks = 0;

    const cwl =
      await checkForNewCWL();

    /*
     * =====================================================
     * ACTIEVE CWL
     * =====================================================
     */

    if (cwl.active && cwl.league) {
      const league = cwl.league;
      const season = league.season;

      console.log(
        `🔥 Actieve CWL importeren: ${season}`
      );

      const importedWarTags =
        new Set<string>();

      for (
        let round = 0;
        round < league.rounds.length;
        round++
      ) {
        const currentRound =
          league.rounds[round];

        for (
          const warTag of
          currentRound.warTags
        ) {
          if (warTag === "#0") {
            continue;
          }

          if (
            importedWarTags.has(warTag)
          ) {
            continue;
          }

          importedWarTags.add(warTag);

          const war =
            await fetchClash(
              `/clanwarleagues/wars/%23${warTag.replace(
                "#",
                ""
              )}`
            );

          const result =
            await importWar(
              warTag,
              season,
              round + 1,
              war
            );

          if (result.isOurClan) {
            importedWars++;
            importedPlayers +=
              result.players;
            importedAttacks +=
              result.attacks;
          }
        }
      }

      return NextResponse.json({
        success: true,
        mode: "active-cwl",
        season,
        importedWars,
        importedPlayers,
        importedAttacks,
      });
    }

    /*
     * =====================================================
     * GEEN BESCHIKBARE ACTIEVE CWL
     * =====================================================
     *
     * Het ontbreken van /currentwar/leaguegroup betekent
     * niet automatisch dat een CWL is afgelopen.
     *
     * Rond de overgang tussen CWL-seizoenen kan Clash deze
     * endpoint tijdelijk niet beschikbaar maken.
     *
     * Daarom finaliseren we hier NIET automatisch.
     *
     * Een definitieve selectie wordt pas gewisseld wanneer
     * de actieve CWL-cyclus daadwerkelijk voorbij is.
     */

    return NextResponse.json({
      success: true,
      mode: "waiting-for-cwl",
      message:
        "Geen actieve CWL leaguegroup beschikbaar. Geen finalisatie uitgevoerd.",
      importedWars: 0,
      importedPlayers: 0,
      importedAttacks: 0,
    });

    /*
     * Nog nooit een CWL geïmporteerd.
     */

    return NextResponse.json({
      success: true,
      mode: "idle",
      message:
        "Geen actieve of eerder opgeslagen CWL gevonden.",
      importedWars: 0,
      importedPlayers: 0,
      importedAttacks: 0,
    });
  } catch (error: any) {
    console.error(
      "🔥 CWL IMPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ??
          "Onbekende fout tijdens CWL-import.",
      },
      {
        status: 500,
      }
    );
  }
}