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
     * GEEN ACTIEVE CWL
     * =====================================================
     *
     * De CWL is afgelopen.
     *
     * We gebruiken zowel:
     *
     * 1. CwlMatchup
     * 2. bestaande War-records
     *
     * Daardoor kunnen wars die ooit wel in
     * War zijn opgeslagen maar niet in
     * CwlMatchup staan alsnog definitief
     * worden bijgewerkt.
     */

    if (cwl.lastSeason) {
      const apiSeason =
        cwl.lastSeason;

      /*
       * Season gebruikt in de gewone
       * War-tabel slechts YYYY-MM.
       *
       * Bijvoorbeeld:
       * 2026-08-02 → 2026-08
       */

      const databaseSeason =
        apiSeason.substring(0, 7);

      console.log(
        `🏁 CWL afgelopen. Finaliseren: ${apiSeason}`
      );

      /*
       * -----------------------------------------------------
       * 1. Bekende CWL-matchups ophalen
       * -----------------------------------------------------
       */

      const knownMatchups =
        await prisma.cwlMatchup.findMany({
          where: {
            season: apiSeason,
          },

          orderBy: [
            {
              round: "asc",
            },
            {
              warTag: "asc",
            },
          ],
        });

      /*
       * -----------------------------------------------------
       * 2. Bestaande War-records ophalen
       * -----------------------------------------------------
       *
       * Season is gekoppeld via seasonId.
       */

      const seasonRecords =
        await prisma.season.findMany({
          where: {
            season: databaseSeason,

            clan: {
              tag: {
                in: PHOENIX.clans.map(
                  (clan) =>
                    normalizeTag(
                      clan.tag
                    )
                ),
              },
            },
          },
        });

      const seasonIds =
        seasonRecords.map(
          (season) => season.id
        );

      const knownWars =
        seasonIds.length > 0
          ? await prisma.war.findMany({
              where: {
                seasonId: {
                  in: seasonIds,
                },
              },

              select: {
                warTag: true,
                round: true,
              },
            })
          : [];

      /*
       * -----------------------------------------------------
       * 3. Combineer beide bronnen
       * -----------------------------------------------------
       */

      const warsToFinalize =
        new Map<
          string,
          number
        >();

      for (
        const matchup of
        knownMatchups
      ) {
        warsToFinalize.set(
          matchup.warTag,
          matchup.round
        );
      }

      for (
        const war of
        knownWars
      ) {
        warsToFinalize.set(
          war.warTag,
          war.round
        );
      }

      console.log(
        `🔍 ${warsToFinalize.size} CWL-wars gevonden voor finalisatie.`
      );

      /*
       * -----------------------------------------------------
       * 4. Iedere bekende war opnieuw
       *    rechtstreeks bij Clash ophalen
       * -----------------------------------------------------
       */

      for (
        const [
          warTag,
          round,
        ] of warsToFinalize
      ) {
        console.log(
          `🔄 Finaliseren ronde ${round}: ${warTag}`
        );

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
            apiSeason,
            round,
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

      console.log(
        `✅ CWL-finalisatie voltooid: ${importedWars} eigen wars bijgewerkt.`
      );

      return NextResponse.json({
        success: true,
        mode: "finalize-cwl",
        season: apiSeason,
        importedWars,
        importedPlayers,
        importedAttacks,
        finalizedWarCount:
          warsToFinalize.size,
      });
    }

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