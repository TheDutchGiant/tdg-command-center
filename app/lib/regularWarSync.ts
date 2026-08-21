import { prisma } from "./prisma";
import { PHOENIX } from "./config";
import { fetchClash, parseClashDate } from "./clash";

function normalizeTag(tag: string) {
  return tag.replace("#", "").toUpperCase();
}

function makeWarTag(clanTag: string, startTime: string) {
  return `REGULAR-${normalizeTag(clanTag)}-${startTime}`;
}


async function saveRegularWar(
  clanTag: string,
  war: any,
  source: "CURRENT" | "WARLOG"
) {
  if (!war?.startTime || !war?.endTime || !war?.clan?.members) {
    return {
      imported: false,
      players: 0,
      attacks: 0,
      missed: 0,
    };
  }

  const ownClan = war.clan;
  const opponent = war.opponent ?? {};

  const warTag = makeWarTag(
    clanTag,
    war.startTime
  );

  const warStartTime = parseClashDate(
    war.startTime
  );

  const warEndTime = parseClashDate(
    war.endTime
  );

  const now = new Date();

  /*
   * Een gewone CW duurt:
   *
   * 24 uur voorbereiding
   * 24 uur aanvalsdag
   *
   * Als we hem tijdens preparation zien, mag hij
   * pas 48 uur na start definitief worden.
   *
   * Tijdens de aanvalsdag is de normale eindtijd
   * voldoende.
   *
   * Warlog = per definitie afgesloten.
   */
  let finalized = source === "WARLOG";

  if (source === "CURRENT") {
    if (war.state === "warEnded") {
      finalized = true;
    } else if (war.state === "inWar") {
      finalized = now >= warEndTime;
    } else if (war.state === "preparation") {
      const finalizeAt =
        new Date(
          warStartTime.getTime() +
          48 * 60 * 60 * 1000
        );

      finalized = now >= finalizeAt;
    }
  }

  await prisma.regularWar.upsert({
    where: {
      warTag,
    },

    update: {
      clanTag,
      opponentTag: normalizeTag(
        opponent.tag ?? ""
      ),
      clanName: ownClan.name ?? "",
      opponentName: opponent.name ?? "",
      teamSize: war.teamSize ?? 0,
      clanStars: ownClan.stars ?? 0,
      opponentStars: opponent.stars ?? 0,
      warStartTime,
      warEndTime,
    },

    create: {
      warTag,
      clanTag,
      opponentTag: normalizeTag(
        opponent.tag ?? ""
      ),
      clanName: ownClan.name ?? "",
      opponentName: opponent.name ?? "",
      teamSize: war.teamSize ?? 0,
      clanStars: ownClan.stars ?? 0,
      opponentStars: opponent.stars ?? 0,
      warStartTime,
      warEndTime,
    },
  });

  /*
   * Tegenstanders indexeren zodat we per aanval
   * direct de TH en naam kunnen vinden.
   */
  const opponentMembers =
    opponent.members ?? [];

  const opponentMap = new Map<string, any>();

  for (const member of opponentMembers) {
    opponentMap.set(
      normalizeTag(member.tag ?? ""),
      member
    );
  }

  /*
   * Alleen definitieve CW's krijgen opnieuw een
   * MissedAttack-overzicht.
   */
  if (finalized) {
    await prisma.missedAttack.deleteMany({
      where: {
        clanTag,
        warTag,
      },
    });
  }

  let players = 0;
  let attacks = 0;
  let missed = 0;

  for (const member of ownClan.members) {
    const memberAttacks =
      member.attacks ?? [];

    const attacksExpected =
      war.attacksPerMember ?? 2;

    const attacksDone =
      memberAttacks.length;

    const missedAttacks = finalized
      ? Math.max(
          attacksExpected -
          attacksDone,
          0
        )
      : 0;

    let oneStars = 0;
    let twoStars = 0;
    let threeStars = 0;
    let totalStars = 0;

    for (const attack of memberAttacks) {
      const stars =
        Number(attack.stars ?? 0);

      totalStars += stars;

      if (stars === 1) oneStars++;
      if (stars === 2) twoStars++;
      if (stars === 3) threeStars++;

      const defenderTag =
        normalizeTag(
          attack.defenderTag ?? ""
        );

      const defender =
        opponentMap.get(
          defenderTag
        );

      const attackNumber =
        Number(
          attack.order ??
          attack.attackNumber ??
          0
        );

      if (!attackNumber) {
        console.warn(
          `⚠️ Gewone CW aanval zonder attackNumber: ${member.name} ${member.tag}`
        );
        continue;
      }

      await prisma.regularWarAttack.upsert({
        where: {
          warTag_playerTag_attackNumber: {
            warTag,
            playerTag:
              normalizeTag(member.tag),
            attackNumber,
          },
        },

        update: {
          playerName:
            member.name ?? "",

          defenderTag,

          defenderName:
            defender?.name ?? "",

          stars,

          destruction:
            Number(
              attack.destructionPercentage ??
              0
            ),

          duration:
            Number(
              attack.duration ??
              0
            ),

          attackerTownHall:
            Number(
              member.townhallLevel ??
              0
            ),

          defenderTownHall:
            Number(
              defender?.townhallLevel ??
              0
            ),
        },

        create: {
          warTag,

          playerTag:
            normalizeTag(
              member.tag
            ),

          playerName:
            member.name ?? "",

          defenderTag,

          defenderName:
            defender?.name ?? "",

          attackNumber,

          stars,

          destruction:
            Number(
              attack.destructionPercentage ??
              0
            ),

          duration:
            Number(
              attack.duration ??
              0
            ),

          attackerTownHall:
            Number(
              member.townhallLevel ??
              0
            ),

          defenderTownHall:
            Number(
              defender?.townhallLevel ??
              0
            ),
        },
      });

      attacks++;
    }

    /*
     * Speler altijd bewaren.
     */
    await prisma.player.upsert({
      where: {
        playerTag:
          normalizeTag(member.tag),
      },

      update: {
        currentName:
          member.name ?? "",
      },

      create: {
        playerTag:
          normalizeTag(member.tag),

        currentName:
          member.name ?? "",
      },
    });

    /*
     * Samenvatting per speler.
     */
    await prisma.regularWarPlayer.upsert({
      where: {
        warTag_playerTag: {
          warTag,
          playerTag:
            normalizeTag(member.tag),
        },
      },

      update: {
        playerName:
          member.name ?? "",

        attacksExpected,

        attacksDone,

        missedAttacks,

        oneStars,

        twoStars,

        threeStars,

        totalStars,
      },

      create: {
        warTag,

        playerTag:
          normalizeTag(member.tag),

        playerName:
          member.name ?? "",

        attacksExpected,

        attacksDone,

        missedAttacks,

        oneStars,

        twoStars,

        threeStars,

        totalStars,
      },
    });

    /*
     * Definitieve gemiste aanvallen afzonderlijk bewaren.
     */
    if (
      finalized &&
      missedAttacks > 0
    ) {
      await prisma.missedAttack.create({
        data: {
          clanTag,

          warTag,

          playerTag:
            normalizeTag(
              member.tag
            ),

          playerName:
            member.name ?? "",

          missedAttacks,

          warEndTime,
        },
      });

      missed += missedAttacks;
    }

    players++;
  }

  return {
    imported: true,
    source,
    players,
    attacks,
    missed,
    finalized,
    state: war.state ?? "warlog",
    warTag,
  };
}


async function syncCurrentWar(
  clanTag: string
) {
  const war = await fetchClash(
    `/clans/%23${clanTag}/currentwar`
  );

  if (
    !war ||
    war.state === "notInWar" ||
    !war.startTime ||
    !war.endTime
  ) {
    return {
      imported: false,
      players: 0,
      attacks: 0,
      missed: 0,
    };
  }

  return saveRegularWar(
    clanTag,
    war,
    "CURRENT"
  );
}


async function syncRecentWarlog(
  clanTag: string
) {
  const data = await fetchClash(
    `/clans/%23${clanTag}/warlog?limit=2`
  );

  const wars =
    Array.isArray(data?.items)
      ? data.items
      : [];

  let players = 0;
  let attacks = 0;
  let missed = 0;
  let importedWars = 0;

  for (const war of wars) {
    /*
     * Alleen wars waarin onze clan daadwerkelijk
     * voorkomt als "clan" verwerken.
     */
    if (
      normalizeTag(
        war?.clan?.tag ?? ""
      ) !== clanTag
    ) {
      continue;
    }

    const result =
      await saveRegularWar(
        clanTag,
        war,
        "WARLOG"
      );

    if (!result.imported) {
      continue;
    }

    importedWars++;
    players += result.players;
    attacks += result.attacks;
    missed += result.missed;
  }

  return {
    importedWars,
    players,
    attacks,
    missed,
  };
}


export async function syncRegularWars() {
  console.log(
    "🔥 Phoenix gewone CW sync gestart"
  );

  let wars = 0;
  let players = 0;
  let attacks = 0;
  let missed = 0;

  for (const clan of PHOENIX.clans) {
    const clanTag =
      normalizeTag(clan.tag);

    /*
     * 1. Actieve CW
     */
    try {
      const current =
        await syncCurrentWar(
          clanTag
        );

      if (current.imported) {
        wars++;
        players += current.players;
        attacks += current.attacks;
        missed += current.missed;
      }
    } catch (error) {
      console.error(
        `❌ Current CW sync mislukt voor ${clan.name}:`,
        error
      );
    }

    /*
     * 2. Laatste twee afgesloten CW's
     *
     * Deze blijven beschikbaar voor de
     * CW-performance calculator.
     */
    try {
      const history =
        await syncRecentWarlog(
          clanTag
        );

      wars += history.importedWars;
      players += history.players;
      attacks += history.attacks;
      missed += history.missed;
    } catch (error) {
      console.error(
        `❌ Warlog sync mislukt voor ${clan.name}:`,
        error
      );
    }
  }

  return {
    wars,
    players,
    attacks,
    missed,
  };
}
