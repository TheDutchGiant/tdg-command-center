import { prisma } from "@/app/lib/prisma";
import { fetchClash } from "@/app/lib/clash";
import { checkForNewCWL } from "@/app/lib/checkForNewCWL";
import { PHOENIX } from "@/app/lib/config";

function normalizeTag(tag: string): string {
  return tag.replace(/^#/, "").toUpperCase();
}

function findOurClan(war: any) {
  return PHOENIX.clans.find(
    (clan) =>
      normalizeTag(war.clan?.tag ?? "") ===
        normalizeTag(clan.tag) ||
      normalizeTag(war.opponent?.tag ?? "") ===
        normalizeTag(clan.tag)
  );
}

async function importWar(
  warTag: string,
  season: string,
  round: number,
  war: any
) {
  const ourClan = findOurClan(war);

  if (!ourClan) {
    return {
      saved: false,
      players: 0,
    };
  }

  const ourClanIsA =
    normalizeTag(war.clan.tag) ===
    normalizeTag(ourClan.tag);

  const clan = ourClanIsA
    ? war.clan
    : war.opponent;

  const opponent = ourClanIsA
    ? war.opponent
    : war.clan;

  const historicalWar =
    await prisma.cwlHistoricalWar.upsert({
      where: {
        warTag,
      },

      update: {
        season,
        round,
        state: war.state,
        teamSize: war.teamSize,
        clanTag: clan.tag,
        opponentTag: opponent.tag,
        rawData: war,
      },

      create: {
        warTag,
        season,
        round,
        state: war.state,
        teamSize: war.teamSize,
        clanTag: clan.tag,
        opponentTag: opponent.tag,
        rawData: war,
      },
    });

  let players = 0;

  for (const member of clan.members ?? []) {
    await prisma.cwlHistoricalPlayer.upsert({
      where: {
        warId_playerTag: {
          warId: historicalWar.id,
          playerTag: member.tag,
        },
      },

      update: {
        name: member.name,
        townHall: member.townhallLevel,
        mapPosition: member.mapPosition,
        attacks: member.attacks ?? [],
        opponentAttacks:
          member.opponentAttacks ?? [],
        bestOpponentAttack:
          member.bestOpponentAttack ?? null,
      },

      create: {
        warId: historicalWar.id,
        playerTag: member.tag,
        name: member.name,
        townHall: member.townhallLevel,
        mapPosition: member.mapPosition,
        attacks: member.attacks ?? [],
        opponentAttacks:
          member.opponentAttacks ?? [],
        bestOpponentAttack:
          member.bestOpponentAttack ?? null,
      },
    });

    players++;
  }

  return {
    saved: true,
    players,
  };
}

async function main() {
  console.log("");
  console.log("========================================");
  console.log(" HISTORISCHE CWL IMPORT");
  console.log("========================================");
  console.log("");

  const cwl = await checkForNewCWL();

  if (!cwl.lastSeason) {
    throw new Error(
      "Geen historische CWL gevonden."
    );
  }

  const apiSeason =
    cwl.lastSeason;

  console.log(
    `🏁 Historische CWL: ${apiSeason}`
  );

  /*
   * De huidige CWL is al voorbij.
   *
   * Daarom gebruiken we de bestaande
   * CwlMatchup-records om exact te weten
   * welke wars bij deze CWL hoorden.
   */
  const matchups =
    await prisma.cwlMatchup.findMany({
      where: {
        season: {
          startsWith:
            apiSeason.substring(0, 7),
        },
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

  if (matchups.length === 0) {
    throw new Error(
      `Geen CwlMatchup-records gevonden voor ${apiSeason}.`
    );
  }

  console.log(
    `📦 Bestaande CWL-matchups: ${matchups.length}`
  );

  console.log("");

  let importedWars = 0;
  let importedPlayers = 0;
  let skippedWars = 0;
  let failedWars = 0;

  /*
   * Eén war kan in CwlMatchup maar één keer
   * voorkomen, maar we gebruiken alsnog een Set
   * als extra beveiliging.
   */
  const processed =
    new Set<string>();

  for (const matchup of matchups) {
    const warTag =
      matchup.warTag;

    if (
      processed.has(warTag)
    ) {
      continue;
    }

    processed.add(warTag);

    console.log(
      `----------------------------------------`
    );

    console.log(
      `Ronde ${matchup.round}: ${warTag}`
    );

    try {
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
          matchup.round,
          war
        );

      if (!result.saved) {
        skippedWars++;

        console.log(
          "  → Geen TDG-clan in deze war"
        );

        continue;
      }

      importedWars++;
      importedPlayers +=
        result.players;

      console.log(
        `  ✓ ${result.players} spelers opgeslagen`
      );

      console.log(
        `  ✓ Volledige API-response opgeslagen`
      );
    } catch (error) {
      failedWars++;

      console.error(
        `  🔥 FOUT bij ${warTag}:`
      );

      console.error(
        error
      );
    }
  }

  console.log("");
  console.log("========================================");
  console.log(" IMPORT KLAAR");
  console.log("========================================");
  console.log(
    `Matchups gevonden: ${matchups.length}`
  );
  console.log(
    `TDG-wars opgeslagen: ${importedWars}`
  );
  console.log(
    `Spelers opgeslagen: ${importedPlayers}`
  );
  console.log(
    `Niet-TDG wars overgeslagen: ${skippedWars}`
  );
  console.log(
    `Mislukte wars: ${failedWars}`
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error("🔥 IMPORT FOUT:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });