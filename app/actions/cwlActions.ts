"use server";

import { prisma } from "@/app/lib/prisma";
import { parseClashDate } from "@/app/lib/clash";

export async function saveSeason(apiSeason: string) {
  const season = apiSeason.substring(0, 7);

  return prisma.season.upsert({
    where: {
      season,
    },
    update: {},
    create: {
      season,
    },
  });
}

export async function saveWar(
  warTag: string,
  season: string,
  round: number,
  data: any
) {
  const seasonRecord = await saveSeason(season);

  return prisma.war.upsert({
    where: {
      warTag,
    },

    update: {
      state: data.state,
      teamSize: data.teamSize,

      preparationStartTime: parseClashDate(
        data.preparationStartTime
      ),

      warStartTime: parseClashDate(
        data.startTime
      ),

      warEndTime: parseClashDate(
        data.endTime
      ),

      clanStars: data.clan.stars ?? 0,
      opponentStars: data.opponent.stars ?? 0,

      clanDestruction:
        data.clan.destructionPercentage ?? 0,

      opponentDestruction:
        data.opponent.destructionPercentage ?? 0,
    },

    create: {
      warTag,

      seasonId: seasonRecord.id,

      round,

      state: data.state,

      teamSize: data.teamSize,

      preparationStartTime: parseClashDate(
        data.preparationStartTime
      ),

      warStartTime: parseClashDate(
        data.startTime
      ),

      warEndTime: parseClashDate(
        data.endTime
      ),

      clanStars: data.clan.stars ?? 0,

      opponentStars:
        data.opponent.stars ?? 0,

      clanDestruction:
        data.clan.destructionPercentage ?? 0,

      opponentDestruction:
        data.opponent.destructionPercentage ?? 0,
    },
  });
}
export async function savePlayers(data: any) {
  const players = new Map<string, any>();

 const ourClan =
  data.clan.tag === "#2JLLPVGUU"
    ? data.clan
    : data.opponent;

for (const member of ourClan.members) {
  players.set(member.tag, member);
}

  for (const player of players.values()) {
    await prisma.player.upsert({
      where: {
        playerTag: player.tag,
      },

      update: {
        currentName: player.name,
      },

      create: {
        playerTag: player.tag,
        currentName: player.name,
      },
    });
  }

  return players.size;
}
export async function saveAttacks(
  warTag: string,
  data: any
) {
  await prisma.attack.deleteMany({
    where: { warTag },
  });

  const clans = [
  data.clan.tag === "#2JLLPVGUU"
    ? data.clan
    : data.opponent,
];

  let imported = 0;

  for (const clan of clans) {
    for (const member of clan.members ?? []) {
      for (const attack of member.attacks ?? []) {
        await prisma.attack.create({
          data: {
            warTag,
            playerTag: member.tag,
            warDay: 1,
            attackNumber: attack.order,
            stars: attack.stars,
            destruction: attack.destructionPercentage,
            duration: attack.duration ?? 0,
            attackerTownHall: member.townhallLevel,
            defenderTownHall: 0,
            defenseStars: member.bestOpponentAttack?.stars ?? 0,
            defenseDestruction:
              member.bestOpponentAttack?.destructionPercentage ?? 0,
            defenseAttackerTownHall: 0,
            defenderTag: attack.defenderTag,
            defenderName: "",
          },
        });

        imported++;
      }
    }
  }

  return imported;
}