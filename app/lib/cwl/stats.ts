import type {
  CwlClanStats,
  CwlWarPerformance,
} from "./types";

/*
 * Gemiddelde sterren per afgesloten war.
 */
export function getAverageStars(
  wars: CwlWarPerformance[]
): number {
  const completedWars =
    wars.filter(
      (war) =>
        war.state === "warEnded"
    );

  if (completedWars.length === 0) {
    return 0;
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
 * Gemiddelde destruction per afgesloten war.
 */
export function getAverageDestruction(
  wars: CwlWarPerformance[]
): number {
  const completedWars =
    wars.filter(
      (war) =>
        war.state === "warEnded"
    );

  if (completedWars.length === 0) {
    return 0;
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
 * Gemiddeld aantal gebruikte aanvallen
 * per afgesloten war.
 */
export function getAverageAttacksUsed(
  wars: CwlWarPerformance[]
): number {
  const completedWars =
    wars.filter(
      (war) =>
        war.state === "warEnded"
    );

  if (completedWars.length === 0) {
    return 0;
  }

  const total =
    completedWars.reduce(
      (sum, war) =>
        sum + war.attacksUsed,
      0
    );

  return (
    total /
    completedWars.length
  );
}

/*
 * Gemiddeld aantal sterren per gebruikte aanval.
 *
 * Dit is belangrijk voor de simulator.
 */
export function getAverageStarsPerAttack(
  wars: CwlWarPerformance[]
): number {
  const completedWars =
    wars.filter(
      (war) =>
        war.state === "warEnded"
    );

  let totalStars = 0;
  let totalAttacks = 0;

  for (
    const war of completedWars
  ) {
    totalStars += war.stars;
    totalAttacks +=
      war.attacksUsed;
  }

  if (totalAttacks === 0) {
    return 0;
  }

  return (
    totalStars /
    totalAttacks
  );
}

/*
 * Gemiddelde destruction per aanval.
 */
export function getAverageDestructionPerAttack(
  wars: CwlWarPerformance[]
): number {
  const completedWars =
    wars.filter(
      (war) =>
        war.state === "warEnded"
    );

  let totalDestruction = 0;
  let totalAttacks = 0;

  for (
    const war of completedWars
  ) {
    totalDestruction +=
      war.destruction;

    totalAttacks +=
      war.attacksUsed;
  }

  if (totalAttacks === 0) {
    return 0;
  }

  return (
    totalDestruction /
    totalAttacks
  );
}

/*
 * Bepaal de standaardafwijking van sterren.
 *
 * Dit geeft de simulator een idee hoeveel een
 * clan normaal gesproken kan variëren.
 */
export function getStarsStandardDeviation(
  wars: CwlWarPerformance[]
): number {
  const completedWars =
    wars.filter(
      (war) =>
        war.state === "warEnded"
    );

  if (
    completedWars.length < 2
  ) {
    return 0;
  }

  const average =
    getAverageStars(
      completedWars
    );

  const squaredDifferences =
    completedWars.map(
      (war) =>
        Math.pow(
          war.stars -
            average,
          2
        )
    );

  const variance =
    squaredDifferences.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    completedWars.length;

  return Math.sqrt(
    variance
  );
}

/*
 * Bepaal hoeveel aanvallen een clan gemiddeld
 * gebruikt voordat een war eindigt.
 */
export function getAverageAttackUsage(
  wars: CwlWarPerformance[]
): number {
  const completedWars =
    wars.filter(
      (war) =>
        war.state === "warEnded"
    );

  if (completedWars.length === 0) {
    return 0;
  }

  const total =
    completedWars.reduce(
      (sum, war) =>
        sum +
        war.attacksUsed,
      0
    );

  return (
    total /
    completedWars.length
  );
}

/*
 * Bepaal hoe snel een clan zijn aanvallen gebruikt.
 *
 * Voor nu gebruiken we simpelweg het percentage
 * gebruikte aanvallen van de beschikbare aanvallen.
 *
 * Later kunnen we hier tijdstempels aan toevoegen
 * zodat Phoenix ook werkelijk aanvalstempo kan leren.
 */
export function getAttackUsageRate(
  war: CwlWarPerformance
): number {
  if (
    war.attacksAvailable <= 0
  ) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(
      0,
      war.attacksUsed /
        war.attacksAvailable
    )
  );
}

/*
 * Verwachte sterren uit de resterende aanvallen.
 *
 * Dit is één van de belangrijkste waarden voor
 * de toekomstige simulatie.
 */
export function getExpectedRemainingStars(
  clan: CwlClanStats,
  war: CwlWarPerformance
): number {
  if (
    war.attacksRemaining <= 0
  ) {
    return 0;
  }

  const averageStarsPerAttack =
    getAverageStarsPerAttack(
      clan.warHistory
    );

  /*
   * Als we nog geen historische aanvallen
   * hebben, gebruiken we een neutrale waarde.
   *
   * 2 sterren per aanval is een veilige
   * uitgangswaarde.
   */
  const starsPerAttack =
    averageStarsPerAttack > 0
      ? averageStarsPerAttack
      : 2;

  return (
    war.attacksRemaining *
    starsPerAttack
  );
}

/*
 * Maak een compact statistiekobject voor
 * de prediction engine.
 */
export function buildClanPredictionStats(
  clan: CwlClanStats
) {
  const completedWars =
    clan.warHistory.filter(
      (war) =>
        war.state === "warEnded"
    );

  const currentWars =
    clan.warHistory.filter(
      (war) =>
        war.state === "inWar"
    );

  const averageStars =
    getAverageStars(
      clan.warHistory
    );

  const averageDestruction =
    getAverageDestruction(
      clan.warHistory
    );

  const averageAttacksUsed =
    getAverageAttacksUsed(
      clan.warHistory
    );

  const averageStarsPerAttack =
    getAverageStarsPerAttack(
      clan.warHistory
    );

  const averageDestructionPerAttack =
    getAverageDestructionPerAttack(
      clan.warHistory
    );

  const starsStandardDeviation =
    getStarsStandardDeviation(
      clan.warHistory
    );

  /*
   * Bereken resterend potentieel tijdens
   * lopende wars.
   */
  let expectedRemainingStars = 0;

  for (
    const war of currentWars
  ) {
    expectedRemainingStars +=
      getExpectedRemainingStars(
        clan,
        war
      );
  }

  return {
    tag: clan.tag,
    name: clan.name,

    warSize:
      clan.warSize,

    currentStars:
      clan.stars,

    bonusStars:
      clan.bonusStars,

    totalStars:
      clan.totalStars,

    destruction:
      clan.destruction,

    completedWars:
      clan.completedWars,

    currentWars:
      clan.currentWars,

    remainingWars:
      clan.remainingWars,

    averageStars,

    averageDestruction,

    averageAttacksUsed,

    averageStarsPerAttack,

    averageDestructionPerAttack,

    starsStandardDeviation,

    expectedRemainingStars,

    completedWarCount:
      completedWars.length,

    currentWarCount:
      currentWars.length,
  };
}