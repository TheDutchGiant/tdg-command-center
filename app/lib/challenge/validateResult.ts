export type ChallengeValidationInput = {
  stars: number;
  destruction: number;
  timeSeconds: number | null;
  screenshotDetected: boolean;
};

export type ChallengeValidationResult = {
  valid: boolean;
  needsReview: boolean;
  reason: string | null;
  score: number;
};

const MAX_STARS = 3;
const MIN_DESTRUCTION = 0;
const MAX_DESTRUCTION = 100;

function calculateScore(
  stars: number,
  destruction: number,
  timeSeconds: number | null
): number {
  /*
   * Basis:
   * - sterren zijn het belangrijkste onderdeel
   * - destruction is de tiebreaker
   * - tijd is alleen relevant wanneer beschikbaar
   *
   * 3 sterren = maximaal 300 punten
   * destruction = maximaal 100 punten
   * snellere aanval = kleine bonus
   */
  let score =
    stars * 100 +
    destruction;

  if (
    timeSeconds !== null &&
    timeSeconds >= 0
  ) {
    const timeBonus = Math.max(
      0,
      100 - timeSeconds / 10
    );

    score += timeBonus;
  }

  return Math.round(score * 100) / 100;
}

export function validateChallengeResult(
  input: ChallengeValidationInput
): ChallengeValidationResult {
  if (!input.screenshotDetected) {
    return {
      valid: false,
      needsReview: true,
      reason:
        "Phoenix kon geen geldig challenge-resultaat uit de inzending halen.",
      score: 0,
    };
  }

  if (
    !Number.isInteger(input.stars) ||
    input.stars < 0 ||
    input.stars > MAX_STARS
  ) {
    return {
      valid: false,
      needsReview: true,
      reason:
        "Ongeldig aantal sterren.",
      score: 0,
    };
  }

  if (
    !Number.isFinite(
      input.destruction
    ) ||
    input.destruction <
      MIN_DESTRUCTION ||
    input.destruction >
      MAX_DESTRUCTION
  ) {
    return {
      valid: false,
      needsReview: true,
      reason:
        "Ongeldig vernietigingspercentage.",
      score: 0,
    };
  }

  if (
    input.timeSeconds !== null &&
    (
      !Number.isFinite(
        input.timeSeconds
      ) ||
      input.timeSeconds < 0
    )
  ) {
    return {
      valid: false,
      needsReview: true,
      reason:
        "Ongeldige aanvalstijd.",
      score: 0,
    };
  }

  /*
   * Clash-resultaat moet logisch overeenkomen:
   *
   * - 3 sterren betekent altijd 100%
   * - 100% betekent altijd 3 sterren
   * - 0, 1 of 2 sterren kan nooit 100% zijn
   */
  if (
    (input.stars === 3 &&
      input.destruction !== 100) ||
    (input.destruction === 100 &&
      input.stars !== 3) ||
    (input.stars < 3 &&
      input.destruction === 100)
  ) {
    return {
      valid: false,
      needsReview: true,
      reason:
        "Resultaat bevat een onmogelijke combinatie van sterren en vernietiging.",
      score: 0,
    };
  }

  return {
    valid: true,
    needsReview: false,
    reason: null,
    score: calculateScore(
      input.stars,
      input.destruction,
      input.timeSeconds
    ),
  };
}
