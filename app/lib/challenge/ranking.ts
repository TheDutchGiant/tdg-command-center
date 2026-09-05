import { prisma } from "@/app/lib/prisma";

type RankingItem = {
  id: number;
  stars: number;
  destruction: number;
  timeSeconds: number | null;
};

function compareResults(
  a: RankingItem,
  b: RankingItem,
) {
  if (a.stars !== b.stars) {
    return b.stars - a.stars;
  }

  if (a.destruction !== b.destruction) {
    return b.destruction - a.destruction;
  }

  if (a.timeSeconds === null && b.timeSeconds !== null) {
    return 1;
  }

  if (a.timeSeconds !== null && b.timeSeconds === null) {
    return -1;
  }

  if (
    a.timeSeconds !== null &&
    b.timeSeconds !== null &&
    a.timeSeconds !== b.timeSeconds
  ) {
    return a.timeSeconds - b.timeSeconds;
  }

  return a.id - b.id;
}

export async function recalculateChallengeRanking(
  challengeId: number,
  difficulty: string,
) {
  const results =
    await prisma.randomChallengeResult.findMany({
      where: {
        randomChallengeId: challengeId,
        entry: {
          difficulty,
          status: "APPROVED",
        },
      },
      select: {
        id: true,
        stars: true,
        destruction: true,
        timeSeconds: true,
      },
    });

  results.sort(compareResults);

  await prisma.$transaction(
    results.map((result, index) =>
      prisma.randomChallengeResult.update({
        where: {
          id: result.id,
        },
        data: {
          rank: index + 1,
        },
      }),
    ),
  );

  return results.map((result, index) => ({
    ...result,
    rank: index + 1,
  }));
}

export async function getChallengeRanking(
  challengeId: number,
  difficulty: string,
) {
  const results =
    await prisma.randomChallengeResult.findMany({
      where: {
        randomChallengeId: challengeId,
        entry: {
          difficulty,
          status: "APPROVED",
        },
      },
      select: {
        id: true,
        stars: true,
        destruction: true,
        timeSeconds: true,
        rank: true,
        entry: {
          select: {
            id: true,
            playerTag: true,
            playerName: true,
            difficulty: true,
          },
        },
      },
      orderBy: {
        rank: "asc",
      },
    });

  return results;
}
