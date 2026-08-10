import type {
  CwlClanStats,
  CwlSimulationResult,
} from "./types";

import type {
  CwlFutureMatchup,
} from "./prediction";

function normalizeTag(tag: string): string {
  return tag.replace("#", "").toUpperCase();
}

function findClan(
  clans: CwlClanStats[],
  tag: string
): CwlClanStats | undefined {
  const normalized = normalizeTag(tag);
  return clans.find(
    (clan) => normalizeTag(clan.tag) === normalized
  );
}

/*
 * Deterministische CWL-analyse.
 *
 * Geen Monte Carlo en geen aannames over gemiddelde prestaties.
 * Alleen harde grenzen uit de actuele CWL-data:
 *
 * - huidige score = sterren + verdiende bonussterren
 * - resterende aanvallen
 * - maximaal 3 sterren per resterende aanval
 * - maximaal 10 bonussterren per nog niet afgesloten war
 * - huidige war-score/destruction voor een lopende war
 *
 * De engine antwoordt daarom niet "93,2%".
 * Hij antwoordt:
 *   GUARANTEED  -> mathematisch zeker top 2
 *   POSSIBLE    -> promotie kan nog, maar is niet gegarandeerd
 *   IMPOSSIBLE  -> promotie kan mathematisch niet meer
 */

function getCurrentWarValue(
  matchup: CwlFutureMatchup,
  clanIsA: boolean
): { stars: number; destruction: number } {
  if (matchup.state !== "inWar") {
    return { stars: 0, destruction: 0 };
  }

  return clanIsA
    ? {
        stars: matchup.clanAStars,
        destruction: matchup.clanADestruction,
      }
    : {
        stars: matchup.clanBStars,
        destruction: matchup.clanBDestruction,
      };
}

function getRemainingAttacks(
  matchup: CwlFutureMatchup,
  clanIsA: boolean
): number {
  return Math.max(
    0,
    clanIsA
      ? matchup.clanAAttacksRemaining
      : matchup.clanBAttacksRemaining
  );
}

function getMaximumWarScore(
  matchup: CwlFutureMatchup,
  clanIsA: boolean
): number {
  const current = getCurrentWarValue(matchup, clanIsA);
  const attacks = getRemainingAttacks(matchup, clanIsA);

  return current.stars + attacks * 3;
}

function getMaximumWarDestruction(
  matchup: CwlFutureMatchup,
  clanIsA: boolean
): number {
  const current = getCurrentWarValue(matchup, clanIsA);
  const attacks = getRemainingAttacks(matchup, clanIsA);

  /*
   * Destruction is only a tie-break. We do not predict it.
   * 100% is a safe upper bound because the API exposes
   * destruction as a percentage.
   */
  return Math.min(
    100,
    current.destruction + attacks * 100
  );
}

function canStillWinWarAtMaximum(
  matchup: CwlFutureMatchup,
  clanIsA: boolean
): boolean {
  const ownStars = getMaximumWarScore(matchup, clanIsA);
  const opponentStars = getCurrentWarValue(
    matchup,
    !clanIsA
  ).stars;

  if (ownStars > opponentStars) {
    return true;
  }

  if (ownStars < opponentStars) {
    return false;
  }

  const ownDestruction = getMaximumWarDestruction(
    matchup,
    clanIsA
  );

  const opponentDestruction = getCurrentWarValue(
    matchup,
    !clanIsA
  ).destruction;

  return ownDestruction > opponentDestruction;
}

function getMaximumPossibleScore(
  clan: CwlClanStats,
  futureMatchups: CwlFutureMatchup[]
): number {
  let maximum = clan.totalStars;

  for (const matchup of futureMatchups) {
    const isA =
      normalizeTag(matchup.clanATag) ===
      normalizeTag(clan.tag);

    const isB =
      normalizeTag(matchup.clanBTag) ===
      normalizeTag(clan.tag);

    if (!isA && !isB) continue;

    const ownMax = getMaximumWarScore(
      matchup,
      isA
    );

    const current = getCurrentWarValue(
      matchup,
      isA
    );

    /*
     * Stars already present in an inWar matchup are part of
     * ownMax. In preparation they are zero.
     */
    const additionalStars =
      Math.max(0, ownMax - current.stars);

    maximum += additionalStars;

    /*
     * Bonus is possible only if the clan can still win this
     * individual war. This is an upper-bound question, so the
     * opponent is allowed to finish with zero additional stars.
     */
    if (
      canStillWinWarAtMaximum(
        matchup,
        isA
      )
    ) {
      maximum += 10;
    }
  }

  return maximum;
}

function getMinimumPossibleScore(
  clan: CwlClanStats
): number {
  /*
   * All future attacks can score zero and all future wars can
   * be lost. Already-earned stars/bonuses cannot disappear.
   */
  return clan.totalStars;
}

function getStandPositionForScore(
  targetScore: number,
  otherScores: number[],
  equalCountsAsAbove: boolean
): number {
  const above = otherScores.filter((score) =>
    equalCountsAsAbove
      ? score >= targetScore
      : score > targetScore
  ).length;

  return above + 1;
}

export function simulatePromotionChance(
  clans: CwlClanStats[],
  targetClanTag: string,
  promotionSlots: number,
  futureMatchups: CwlFutureMatchup[] = [],
  _simulations = 20_000
): CwlSimulationResult {
  if (!clans.length || promotionSlots <= 0) {
    return {
      promotionChance: 0,
      maximumPromotionChance: 0,
      simulations: 0,
      promotions: 0,
      currentPosition: 0,
      promotionSlots,
      currentScore: 0,
      maximumPossibleScore: 0,
      promotionStatus: "IMPOSSIBLE",
      clansToPass: 0,
      maxClansCanPass: 0,
      bestPossiblePosition: 0,
      worstPossiblePosition: 0,
    };
  }

  const target = findClan(clans, targetClanTag);

  if (!target) {
    return {
      promotionChance: 0,
      maximumPromotionChance: 0,
      simulations: 0,
      promotions: 0,
      currentPosition: 0,
      promotionSlots,
      currentScore: 0,
      maximumPossibleScore: 0,
      promotionStatus: "IMPOSSIBLE",
      clansToPass: 0,
      maxClansCanPass: 0,
      bestPossiblePosition: 0,
      worstPossiblePosition: 0,
    };
  }

  const currentScores = clans.map(
    (clan) => clan.totalStars
  );

  const currentSorted = [...clans].sort(
    (a, b) =>
      b.totalStars - a.totalStars
  );

  const currentPosition =
    currentSorted.findIndex(
      (clan) =>
        normalizeTag(clan.tag) ===
        normalizeTag(target.tag)
    ) + 1;

  const maximumScores = new Map<string, number>();
  const minimumScores = new Map<string, number>();

  for (const clan of clans) {
    maximumScores.set(
      normalizeTag(clan.tag),
      getMaximumPossibleScore(
        clan,
        futureMatchups
      )
    );

    minimumScores.set(
      normalizeTag(clan.tag),
      getMinimumPossibleScore(clan)
    );
  }

  const targetMax =
    maximumScores.get(
      normalizeTag(target.tag)
    ) ?? target.totalStars;

  const targetCurrent =
    target.totalStars;

  const others = clans.filter(
    (clan) =>
      normalizeTag(clan.tag) !==
      normalizeTag(target.tag)
  );

  /*
   * Best possible target position:
   * every other clan is allowed to stay at its minimum.
   * Equal scores are allowed to be resolved in our favour.
   */
  const bestPossiblePosition =
    getStandPositionForScore(
      targetMax,
      others.map(
        (clan) =>
          minimumScores.get(
            normalizeTag(clan.tag)
          ) ?? clan.totalStars
      ),
      false
    );

  /*
   * Worst possible target position:
   * every other clan is allowed to reach its maximum.
   * Equal scores count as a possible position above us because
   * destruction is a tie-break that we are not predicting.
   */
  const worstPossiblePosition =
    getStandPositionForScore(
      targetCurrent,
      others.map(
        (clan) =>
          maximumScores.get(
            normalizeTag(clan.tag)
          ) ?? clan.totalStars
      ),
      true
    );

  const clansToPass =
    Math.max(
      0,
      currentPosition - promotionSlots
    );

  const maxClansCanPass =
    Math.max(
      0,
      worstPossiblePosition - currentPosition
    );

  let promotionStatus:
    | "GUARANTEED"
    | "POSSIBLE"
    | "IMPOSSIBLE";

  if (
    bestPossiblePosition >
    promotionSlots
  ) {
    promotionStatus = "IMPOSSIBLE";
  } else if (
    worstPossiblePosition <=
    promotionSlots
  ) {
    promotionStatus = "GUARANTEED";
  } else {
    promotionStatus = "POSSIBLE";
  }

  return {
    /*
     * These legacy numeric fields remain populated so older
     * callers keep working. They are no longer used as a
     * probability model.
     */
    promotionChance:
      promotionStatus === "GUARANTEED"
        ? 100
        : promotionStatus === "IMPOSSIBLE"
        ? 0
        : 0,

    maximumPromotionChance:
      promotionStatus === "IMPOSSIBLE"
        ? 0
        : 100,

    /*
     * No Monte Carlo is performed.
     */
    simulations: 0,
    promotions: 0,

    currentPosition,
    promotionSlots,
    currentScore: targetCurrent,
    maximumPossibleScore: targetMax,

    promotionStatus,
    clansToPass,
    maxClansCanPass,
    bestPossiblePosition,
    worstPossiblePosition,
  };
}
