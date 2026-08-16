import { prisma } from "@/app/lib/prisma";

function parseJsonArray(value: unknown): any[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

async function main() {
  console.log("========================================");
  console.log(" HISTORISCHE CWL DEFENSIVE DATA CHECK");
  console.log("========================================");

  const wars = await prisma.cwlHistoricalWar.findMany({
    orderBy: [
      { round: "asc" },
      { clanTag: "asc" },
    ],
    include: {
      players: true,
    },
  });

  console.log(`Historische wars: ${wars.length}`);

  let totalPlayers = 0;
  let totalDefensiveAttacks = 0;

  for (const war of wars) {
    console.log("");
    console.log("----------------------------------------");
    console.log(
      `Ronde ${war.round} | ${war.warTag} | ${war.clanTag} vs ${war.opponentTag}`
    );

    const players = [...war.players].sort(
      (a, b) => a.mapPosition - b.mapPosition
    );

    for (const player of players) {
      totalPlayers++;

      const opponentAttacks = parseJsonArray(
        player.opponentAttacks
      );

      if (opponentAttacks.length === 0) {
        continue;
      }

      totalDefensiveAttacks += opponentAttacks.length;

      console.log("");
      console.log(
        `#${player.mapPosition} ${player.name} | ${player.playerTag}`
      );

      console.log(
        `  Defensive attacks: ${opponentAttacks.length}`
      );

      for (const attack of opponentAttacks) {
        console.log(
          `  → ${attack.stars ?? "?"}★ | ${
            attack.destructionPercentage ?? "?"
          }% | attacker: ${
            attack.attackerTag ?? "?"
          }`
        );
      }

      if (player.bestOpponentAttack) {
        const best =
          typeof player.bestOpponentAttack === "string"
            ? JSON.parse(player.bestOpponentAttack)
            : player.bestOpponentAttack;

        console.log(
          `  BEST: ${best?.stars ?? "?"}★ | ${
            best?.destructionPercentage ?? "?"
          }%`
        );
      }
    }
  }

  console.log("");
  console.log("========================================");
  console.log(" SAMENVATTING");
  console.log("========================================");

  console.log(
    `Spelers gelezen: ${totalPlayers}`
  );

  console.log(
    `Defensive attacks gevonden: ${totalDefensiveAttacks}`
  );

  if (totalDefensiveAttacks === 0) {
    console.log("");
    console.log(
      "⚠️ GEEN defensive attacks gevonden in de opgeslagen data."
    );
  } else {
    console.log("");
    console.log(
      "✅ Defensive data staat daadwerkelijk in de database."
    );
  }

  console.log("");
  console.log("KLAAR");
}

main()
  .catch((error) => {
    console.error("");
    console.error("🔥 FOUT:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });