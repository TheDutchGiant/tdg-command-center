import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const difficulties = [
  { key: "EASY", label: "Easy", icon: "🟢" },
  { key: "MEDIUM", label: "Medium", icon: "🟡" },
  { key: "HARD", label: "Hard", icon: "🔴" },
];

function formatTime(seconds: number | null) {
  if (seconds === null) return "—";

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function compareResults(
  a: {
    stars: number;
    destruction: number;
    timeSeconds: number | null;
    id: number;
  },
  b: {
    stars: number;
    destruction: number;
    timeSeconds: number | null;
    id: number;
  },
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

export default async function ChallengeLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    challengeId?: string;
  }>;
}) {
  const params = await searchParams;

  const challenges = await prisma.randomChallenge.findMany({
    where: {
      status: {
        not: "DRAFT",
      },
    },
    orderBy: {
      startsAt: "desc",
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      status: true,
    },
  });

  const requestedChallengeId = Number(params.challengeId);

  const challenge =
    challenges.find(
      (item) => item.id === requestedChallengeId,
    ) ??
    challenges[0] ??
    null;

  const challengeResults = challenge
    ? await prisma.randomChallengeResult.findMany({
        where: {
          randomChallengeId: challenge.id,
          entry: {
            status: "APPROVED",
          },
        },
        select: {
          id: true,
          stars: true,
          destruction: true,
          timeSeconds: true,
          entry: {
            select: {
              playerTag: true,
              playerName: true,
              difficulty: true,
            },
          },
        },
      })
    : [];

  /*
   * ------------------------------------------------------------
   * RANKING PER MOEILIJKHEID
   * ------------------------------------------------------------
   *
   * Alleen goedgekeurde resultaten tellen mee.
   *
   * Volgorde:
   * 1. ⭐ meeste sterren
   * 2. 💥 hoogste destruction
   * 3. ⏱️ snelste tijd
   */
  const rankings = new Map<
    string,
    typeof challengeResults
  >();

  for (const difficulty of difficulties) {
    const ranking = challengeResults
      .filter(
        (result) =>
          result.entry.difficulty === difficulty.key,
      )
      .sort(compareResults);

    rankings.set(difficulty.key, ranking);
  }

  /*
   * ------------------------------------------------------------
   * OVERALL HALL OF FAME
   * ------------------------------------------------------------
   */
  const overallResults =
    await prisma.randomChallengeResult.findMany({
      where: {
        entry: {
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
            playerTag: true,
            playerName: true,
            difficulty: true,
          },
        },
      },
    });

  const hallOfFame = new Map<
    string,
    {
      playerTag: string;
      playerName: string;
      firstPlaces: number;
      threeStars: number;
      perfect: number;
      participation: number;
    }
  >();

  for (const result of overallResults) {
    const tag = result.entry.playerTag;
    const existing = hallOfFame.get(tag);

    if (existing) {
      existing.participation += 1;

      if (result.stars === 3) {
        existing.threeStars += 1;
      }

      if (result.destruction === 100) {
        existing.perfect += 1;
      }

      if (result.rank === 1) {
        existing.firstPlaces += 1;
      }
    } else {
      hallOfFame.set(tag, {
        playerTag: tag,
        playerName: result.entry.playerName,
        firstPlaces: result.rank === 1 ? 1 : 0,
        threeStars: result.stars === 3 ? 1 : 0,
        perfect:
          result.destruction === 100 ? 1 : 0,
        participation: 1,
      });
    }
  }

  const hallOfFameRanking = Array.from(
    hallOfFame.values(),
  ).sort((a, b) => {
    if (a.firstPlaces !== b.firstPlaces) {
      return b.firstPlaces - a.firstPlaces;
    }

    if (a.threeStars !== b.threeStars) {
      return b.threeStars - a.threeStars;
    }

    if (a.perfect !== b.perfect) {
      return b.perfect - a.perfect;
    }

    if (a.participation !== b.participation) {
      return b.participation - a.participation;
    }

    return a.playerName.localeCompare(b.playerName);
  });

  /*
   * ------------------------------------------------------------
   * GEK VAN DE WEEK
   * ------------------------------------------------------------
   */
  const now = new Date();

  const startOfWeek = new Date(now);

  const day = startOfWeek.getDay();

  const daysSinceMonday =
    day === 0 ? 6 : day - 1;

  startOfWeek.setDate(
    startOfWeek.getDate() - daysSinceMonday,
  );

  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);

  endOfWeek.setDate(
    endOfWeek.getDate() + 7,
  );

  const weeklyResults =
    await prisma.randomChallengeResult.findMany({
      where: {
        entry: {
          status: "APPROVED",
          submittedAt: {
            gte: startOfWeek,
            lt: endOfWeek,
          },
        },
      },
      select: {
        stars: true,
        destruction: true,
        timeSeconds: true,
        entry: {
          select: {
            playerTag: true,
            playerName: true,
            difficulty: true,
          },
        },
      },
    });

  const weeklyPlayers = new Map<
    string,
    {
      playerTag: string;
      playerName: string;
      difficulties: Set<string>;
      score: number;
      threeStars: number;
      perfect: number;
    }
  >();

  for (const result of weeklyResults) {
    const tag = result.entry.playerTag;

    const existing = weeklyPlayers.get(tag);

    const score =
      result.stars * 100 +
      result.destruction;

    if (existing) {
      existing.difficulties.add(
        result.entry.difficulty,
      );

      existing.score += score;

      if (result.stars === 3) {
        existing.threeStars += 1;
      }

      if (result.destruction === 100) {
        existing.perfect += 1;
      }
    } else {
      weeklyPlayers.set(tag, {
        playerTag: tag,
        playerName: result.entry.playerName,
        difficulties: new Set([
          result.entry.difficulty,
        ]),
        score,
        threeStars:
          result.stars === 3 ? 1 : 0,
        perfect:
          result.destruction === 100 ? 1 : 0,
      });
    }
  }

  const weeklyRanking = Array.from(
    weeklyPlayers.values(),
  )
    .filter(
      (player) =>
        player.difficulties.has("EASY") &&
        player.difficulties.has("MEDIUM") &&
        player.difficulties.has("HARD"),
    )
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      if (a.threeStars !== b.threeStars) {
        return b.threeStars - a.threeStars;
      }

      if (a.perfect !== b.perfect) {
        return b.perfect - a.perfect;
      }

      return a.playerName.localeCompare(
        b.playerName,
      );
    });

  return (
    <main className="min-h-screen bg-neutral-950 px-3 py-5 text-white sm:px-5 sm:py-8">
      {challenge?.status === "ACTIVE" && (
        <meta httpEquiv="refresh" content="15" />
      )}
      {challenge?.status === "ACTIVE" && (
        <meta httpEquiv="refresh" content="15" />
      )}
      <div className="mx-auto max-w-5xl">

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

          <a
            href="/challenge"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/50 hover:bg-white/[0.06] hover:text-white"
          >
            ⬅️ Challenge
          </a>

          {challenge && (
            <form method="GET">
              <select
                name="challengeId"
                defaultValue={String(challenge.id)}
                onChange={(event) => {
                  window.location.href =
                    `/challenge/leaderboard?challengeId=${event.target.value}`;
                }}
                className="max-w-[240px] rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-bold text-white outline-none"
              >
                {challenges.map((item) => (
                  <option
                    key={item.id}
                    value={String(item.id)}
                  >
                    {item.title}
                    {item.status === "ACTIVE"
                      ? " — huidige"
                      : ""}
                  </option>
                ))}
              </select>
            </form>
          )}

        </div>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">

          <div className="border-b border-white/10 px-4 py-4">

            <div className="flex flex-wrap items-start justify-between gap-3">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/60">
                  TDG Phoenix
                </p>

                <h1 className="mt-1 text-xl font-black sm:text-2xl">
                  🏆 Challenge Leaderboard
                </h1>

                {challenge && (
                  <p className="mt-1 text-xs text-white/30">
                    {challenge.title}
                  </p>
                )}
              </div>

              {challenge?.status === "ACTIVE" && (
                <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    Live
                  </span>
                </div>
              )}

            </div>

            {challenge?.status === "ACTIVE" && (
              <p className="mt-3 text-[10px] text-white/25">
                Het leaderboard wordt bijgewerkt zodra een
                inzending is goedgekeurd.
              </p>
            )}

          </div>

          {!challenge ? (
            <div className="px-4 py-10 text-center text-sm text-white/30">
              Nog geen Challenges beschikbaar.
            </div>
          ) : (
            <div className="space-y-4 p-3 sm:p-5">

              {difficulties.map((difficulty) => {
                const ranking =
                  rankings.get(difficulty.key) ?? [];

                return (
                  <section
                    key={difficulty.key}
                    className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
                  >

                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">

                      <div className="flex items-center gap-2">
                        <span>
                          {difficulty.icon}
                        </span>

                        <h2 className="text-xs font-black uppercase tracking-[0.14em]">
                          {difficulty.label}
                        </h2>
                      </div>

                      <span className="text-[10px] font-bold text-white/25">
                        {ranking.length} deelnemers
                      </span>

                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">

                        <thead>
                          <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-wider text-white/20">

                            <th className="w-10 px-2 py-2 text-center">
                              #
                            </th>

                            <th className="px-2 py-2 text-left">
                              Speler
                            </th>

                            <th className="w-12 px-2 py-2 text-center">
                              ⭐
                            </th>

                            <th className="w-16 px-2 py-2 text-center">
                              💥
                            </th>

                            <th className="w-16 px-2 py-2 text-center">
                              ⏱️
                            </th>

                          </tr>
                        </thead>

                        <tbody>

                          {ranking.map(
                            (result, index) => (
                              <tr
                                key={result.id}
                                className={`border-b border-white/5 last:border-0 ${
                                  index < 3
                                    ? "bg-white/[0.025]"
                                    : ""
                                }`}
                              >

                                <td className="px-2 py-1.5 text-center text-xs font-black text-white/40">
                                  {index === 0
                                    ? "🥇"
                                    : index === 1
                                      ? "🥈"
                                      : index === 2
                                        ? "🥉"
                                        : index + 1}
                                </td>

                                <td className="max-w-[190px] truncate px-2 py-1.5 text-xs font-bold">
                                  {
                                    result.entry.playerName
                                  }
                                </td>

                                <td className="px-2 py-1.5 text-center text-xs font-black">
                                  {result.stars}
                                </td>

                                <td className="px-2 py-1.5 text-center text-xs font-black">
                                  {result.destruction}%
                                </td>

                                <td className="px-2 py-1.5 text-center text-xs font-black text-white/50">
                                  {formatTime(
                                    result.timeSeconds,
                                  )}
                                </td>

                              </tr>
                            ),
                          )}

                          {ranking.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-3 py-5 text-center text-xs text-white/25"
                              >
                                Nog geen goedgekeurde
                                resultaten.
                              </td>
                            </tr>
                          )}

                        </tbody>
                      </table>
                    </div>

                  </section>
                );
              })}

              <section className="overflow-hidden rounded-xl border border-emerald-400/20 bg-emerald-400/[0.03]">

                <div className="flex items-center justify-between border-b border-emerald-400/10 px-3 py-3">

                  <div>
                    <h2 className="text-sm font-black">
                      🤪 Gek van de Week
                    </h2>

                    <p className="mt-0.5 text-[10px] text-white/25">
                      Beste gecombineerde prestatie over
                      alle drie de moeilijkheden.
                    </p>
                  </div>

                  <span className="text-xl">
                    🏆
                  </span>

                </div>

                {weeklyRanking.length === 0 ? (
                  <div className="px-3 py-5 text-center text-xs text-white/25">
                    Nog niemand heeft deze week alle drie
                    de Challenges afgerond.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">

                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-wider text-white/20">

                          <th className="w-10 px-2 py-2 text-center">
                            #
                          </th>

                          <th className="px-2 py-2 text-left">
                            Speler
                          </th>

                          <th className="w-16 px-2 py-2 text-center">
                            ⭐ 3⭐
                          </th>

                          <th className="w-16 px-2 py-2 text-center">
                            💯
                          </th>

                          <th className="w-20 px-2 py-2 text-center">
                            Score
                          </th>

                        </tr>
                      </thead>

                      <tbody>
                        {weeklyRanking
                          .slice(0, 3)
                          .map((player, index) => (
                            <tr
                              key={player.playerTag}
                              className="border-b border-white/5 last:border-0"
                            >

                              <td className="px-2 py-1.5 text-center text-xs font-black">
                                {index === 0
                                  ? "🥇"
                                  : index === 1
                                    ? "🥈"
                                    : "🥉"}
                              </td>

                              <td className="px-2 py-1.5 text-xs font-bold">
                                {player.playerName}
                              </td>

                              <td className="px-2 py-1.5 text-center text-xs font-black">
                                {player.threeStars}
                              </td>

                              <td className="px-2 py-1.5 text-center text-xs font-black">
                                {player.perfect}
                              </td>

                              <td className="px-2 py-1.5 text-center text-xs font-black text-emerald-300">
                                {player.score}
                              </td>

                            </tr>
                          ))}
                      </tbody>

                    </table>
                  </div>
                )}

              </section>

              <section className="overflow-hidden rounded-xl border border-orange-400/20 bg-orange-400/[0.03]">

                <div className="border-b border-orange-400/10 px-3 py-3">

                  <h2 className="text-sm font-black">
                    🏛️ Hall of Fame
                  </h2>

                  <p className="mt-0.5 text-[10px] text-white/25">
                    Permanente overall statistieken.
                  </p>

                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">

                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-wider text-white/20">

                        <th className="w-10 px-2 py-2 text-center">
                          #
                        </th>

                        <th className="px-2 py-2 text-left">
                          Speler
                        </th>

                        <th className="w-14 px-2 py-2 text-center">
                          🥇 #1
                        </th>

                        <th className="w-14 px-2 py-2 text-center">
                          ⭐ 3⭐
                        </th>

                        <th className="w-14 px-2 py-2 text-center">
                          💯
                        </th>

                        <th className="w-16 px-2 py-2 text-center">
                          🎲
                        </th>

                      </tr>
                    </thead>

                    <tbody>
                      {hallOfFameRanking
                        .slice(0, 20)
                        .map((player, index) => (
                          <tr
                            key={player.playerTag}
                            className="border-b border-white/5 last:border-0"
                          >

                            <td className="px-2 py-1.5 text-center text-xs font-black text-white/40">
                              {index + 1}
                            </td>

                            <td className="px-2 py-1.5 text-xs font-bold">
                              {player.playerName}
                            </td>

                            <td className="px-2 py-1.5 text-center text-xs font-black">
                              {player.firstPlaces}
                            </td>

                            <td className="px-2 py-1.5 text-center text-xs font-black">
                              {player.threeStars}
                            </td>

                            <td className="px-2 py-1.5 text-center text-xs font-black">
                              {player.perfect}
                            </td>

                            <td className="px-2 py-1.5 text-center text-xs font-black text-white/50">
                              {player.participation}
                            </td>

                          </tr>
                        ))}
                    </tbody>

                  </table>
                </div>

              </section>

              <div className="flex flex-wrap items-center justify-between gap-2 px-1">

                <p className="text-[9px] text-white/20">
                  Ranking: ⭐ sterren → 💥 vernietiging →
                  ⏱️ snelste tijd
                </p>

                {challenge.status === "ACTIVE" && (
                  <p className="text-[9px] font-bold text-emerald-400/50">
                    🟢 Live tijdens de Challenge
                  </p>
                )}

              </div>

            </div>
          )}

        </section>
      </div>
    </main>
  );
}
