import type {
  CwlClanStats,
  CwlSimulationResult,
  CwlWarState,
} from "./types";

import {
  simulatePromotionChance,
} from "./simulation";

/*
 * Een toekomstige CWL-matchup.
 *
 * Phoenix gebruikt deze informatie om te weten
 * welke clans nog tegen elkaar moeten spelen.
 */
export type CwlFutureMatchup = {
  round: number;

  clanATag: string;
  clanAName: string;

  clanBTag: string;
  clanBName: string;

  warSize: 15 | 30;

  state: CwlWarState;

  clanAStars: number;
  clanBStars: number;

  clanADestruction: number;
  clanBDestruction: number;

  clanAAttacksRemaining: number;
  clanBAttacksRemaining: number;
};

/*
 * Alle informatie die de Prediction Engine
 * nodig heeft.
 */
export type CwlPredictionInput = {
  season: string;

  targetClanTag: string;

  promotionSlots: number;

  clans: CwlClanStats[];

  futureMatchups: CwlFutureMatchup[];
};

/*
 * Normaliseer een clan-tag.
 */
function normalizeTag(
  tag: string
): string {
  return tag
    .replace("#", "")
    .toUpperCase();
}

/*
 * Zoek een clan op tag.
 */
export function findClan(
  clans: CwlClanStats[],
  clanTag: string
): CwlClanStats | undefined {
  const normalized =
    normalizeTag(
      clanTag
    );

  return clans.find(
    (clan) =>
      normalizeTag(
        clan.tag
      ) === normalized
  );
}

/*
 * Controleer of een matchup nog relevant
 * is voor de toekomstige simulatie.
 */
export function isFutureMatchup(
  matchup: CwlFutureMatchup,
  currentRound: number
): boolean {
  return (
    matchup.round >
    currentRound
  );
}

/*
 * Zoek alle toekomstige matchups van
 * een bepaalde clan.
 */
export function getFutureOpponents(
  clanTag: string,
  matchups: CwlFutureMatchup[]
): CwlFutureMatchup[] {
  const normalized =
    normalizeTag(
      clanTag
    );

  return matchups.filter(
    (matchup) =>
      normalizeTag(
        matchup.clanATag
      ) === normalized ||
      normalizeTag(
        matchup.clanBTag
      ) === normalized
  );
}

/*
 * Geef de tegenstander terug van een matchup.
 */
export function getOpponentTag(
  clanTag: string,
  matchup: CwlFutureMatchup
): string | null {
  const normalized =
    normalizeTag(
      clanTag
    );

  if (
    normalizeTag(
      matchup.clanATag
    ) === normalized
  ) {
    return matchup.clanBTag;
  }

  if (
    normalizeTag(
      matchup.clanBTag
    ) === normalized
  ) {
    return matchup.clanATag;
  }

  return null;
}

/*
 * Hoeveel aanvallen zijn beschikbaar
 * per war?
 *
 * 15v15 = 15 aanvallen
 * 30v30 = 30 aanvallen
 */
export function getAvailableAttacks(
  clan: CwlClanStats
): number {
  return clan.warSize;
}

/*
 * Hoeveel aanvallen zijn momenteel
 * gebruikt in de lopende war?
 */
export function getCurrentAttacksUsed(
  clan: CwlClanStats
): number {
  const currentWar =
    clan.warHistory.find(
      (war) =>
        war.state ===
        "inWar"
    );

  if (!currentWar) {
    return 0;
  }

  return currentWar.attacksUsed;
}

/*
 * Hoeveel aanvallen zijn nog beschikbaar
 * in de lopende war?
 */
export function getCurrentAttacksRemaining(
  clan: CwlClanStats
): number {
  const currentWar =
    clan.warHistory.find(
      (war) =>
        war.state ===
        "inWar"
    );

  if (!currentWar) {
    return 0;
  }

  return Math.max(
    0,
    currentWar.attacksRemaining
  );
}

/*
 * Totaal aantal toekomstige aanvallen.
 */
export function getTotalFutureAttacks(
  clan: CwlClanStats
): number {
  let attacks = 0;

  attacks +=
    getCurrentAttacksRemaining(
      clan
    );

  attacks +=
    clan.remainingWars *
    getAvailableAttacks(
      clan
    );

  return attacks;
}

/*
 * Hoeveel toekomstige wars heeft deze clan?
 */
export function getFutureWarCount(
  clan: CwlClanStats
): number {
  return (
    clan.currentWars +
    clan.remainingWars
  );
}

/*
 * Verwacht aantal sterren per war.
 */
export function getExpectedStarsPerWar(
  clan: CwlClanStats
): number {
  const completedWars =
    clan.warHistory.filter(
      (war) =>
        war.state ===
        "warEnded"
    );

  if (
    completedWars.length === 0
  ) {
    return clan.warSize === 30
      ? 75
      : 38;
  }

  const total =
    completedWars.reduce(
      (sum, war) =>
        sum + war.stars,
      0
    );

  return (
    total /
    completedWars.length
  );
}

/*
 * Verwachte destruction per war.
 */
export function getExpectedDestructionPerWar(
  clan: CwlClanStats
): number {
  const completedWars =
    clan.warHistory.filter(
      (war) =>
        war.state ===
        "warEnded"
    );

  if (
    completedWars.length === 0
  ) {
    return 85;
  }

  const total =
    completedWars.reduce(
      (sum, war) =>
        sum + war.destruction,
      0
    );

  return (
    total /
    completedWars.length
  );
}

/*
 * Recente vorm van een clan.
 *
 * Positief = recente prestaties beter
 * dan oudere prestaties.
 */
export function getRecentForm(
  clan: CwlClanStats
): number {
  const completedWars =
    clan.warHistory.filter(
      (war) =>
        war.state ===
        "warEnded"
    );

  if (
    completedWars.length < 2
  ) {
    return 0;
  }

  const recentCount =
    Math.min(
      2,
      completedWars.length
    );

  const recent =
    completedWars.slice(
      -recentCount
    );

  const older =
    completedWars.slice(
      0,
      completedWars.length -
        recentCount
    );

  if (
    older.length === 0
  ) {
    return 0;
  }

  const recentAverage =
    recent.reduce(
      (sum, war) =>
        sum + war.stars,
      0
    ) /
    recent.length;

  const olderAverage =
    older.reduce(
      (sum, war) =>
        sum + war.stars,
      0
    ) /
    older.length;

  return (
    recentAverage -
    olderAverage
  );
}

/*
 * Maak een uitgebreid profiel van één clan.
 */
export function buildClanPredictionProfile(
  clan: CwlClanStats
) {
  return {
    tag:
      clan.tag,

    name:
      clan.name,

    warSize:
      clan.warSize,

    currentScore:
      clan.totalStars,

    currentStars:
      clan.stars,

    bonusStars:
      clan.bonusStars,

    destruction:
      clan.destruction,

    completedWars:
      clan.completedWars,

    currentWars:
      clan.currentWars,

    remainingWars:
      clan.remainingWars,

    futureWarCount:
      getFutureWarCount(
        clan
      ),

    currentAttacksUsed:
      getCurrentAttacksUsed(
        clan
      ),

    currentAttacksRemaining:
      getCurrentAttacksRemaining(
        clan
      ),

    totalFutureAttacks:
      getTotalFutureAttacks(
        clan
      ),

    expectedStarsPerWar:
      getExpectedStarsPerWar(
        clan
      ),

    expectedDestructionPerWar:
      getExpectedDestructionPerWar(
        clan
      ),

    recentForm:
      getRecentForm(
        clan
      ),
  };
}

/*
 * Bouw profielen voor alle clans.
 */
export function buildAllClanProfiles(
  clans: CwlClanStats[]
) {
  return clans.map(
    buildClanPredictionProfile
  );
}

/*
 * Controleer of de prediction-input
 * compleet genoeg is.
 */
export function validatePredictionInput(
  input: CwlPredictionInput
): {
  valid: boolean;
  reason?: string;
} {
  if (
    input.clans.length === 0
  ) {
    return {
      valid: false,
      reason:
        "Geen CWL-clans beschikbaar.",
    };
  }

  const target =
    findClan(
      input.clans,
      input.targetClanTag
    );

  if (!target) {
    return {
      valid: false,
      reason:
        "Doelclan niet gevonden.",
    };
  }

  if (
    input.promotionSlots <=
    0
  ) {
    return {
      valid: false,
      reason:
        "Geen promotieplaatsen gevonden.",
    };
  }

  return {
    valid: true,
  };
}

/*
 * Maak een leeg/ongeldig prediction-resultaat.
 *
 * Dit gebruikt hetzelfde volledige
 * CwlSimulationResult-contract als de
 * normale simulator.
 */
function createInvalidPredictionResult(
  promotionSlots: number
): CwlSimulationResult {
  return {
    promotionChance: 0,

    maximumPromotionChance: 0,

    simulations: 0,

    promotions: 0,

    currentPosition: 0,

    promotionSlots,

    currentScore: 0,

    maximumPossibleScore: 0,

    promotionStatus:
      "IMPOSSIBLE",

    clansToPass: 0,

    maxClansCanPass: 0,

    bestPossiblePosition: 0,

    worstPossiblePosition: 0,
  };
}

/*
 * ------------------------------------------------
 * CWL PREDICTION ENGINE
 * ------------------------------------------------
 *
 * Deze functie vormt de brug tussen de
 * echte CWL-data en de simulatie-engine.
 *
 * De daadwerkelijke berekening blijft
 * volledig in simulation.ts.
 */
export function runCwlPrediction(
  input: CwlPredictionInput,
  simulations = 20_000
): CwlSimulationResult {
  const validation =
    validatePredictionInput(
      input
    );

  if (
    !validation.valid
  ) {
    return createInvalidPredictionResult(
      input.promotionSlots
    );
  }

  /*
   * Bouw de profielen één keer.
   *
   * De huidige deterministische simulator
   * gebruikt deze profielen niet rechtstreeks
   * voor de mathematische grensberekening,
   * maar deze stap blijft bewust aanwezig
   * als centrale profielopbouw voor Phoenix.
   */
  buildAllClanProfiles(
    input.clans
  );

  /*
   * Alleen matchups waarvan beide clans
   * daadwerkelijk in onze CWL-groep zitten.
   */
  const futureMatchups =
    input.futureMatchups.filter(
      (matchup) => {
        const clanA =
          findClan(
            input.clans,
            matchup.clanATag
          );

        const clanB =
          findClan(
            input.clans,
            matchup.clanBTag
          );

        return (
          clanA !== undefined &&
          clanB !== undefined
        );
      }
    );

  /*
   * Geef de volledige matchup-route
   * door aan de simulator.
   *
   * simulation.ts bepaalt vervolgens:
   *
   * - huidige positie
   * - gegarandeerde promotie
   * - mogelijke promotie
   * - onmogelijke promotie
   * - beste positie
   * - slechtste positie
   * - maximaal haalbare score
   */
  return simulatePromotionChance(
    input.clans,
    input.targetClanTag,
    input.promotionSlots,
    futureMatchups,
    simulations
  );
}