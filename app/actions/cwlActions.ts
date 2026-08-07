"use server";

import { prisma } from "@/app/lib/prisma";
import { parseClashDate } from "@/app/lib/clash";

export async function saveSeason(
  clanTag: string,
  clanName: string,
  apiSeason: string
) {
  const season = apiSeason.substring(0, 7);

  const clan = await prisma.clan.upsert({
    where: {
      tag: clanTag,
    },
    update: {
      name: clanName,
    },
    create: {
      tag: clanTag,
      name: clanName,
    },
  });

  return prisma.season.upsert({
    where: {
      clanId_season: {
        clanId: clan.id,
        season,
      },
    },

    update: {},

    create: {
      clanId: clan.id,
      season,
    },
  });
}

export async function saveWar(
  warTag: string,
  season: string,
  round: number,
  data: any,
  clanTag: string,
  clanName: string
) {
  const seasonRecord = await saveSeason(
  clanTag,
  clanName,
  season
);

const ourClan =
  data.clan.tag === `#${clanTag}`
    ? data.clan
    : data.opponent;

const enemyClan =
  data.clan.tag === `#${clanTag}`
    ? data.opponent
    : data.clan;

  return prisma.war.upsert({
    where: {
      warTag,
    },

    update: {
      state: data.state,
      isFinalized: data.state === "warEnded",
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

      clanStars: ourClan.stars ?? 0,
      opponentStars: enemyClan.stars ?? 0,

      clanDestruction:
        ourClan.destructionPercentage ?? 0,

      opponentDestruction:
        enemyClan.destructionPercentage ?? 0,
      lastSyncedAt: new Date(),
    },

    create: {
      warTag,

      seasonId: seasonRecord.id,
      clanId: seasonRecord.clanId,

      round,

      state: data.state,
      isFinalized: data.state === "warEnded",

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

      clanStars: ourClan.stars ?? 0,
      opponentStars: enemyClan.stars ?? 0,

      clanDestruction:
        ourClan.destructionPercentage ?? 0,

      opponentDestruction:
        enemyClan.destructionPercentage ?? 0,
      lastSyncedAt: new Date(),
    },
  });
}
export async function savePlayers(
  data: any,
  clanTag: string
) {
  const players = new Map<string, any>();

  const ourClan =
    data.clan.tag === `#${clanTag}`
      ? data.clan
      : data.opponent;

  for (const member of ourClan.members ?? []) {
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
  data: any,
  clanTag: string
) {
  await prisma.attack.deleteMany({
    where: {
      warTag,
    },
  });

  const ourClan =
    data.clan.tag === `#${clanTag}`
      ? data.clan
      : data.opponent;

  let imported = 0;

  for (const member of ourClan.members ?? []) {
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

          defenseStars:
            member.bestOpponentAttack?.stars ?? 0,

          defenseDestruction:
            member.bestOpponentAttack
              ?.destructionPercentage ?? 0,

          defenseAttackerTownHall: 0,

          defenderTag: attack.defenderTag,
          defenderName: "",
        },
      });

      imported++;
    }
  }

  return imported;
}