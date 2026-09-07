import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { fetchClash } from "@/app/lib/clash";
import { PHOENIX } from "@/app/lib/config";
import {
  saveWar,
  savePlayers,
  saveAttacks,
  saveCwlMatchup,
} from "@/app/actions/cwlActions";

function normalizeTag(tag: string) {
  return tag.replace("#", "");
}

function findOurClan(war: any) {
  return PHOENIX.clans.find(
    (clan) =>
      normalizeTag(war.clan.tag) === normalizeTag(clan.tag) ||
      normalizeTag(war.opponent.tag) === normalizeTag(clan.tag)
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
    PHOENIX.clans.map((clan) => clan.tag)
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

  const players = await savePlayers(
    war,
    ourClan.tag
  );

  const attacks = await saveAttacks(
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

    const importedWarTags = new Set<string>();
    const importedSeasons = new Set<string>();

    let activeClans = 0;

    /*
     * Iedere TDG-clan kan in een andere CWL-groep zitten.
     * Daarom halen we voor iedere clan afzonderlijk de
     * actuele leaguegroup op.
     */
    for (const phoenixClan of PHOENIX.clans) {
      let league: any = null;

      try {
        league = await fetchClash(
          `/clans/%23${phoenixClan.tag.replace(
            "#",
            ""
          )}/currentwar/leaguegroup`
        );
      } catch (error) {
        console.log(
          `⚠️ Geen actieve CWL beschikbaar voor ${phoenixClan.name}.`
        );
        continue;
      }

      if (
        !league?.season ||
        !Array.isArray(league.rounds)
      ) {
        console.log(
          `⚠️ Ongeldige CWL-data voor ${phoenixClan.name}.`
        );
        continue;
      }

      activeClans++;

      const season = league.season;

      importedSeasons.add(season);

      console.log(
        `🔥 Actieve CWL importeren voor ${phoenixClan.name}: ${season}`
      );

      for (
        let round = 0;
        round < league.rounds.length;
        round++
      ) {
        const currentRound = league.rounds[round];

        for (
          const warTag of currentRound.warTags ?? []
        ) {
          if (warTag === "#0") {
            continue;
          }

          if (importedWarTags.has(warTag)) {
            continue;
          }

          importedWarTags.add(warTag);

          const war = await fetchClash(
            `/clanwarleagues/wars/%23${warTag.replace(
              "#",
              ""
            )}`
          );

          const result = await importWar(
            warTag,
            season,
            round + 1,
            war
          );

          if (result.isOurClan) {
            importedWars++;
            importedPlayers += result.players;
            importedAttacks += result.attacks;
          }
        }
      }
    }

    if (activeClans > 0) {
      return NextResponse.json({
        success: true,
        mode: "active-cwl",
        seasons: Array.from(importedSeasons),
        activeClans,
        importedWars,
        importedPlayers,
        importedAttacks,
      });
    }

    return NextResponse.json({
      success: true,
      mode: "waiting-for-cwl",
      message:
        "Geen actieve CWL leaguegroup beschikbaar voor de TDG-clans.",
      activeClans: 0,
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
