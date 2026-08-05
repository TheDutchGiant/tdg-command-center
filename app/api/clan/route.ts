import { NextResponse } from "next/server";
import { syncEngine } from "@/app/lib/syncEngine";
import { PHOENIX } from "@/app/lib/config";
import { importClan } from "@/app/lib/importClan";
import { fetchClash } from "@/app/lib/clash";
import {
  saveWar,
  savePlayers,
  saveAttacks,
} from "@/app/actions/cwlActions";

export async function GET() {
  try {
    await syncEngine();

    let importedWars = 0;
    let importedPlayers = 0;
    let importedAttacks = 0;

    for (const clan of PHOENIX.clans) {
      const result = await importClan(clan.tag);

      if (!result.active || !result.league) {
        console.log(`😴 ${clan.name}: geen actieve CWL`);
        continue;
      }

      const league = result.league;
      const season = league.season;

      for (let round = 0; round < league.rounds.length; round++) {
        const currentRound = league.rounds[round];

        for (const warTag of currentRound.warTags) {
          if (warTag === "#0") {
            continue;
          }

          const war = await fetchClash(
            `/clanwarleagues/wars/%23${warTag.replace("#", "")}`
          );

          const ourClan = PHOENIX.clans.find(
            (c) =>
              war.clan.tag === `#${c.tag}` ||
              war.opponent.tag === `#${c.tag}`
          );

          if (!ourClan) {
            continue;
          }

          await saveWar(
            warTag,
            season,
            round + 1,
            war,
            ourClan.tag,
            ourClan.name
          );

          importedPlayers += await savePlayers(war);

          importedAttacks += await saveAttacks(
            warTag,
            war
          );

          importedWars++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      importedWars,
      importedPlayers,
      importedAttacks,
    });

  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}