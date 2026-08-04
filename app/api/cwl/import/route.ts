import { NextResponse } from "next/server";
import { fetchClash } from "@/app/lib/clash";
import {
  saveWar,
  savePlayers,
  saveAttacks,
} from "@/app/actions/cwlActions";

const CLAN_TAG = "2JLLPVGUU";

export async function GET() {
  try {
    const league = await fetchClash(
      `/clans/%23${CLAN_TAG}/currentwar/leaguegroup`
    );

    const season = league.season;

    let importedWars = 0;
    let importedPlayers = 0;
    let importedAttacks = 0;

    for (let round = 0; round < league.rounds.length; round++) {
      const currentRound = league.rounds[round];

      for (const warTag of currentRound.warTags) {
        if (warTag === "#0") {
          continue;
        }

        const war = await fetchClash(
          `/clanwarleagues/wars/%23${warTag.replace("#", "")}`
        );

        const isOurClan =
  war.clan.tag === "#2JLLPVGUU" ||
  war.opponent.tag === "#2JLLPVGUU";

if (!isOurClan) {
  continue;
}

await saveWar(
  warTag,
  season,
  round + 1,
  war
);

        importedPlayers += await savePlayers(war);

        importedAttacks += await saveAttacks(
          warTag,
          war
        );

        importedWars++;
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