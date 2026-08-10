"use server";

import { prisma } from "@/app/lib/prisma";
import { fetchClash } from "@/app/lib/clash";
import { getCwlPromotionSlots } from "@/app/actions/cwlActions";
import {
  runCwlPrediction,
  type CwlFutureMatchup,
} from "@/app/lib/cwl/prediction";
import type {
  CwlClanStats,
  CwlWarPerformance,
  CwlWarState,
} from "@/app/lib/cwl/types";

function normalizeTag(tag: string): string {
  return tag.replace("#", "").toUpperCase();
}

function tagWithHash(tag: string): string {
  return tag.startsWith("#") ? tag : `#${tag}`;
}

function getWarMembers(
  war: any,
  clanTag: string
): any[] {
  const normalized = normalizeTag(clanTag);

  if (normalizeTag(war.clan?.tag ?? "") === normalized) {
    return war.clan?.members ?? [];
  }

  if (normalizeTag(war.opponent?.tag ?? "") === normalized) {
    return war.opponent?.members ?? [];
  }

  return [];
}

function getAttackInfo(
  war: any,
  clanTag: string,
  warSize: number,
  state: CwlWarState
) {
  if (state === "preparation") {
    return {
      attacksAvailable: warSize,
      attacksUsed: 0,
      attacksRemaining: warSize,
    };
  }

  const members = getWarMembers(war, clanTag);

  const attacksUsed = members.reduce(
    (sum, member) =>
      sum + (member.attacks?.length ?? 0),
    0
  );

  return {
    attacksAvailable: warSize,
    attacksUsed,
    attacksRemaining: Math.max(
      0,
      warSize - attacksUsed
    ),
  };
}

async function fetchWarDetails(
  warTag: string
) {
  return fetchClash(
    `/clanwarleagues/wars/%23${warTag.replace("#", "")}`
  );
}

/*
 * Bouwt de volledige huidige CWL-input voor de simulator.
 *
 * Belangrijk:
 * - Alleen de huidige CWL wordt gebruikt.
 * - Er worden geen tegenstander-spelers opgeslagen.
 * - Alleen de actuele lopende war wordt live opgehaald voor
 *   aanvalsinformatie.
 */
export async function getCwlPrediction(
  season: string,
  targetClanTag: string,
  leagueName: string
) {
  /*
   * Zoek eerst alleen de wars van onze eigen clan.
   * Daarmee bepalen we de juiste CWL-groep.
   *
   * Dit is belangrijk omdat Phoenix meerdere TDG-clans
   * kan importeren en daardoor meerdere CWL-groepen in
   * dezelfde season in CwlMatchup kunnen staan.
   */
  const normalizedTarget = normalizeTag(targetClanTag);

  const ownMatchups = await prisma.cwlMatchup.findMany({
    where: {
      season,
      OR: [
        { clanATag: { in: [normalizedTarget, tagWithHash(normalizedTarget)] } },
        { clanBTag: { in: [normalizedTarget, tagWithHash(normalizedTarget)] } },
      ],
    },
    orderBy: [
      { round: "asc" },
      { warTag: "asc" },
    ],
  });

  if (ownMatchups.length === 0) {
    return null;
  }

  /*
   * Verzamel alle clans die daadwerkelijk in onze
   * eigen CWL-groep zitten.
   */
  const groupTags = new Set<string>();

  for (const matchup of ownMatchups) {
    groupTags.add(normalizeTag(matchup.clanATag));
    groupTags.add(normalizeTag(matchup.clanBTag));
  }

  /*
   * Haal daarna uitsluitend de matchups van deze groep op.
   * Geen clans uit andere CWL-groepen in de simulatie.
   */
  const matchups = await prisma.cwlMatchup.findMany({
    where: {
      season,
      OR: [
        { clanATag: { in: Array.from(groupTags) } },
        { clanBTag: { in: Array.from(groupTags) } },
      ],
    },
    orderBy: [
      { round: "asc" },
      { warTag: "asc" },
    ],
  });

  if (matchups.length === 0) {
    return null;
  }

  const clans = new Map<
    string,
    CwlClanStats
  >();

  for (const matchup of matchups) {
    const warSize = matchup.warSize ?? 15;
    const state = (matchup.status ?? "preparation") as CwlWarState;

    const sides = [
      {
        tag: matchup.clanATag,
        name: matchup.clanAName,
        stars: matchup.clanAStars,
        bonusStars: matchup.clanABonusStars,
        destruction: Number(matchup.clanADestruction),
      },
      {
        tag: matchup.clanBTag,
        name: matchup.clanBName,
        stars: matchup.clanBStars,
        bonusStars: matchup.clanBBonusStars,
        destruction: Number(matchup.clanBDestruction),
      },
    ];

    for (const side of sides) {
      const key = normalizeTag(side.tag);

      if (!clans.has(key)) {
        clans.set(key, {
          tag: side.tag,
          name: side.name,
          warSize: warSize === 30 ? 30 : 15,
          stars: 0,
          bonusStars: 0,
          totalStars: 0,
          destruction: 0,
          completedWars: 0,
          currentWars: 0,
          remainingWars: 0,
          warHistory: [],
        });
      }

      const clan = clans.get(key)!;

      if (state !== "preparation") {
        clan.stars += side.stars;
        clan.destruction += side.destruction;
      }

      if (state === "warEnded") {
        clan.bonusStars += side.bonusStars;
        clan.completedWars += 1;
      } else if (state === "inWar") {
        clan.currentWars += 1;
      } else {
        clan.remainingWars += 1;
      }

      /*
       * Voor afgesloten wars nemen we de volledige
       * war als gebruikte capaciteit. Voor de actuele
       * war halen we de echte aanvalstelling live uit
       * de Clash API.
       */
      const performance: CwlWarPerformance = {
        round: matchup.round,
        opponentTag:
          normalizeTag(side.tag) === normalizeTag(matchup.clanATag)
            ? matchup.clanBTag
            : matchup.clanATag,
        opponentName:
          normalizeTag(side.tag) === normalizeTag(matchup.clanATag)
            ? matchup.clanBName
            : matchup.clanAName,
        state,
        stars:
          state === "preparation" ? 0 : side.stars,
        bonusStars:
          state === "warEnded" ? side.bonusStars : 0,
        totalStars:
          state === "preparation"
            ? 0
            : side.stars +
              (state === "warEnded"
                ? side.bonusStars
                : 0),
        destruction:
          state === "preparation"
            ? 0
            : side.destruction,
        attacksAvailable: warSize,
        attacksUsed:
          state === "warEnded" ? warSize : 0,
        attacksRemaining:
          state === "preparation" ? warSize : 0,
      };

      clan.warHistory.push(performance);
    }
  }

  /*
   * Er is maximaal één actieve war per ronde.
   * We halen alleen de actuele inWar-details live op.
   */
  const activeMatchup = matchups.find(
    (matchup) => matchup.status === "inWar"
  );

  let activeWar: any = null;

  if (activeMatchup) {
    activeWar = await fetchWarDetails(activeMatchup.warTag);

    const activeSides = [
      {
        tag: activeMatchup.clanATag,
        stars: activeMatchup.clanAStars,
        destruction: Number(activeMatchup.clanADestruction),
      },
      {
        tag: activeMatchup.clanBTag,
        stars: activeMatchup.clanBStars,
        destruction: Number(activeMatchup.clanBDestruction),
      },
    ];

    for (const side of activeSides) {
      const clan = clans.get(normalizeTag(side.tag));
      if (!clan) continue;

      const info = getAttackInfo(
        activeWar,
        side.tag,
        activeMatchup.warSize ?? 15,
        "inWar"
      );

      const currentWar = clan.warHistory.find(
        (war) =>
          war.round === activeMatchup!.round &&
          war.state === "inWar"
      );

      if (currentWar) {
        currentWar.attacksAvailable = info.attacksAvailable;
        currentWar.attacksUsed = info.attacksUsed;
        currentWar.attacksRemaining = info.attacksRemaining;
      }
    }
  }

  for (const clan of clans.values()) {
    clan.totalStars =
      clan.stars + clan.bonusStars;
  }

  const clanArray = Array.from(clans.values());

  /*
   * Alle nog niet afgesloten matchups worden aan de simulator
   * gegeven. Een inWar-matchup bevat de reeds behaalde score
   * en alleen het resterende aanvalspotentieel wordt gesimuleerd.
   */
  const futureMatchups: CwlFutureMatchup[] = [];

  for (const matchup of matchups) {
    if (matchup.status === "warEnded") {
      continue;
    }

    const warSize = matchup.warSize ?? 15;

    const clanAWar = clans.get(normalizeTag(matchup.clanATag));
    const clanBWar = clans.get(normalizeTag(matchup.clanBTag));

    const aHistory = clanAWar?.warHistory.find(
      (war) =>
        war.round === matchup.round &&
        war.state === (matchup.status ?? "preparation")
    );

    const bHistory = clanBWar?.warHistory.find(
      (war) =>
        war.round === matchup.round &&
        war.state === (matchup.status ?? "preparation")
    );

    futureMatchups.push({
      round: matchup.round,
      clanATag: matchup.clanATag,
      clanAName: matchup.clanAName,
      clanBTag: matchup.clanBTag,
      clanBName: matchup.clanBName,
      warSize: warSize === 30 ? 30 : 15,
      state: (matchup.status ?? "preparation") as CwlWarState,
      clanAStars:
        matchup.status === "inWar" ? matchup.clanAStars : 0,
      clanBStars:
        matchup.status === "inWar" ? matchup.clanBStars : 0,
      clanADestruction:
        matchup.status === "inWar"
          ? Number(matchup.clanADestruction)
          : 0,
      clanBDestruction:
        matchup.status === "inWar"
          ? Number(matchup.clanBDestruction)
          : 0,
      clanAAttacksRemaining:
        aHistory?.attacksRemaining ?? warSize,
      clanBAttacksRemaining:
        bHistory?.attacksRemaining ?? warSize,
    });
  }

  const promotionSlots =
    await getCwlPromotionSlots(leagueName);

  const simulation = runCwlPrediction(
    {
      season,
      targetClanTag: tagWithHash(targetClanTag),
      promotionSlots,
      clans: clanArray,
      futureMatchups,
    },
    20_000
  );

  return simulation;
}
