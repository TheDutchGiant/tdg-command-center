export type CwlMaximumScoreInput = {
  totalStars: number;
  attacksRemaining: number;
  maximumAdditionalStars: number;
  canStillWinWar: boolean;
};

export function getAbsoluteMaximumScore(
  input: CwlMaximumScoreInput
): number {
  const additionalStars = Math.max(
    0,
    input.maximumAdditionalStars
  );

  const possibleBonus =
    input.canStillWinWar ? 10 : 0;

  return (
    input.totalStars +
    additionalStars +
    possibleBonus
  );
}

export function canCompetitorPass(
  competitorMaximumScore: number,
  protectedScore: number
): boolean {
  return competitorMaximumScore > protectedScore;
}
