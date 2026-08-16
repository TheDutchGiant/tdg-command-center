import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";

type Attack = {
  attackerTag?: string;
  defenderTag?: string;
  stars?: number;
  destructionPercentage?: number;
  order?: number;
  duration?: number;
};

type Member = {
  tag: string;
  name: string;
  townhallLevel: number;
  mapPosition: number;
  attacks?: Attack[];
  opponentAttacks?: number;
  bestOpponentAttack?: Attack | null;
};

function normalizeTag(
  tag: string
): string {
  return tag
    .replace(/^#/, "")
    .toUpperCase();
}

async function main() {
  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    " REPAIR HISTORICAL DEFENSIVE DATA"
  );
  console.log(
    "========================================"
  );
  console.log("");

  const wars =
    await prisma.cwlHistoricalWar.findMany({
      include: {
        players: true,
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

  console.log(
    `Historische wars gevonden: ${wars.length}`
  );

  let repairedPlayers = 0;

  for (const war of wars) {
    console.log("");
    console.log(
      `War: ${war.warTag}`
    );
    console.log(
      `Clan: ${war.clanTag}`
    );
    console.log(
      `Round: ${war.round}`
    );

    let rawData: any;

    try {
      rawData =
        typeof war.rawData ===
        "string"
          ? JSON.parse(
              war.rawData
            )
          : war.rawData;
    } catch {
      console.log(
        "⚠️ rawData kon niet worden gelezen."
      );
      continue;
    }

    const clan =
      rawData?.clan;

    if (!clan) {
      console.log(
        "⚠️ Geen clan-data gevonden."
      );
      continue;
    }

    const members: Member[] =
      clan.members || [];

    for (const player of members) {
      const playerTag =
        normalizeTag(
          player.tag
        );

      const historicalPlayer =
        await prisma.cwlHistoricalPlayer.findUnique(
          {
            where: {
              warId_playerTag: {
                warId: war.id,
                playerTag,
              },
            },
          }
        );

      if (!historicalPlayer) {
        console.log(
          `⚠️ Speler niet gevonden: ${player.name} ${player.tag}`
        );
        continue;
      }

      const attacks =
        player.attacks || [];

      const opponentAttacks =
        player.opponentAttacks || 0;

      const best =
        player.bestOpponentAttack ??
        null;

      await prisma.cwlHistoricalPlayer.update(
        {
          where: {
            id: historicalPlayer.id,
          },
          data: {
            name:
              player.name,

            townHall:
              player.townhallLevel,

            mapPosition:
              player.mapPosition,

            attacks,

            opponentAttacks,

            bestOpponentAttack:
              best === null
                ? Prisma.JsonNull
                : best,
          },
        }
      );

      repairedPlayers += 1;

      if (
        opponentAttacks > 0
      ) {
        console.log(
          `  ✓ ${player.name}: ${opponentAttacks} defensive attacks`
        );
      }
    }
  }

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    " REPAIR KLAAR"
  );
  console.log(
    "========================================"
  );
  console.log("");

  console.log(
    `Gerepareerde spelers: ${repairedPlayers}`
  );

  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "🔥 REPAIR FOUT:"
    );
    console.error(error);
    process.exit(1);
  })
  .finally(
    async () => {
      await prisma.$disconnect();
    }
  );