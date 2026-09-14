import Link from "next/link";
import { prisma } from "@/app/lib/prisma";
import getClan from "@/app/lib/getClan";

type PageProps = {
  params: Promise<{
    tag: string;
    playerTag: string;
  }>;
};

export default async function PlayerPage({ params }: PageProps) {
  const { tag, playerTag } = await params;

  const clan = await getClan(tag);
  const decodedPlayerTag = decodeURIComponent(playerTag);

  const player = clan.memberList.find(
    (member: { tag: string }) => member.tag === decodedPlayerTag
  );

  if (!player) {
    return (
      <section className="space-y-4">
        <Link
          href={`/clan/${tag}/members`}
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          ← Terug naar leden
        </Link>

        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-5">
          <h1 className="text-xl font-bold text-white">
            Speler niet gevonden
          </h1>

          <p className="mt-1 text-sm text-neutral-400">
            Deze speler zit niet meer in deze clan of staat niet in de huidige
            ledenlijst.
          </p>
        </div>
      </section>
    );
  }

  const [
    regularWarRows,
    cwlHistoryRows,
    careerEvents,
    cwlApplications,
    cwlAssignments,
    clanRecords,
  ] = await Promise.all([
    prisma.regularWarPlayer.findMany({
      where: {
        playerTag: decodedPlayerTag,
      },
      select: {
        attacksDone: true,
        missedAttacks: true,
        oneStars: true,
        twoStars: true,
        threeStars: true,
        totalStars: true,
        war: {
          select: {
            warTag: true,
            warEndTime: true,
            clanTag: true,
            opponentName: true,
          },
        },
      },
      orderBy: {
        war: {
          warEndTime: "desc",
        },
      },
    }),

    prisma.cwlHistoricalPlayer.findMany({
      where: {
        playerTag: decodedPlayerTag,
      },
      select: {
        warId: true,
        attacks: true,
        opponentAttacks: true,
        war: {
          select: {
            warTag: true,
            importedAt: true,
            season: true,
            round: true,
            clanTag: true,
            opponentTag: true,
          },
        },
      },
      orderBy: {
        importedAt: "desc",
      },
    }),

    prisma.careerEvent.findMany({
      where: {
        playerTag: decodedPlayerTag,
      },
      orderBy: {
        date: "desc",
      },
      take: 20,
    }),

    prisma.cwlApplication.findMany({
      where: {
        playerTag: decodedPlayerTag,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10,
    }),

    prisma.cwlAssignment.findMany({
      where: {
        playerTag: decodedPlayerTag,
      },
      include: {
        clanPlan: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),

    prisma.clan.findMany({
      select: {
        tag: true,
        name: true,
      },
    }),
  ]);

  const regularWarStats = regularWarRows.reduce(
    (stats, row) => {
      stats.wars++;
      stats.attacks += row.attacksDone;
      stats.missed += row.missedAttacks;
      stats.oneStars += row.oneStars;
      stats.twoStars += row.twoStars;
      stats.threeStars += row.threeStars;
      stats.totalStars += row.totalStars;
      return stats;
    },
    {
      wars: 0,
      attacks: 0,
      missed: 0,
      oneStars: 0,
      twoStars: 0,
      threeStars: 0,
      totalStars: 0,
    }
  );

  type CwlAttackData = {
    stars?: number;
    destructionPercentage?: number;
    destruction?: number;
  };

  type CwlStats = {
    attacks: number;
    totalStars: number;
    destruction: number;
    threeStars: number;
    twoStars: number;
    oneStars: number;
    zeroStars: number;
  };

  const cwlAttacks: CwlAttackData[] = [];

  for (const row of cwlHistoryRows) {
    if (Array.isArray(row.attacks)) {
      for (const attack of row.attacks) {
        if (
          attack &&
          typeof attack === "object" &&
          !Array.isArray(attack)
        ) {
          cwlAttacks.push(attack as CwlAttackData);
        }
      }
    }
  }

  const cwlStats = cwlAttacks.reduce<CwlStats>(
    (stats, attack) => {
      const stars = Number(attack.stars ?? 0);
      const destruction = Number(
        attack.destructionPercentage ?? attack.destruction ?? 0
      );

      stats.attacks++;
      stats.totalStars += stars;
      stats.destruction += destruction;

      if (stars === 3) stats.threeStars++;
      if (stars === 2) stats.twoStars++;
      if (stars === 1) stats.oneStars++;
      if (stars === 0) stats.zeroStars++;

      return stats;
    },
    {
      attacks: 0,
      totalStars: 0,
      destruction: 0,
      threeStars: 0,
      twoStars: 0,
      oneStars: 0,
      zeroStars: 0,
    }
  );

  const regularAverageStars =
    regularWarStats.attacks > 0
      ? (regularWarStats.totalStars / regularWarStats.attacks).toFixed(2)
      : "0.00";

  const cwlAverageStars =
    cwlStats.attacks > 0
      ? (cwlStats.totalStars / cwlStats.attacks).toFixed(2)
      : "0.00";

  const cwlAverageDestruction =
    cwlStats.attacks > 0
      ? Math.round(cwlStats.destruction / cwlStats.attacks)
      : 0;

  const cwlDefenseStats = {
    attacks: 0,
    totalDestruction: 0,
    totalStars: 0,
    threeStars: 0,
    twoStars: 0,
    oneStars: 0,
    zeroStars: 0,
    attackerTownHalls: [] as number[],
  };

  for (const row of cwlHistoryRows) {
    if (!Array.isArray(row.opponentAttacks)) {
      continue;
    }

    for (const attack of row.opponentAttacks) {
      if (
        !attack ||
        typeof attack !== "object" ||
        Array.isArray(attack)
      ) {
        continue;
      }

      const data = attack as {
        stars?: number;
        destructionPercentage?: number;
        destruction?: number;
        attackerTownHall?: number;
        attackerTownhall?: number;
      };

      const stars = Number(data.stars ?? 0);
      const destruction = Number(
        data.destructionPercentage ??
        data.destruction ??
        0
      );

      const attackerTownHall = Number(
        data.attackerTownHall ??
        data.attackerTownhall ??
        0
      );

      cwlDefenseStats.attacks++;
      cwlDefenseStats.totalStars += stars;
      cwlDefenseStats.totalDestruction += destruction;

      if (stars === 3) cwlDefenseStats.threeStars++;
      if (stars === 2) cwlDefenseStats.twoStars++;
      if (stars === 1) cwlDefenseStats.oneStars++;
      if (stars === 0) cwlDefenseStats.zeroStars++;

      if (
        attackerTownHall > 0 &&
        !cwlDefenseStats.attackerTownHalls.includes(
          attackerTownHall
        )
      ) {
        cwlDefenseStats.attackerTownHalls.push(
          attackerTownHall
        );
      }
    }
  }

  const cwlDefenseAverageDestruction =
    cwlDefenseStats.attacks > 0
      ? Math.round(
          cwlDefenseStats.totalDestruction /
            cwlDefenseStats.attacks
        )
      : 0;

  const clanNameByTag = new Map(
    clanRecords.map((clanRecord) => [clanRecord.tag, clanRecord.name])
  );

  type CwlSeasonSummary = {
    season: string;
    clanTag: string;
    clanName: string;
    rounds: number;
    attacks: number;
    stars: number;
  };

  const cwlSeasons = new Map<string, CwlSeasonSummary>();

  for (const row of cwlHistoryRows) {
    const season = row.war.season;
    const clanTag = row.war.clanTag;
    const key = `${season}:${clanTag}`;

    if (!cwlSeasons.has(key)) {
      cwlSeasons.set(key, {
        season,
        clanTag,
        clanName:
          clanNameByTag.get(clanTag) ??
          (clanTag === tag ? clan.name : clanTag),
        rounds: 0,
        attacks: 0,
        stars: 0,
      });
    }

    const summary = cwlSeasons.get(key)!;

    summary.rounds++;

    if (Array.isArray(row.attacks)) {
      for (const attack of row.attacks) {
        if (
          attack &&
          typeof attack === "object" &&
          !Array.isArray(attack)
        ) {
          const data = attack as {
            stars?: number;
          };

          summary.attacks++;
          summary.stars += Number(data.stars ?? 0);
        }
      }
    }
  }

  const cwlCareer = Array.from(cwlSeasons.values()).sort((a, b) =>
    b.season.localeCompare(a.season)
  );

  const bestCwlStars = cwlCareer.reduce(
    (best, season) => Math.max(best, season.stars),
    0
  );

  const totalCwlCareerStars = cwlCareer.reduce(
    (total, season) => total + season.stars,
    0
  );

  const bestCwlSeason = cwlCareer.reduce<{
    season: string;
    clanName: string;
    stars: number;
  } | null>((best, current) => {
    if (!best || current.stars > best.stars) {
      return {
        season: current.season,
        clanName: current.clanName,
        stars: current.stars,
      };
    }

    return best;
  }, null);

  const bestRegularWar = regularWarRows.reduce<{
    opponentName: string;
    stars: number;
    warEndTime: Date;
  } | null>((best, current) => {
    if (
      !best ||
      current.totalStars > best.stars
    ) {
      return {
        opponentName: current.war.opponentName,
        stars: current.totalStars,
        warEndTime: current.war.warEndTime,
      };
    }

    return best;
  }, null);

  const allKnownAttacks: Array<{
    stars: number;
    destruction: number;
  }> = [];

  const [regularAttackRows, regularDefenseRows] =
    await Promise.all([
      prisma.regularWarAttack.findMany({
        where: {
          playerTag: decodedPlayerTag,
        },
        select: {
          stars: true,
          destruction: true,
          attackerTownHall: true,
          defenderTownHall: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      prisma.regularWarAttack.findMany({
        where: {
          defenderTag: decodedPlayerTag,
        },
        select: {
          stars: true,
          destruction: true,
          attackerTownHall: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

  for (const attack of regularAttackRows) {
    allKnownAttacks.push({
      stars: attack.stars,
      destruction: attack.destruction,
    });
  }

  for (const attack of cwlAttacks) {
    allKnownAttacks.push({
      stars: Number(attack.stars ?? 0),
      destruction: Number(
        attack.destructionPercentage ?? attack.destruction ?? 0
      ),
    });
  }

  const highestDestruction = allKnownAttacks.reduce(
    (highest, attack) =>
      Math.max(highest, attack.destruction),
    0
  );

  const regularDefenseStats = regularDefenseRows.reduce(
    (stats, attack) => {
      const stars = Number(attack.stars ?? 0);
      const destruction = Number(attack.destruction ?? 0);
      const attackerTownHall = Number(
        attack.attackerTownHall ?? 0
      );

      stats.attacks++;
      stats.totalDestruction += destruction;
      stats.totalStars += stars;

      if (stars === 3) stats.threeStars++;
      if (stars === 2) stats.twoStars++;
      if (stars === 1) stats.oneStars++;
      if (stars === 0) stats.zeroStars++;

      if (
        attackerTownHall > 0 &&
        !stats.attackerTownHalls.includes(attackerTownHall)
      ) {
        stats.attackerTownHalls.push(attackerTownHall);
      }

      return stats;
    },
    {
      attacks: 0,
      totalDestruction: 0,
      totalStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStars: 0,
      zeroStars: 0,
      attackerTownHalls: [] as number[],
    }
  );

  const regularDefenseAverageDestruction =
    regularDefenseStats.attacks > 0
      ? Math.round(
          regularDefenseStats.totalDestruction /
            regularDefenseStats.attacks
        )
      : 0;

  const totalThreeStars =
    regularWarStats.threeStars + cwlStats.threeStars;

  let currentThreeStarStreak = 0;
  let longestThreeStarStreak = 0;

  for (const attack of allKnownAttacks) {
    if (attack.stars === 3) {
      currentThreeStarStreak++;
      longestThreeStarStreak = Math.max(
        longestThreeStarStreak,
        currentThreeStarStreak
      );
    } else {
      currentThreeStarStreak = 0;
    }
  }

  const recentRegularWars = regularWarRows
    .slice(0, 8)
    .map((row) => ({
      warTag: row.war.warTag,
      opponentName: row.war.opponentName,
      stars: row.totalStars,
      attacks: row.attacksDone,
      missed: row.missedAttacks,
      warEndTime: row.war.warEndTime,
    }));

  const recentCwlWars = cwlHistoryRows
    .slice(0, 8)
    .map((row) => {
      let stars = 0;
      let attacks = 0;
      let destruction = 0;

      if (Array.isArray(row.attacks)) {
        for (const attack of row.attacks) {
          if (
            attack &&
            typeof attack === "object" &&
            !Array.isArray(attack)
          ) {
            const data = attack as {
              stars?: number;
              destructionPercentage?: number;
              destruction?: number;
            };

            stars += Number(data.stars ?? 0);
            destruction += Number(
              data.destructionPercentage ?? data.destruction ?? 0
            );
            attacks++;
          }
        }
      }

      return {
        warTag: row.war.warTag,
        season: row.war.season,
        round: row.war.round,
        opponentTag: row.war.opponentTag,
        stars,
        attacks,
        destruction:
          attacks > 0 ? Math.round(destruction / attacks) : 0,
      };
    });

  const opponentNameByTag = new Map(
    cwlHistoryRows.map((row) => [
      row.war.opponentTag,
      row.war.opponentTag,
    ])
  );

  const activityDates: Date[] = [];

  for (const attack of regularAttackRows) {
    if (attack.createdAt) {
      activityDates.push(new Date(attack.createdAt));
    }
  }

  for (const row of cwlHistoryRows) {
    if (row.war.importedAt) {
      activityDates.push(new Date(row.war.importedAt));
    }
  }

  for (const event of careerEvents) {
    if (event.date) {
      activityDates.push(new Date(event.date));
    }
  }

  const lastActivityDate =
    activityDates.length > 0
      ? new Date(
          Math.max(
            ...activityDates.map((date) => date.getTime())
          )
        )
      : null;

  const daysSinceActivity = lastActivityDate
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - lastActivityDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const knownWarCount =
    regularWarRows.length + cwlHistoryRows.length;

  const cwlClanHistoryMap = new Map<
    string,
    {
      clanTag: string;
      clanName: string;
      seasons: string[];
      latestSeason: string;
    }
  >();

  for (const assignment of cwlAssignments) {
    const clanTag = assignment.clanPlan.clanTag;
    const season = assignment.clanPlan.plan.season;

    if (!cwlClanHistoryMap.has(clanTag)) {
      cwlClanHistoryMap.set(clanTag, {
        clanTag,
        clanName:
          clanNameByTag.get(clanTag) ??
          (clanTag === tag ? clan.name : clanTag),
        seasons: [],
        latestSeason: season,
      });
    }

    const history = cwlClanHistoryMap.get(clanTag)!;

    if (!history.seasons.includes(season)) {
      history.seasons.push(season);
    }

    if (season > history.latestSeason) {
      history.latestSeason = season;
    }
  }

  const cwlClanHistory = Array.from(cwlClanHistoryMap.values())
    .map((history) => ({
      ...history,
      seasons: [...history.seasons].sort((a, b) =>
        a.localeCompare(b)
      ),
    }))
    .sort((a, b) =>
      b.latestSeason.localeCompare(a.latestSeason)
    );

  return (
    <section className="space-y-5">
      <Link
        href={`/clan/${tag}/members`}
        className="inline-flex text-sm text-neutral-400 transition hover:text-white"
      >
        ← Terug naar leden
      </Link>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">
                {player.name}
              </h1>

              <span className="rounded-md bg-yellow-500 px-2 py-1 text-xs font-black text-black">
                TH{player.townHallLevel}
              </span>
            </div>

            <div className="mt-1 text-sm text-neutral-500">
              {decodedPlayerTag}
            </div>

            <div className="mt-2 text-sm text-neutral-300">
              {roleLabel(player.role)} · {clan.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
            <MiniStat label="🏆 Trofeeën" value={player.trophies} />
            <MiniStat label="⚔️ CW aanvallen" value={regularWarStats.attacks} />
            <MiniStat label="⭐ CW sterren" value={regularWarStats.totalStars} />
            <MiniStat label="🏆 CWL aanvallen" value={cwlStats.attacks} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileSection title="⚔️ Gewone CW">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Wars" value={regularWarStats.wars} />
            <MiniStat label="Aanvallen" value={regularWarStats.attacks} />
            <MiniStat label="Gem. sterren" value={regularAverageStars} />
            <MiniStat label="Gemist" value={regularWarStats.missed} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="3 sterren" value={regularWarStats.threeStars} />
            <MiniStat label="2 sterren" value={regularWarStats.twoStars} />
            <MiniStat label="1 ster" value={regularWarStats.oneStars} />
            <MiniStat label="0 sterren" value="—" />
          </div>

          <div className="mt-3 text-sm text-neutral-400">
            Totale sterren:{" "}
            <span className="font-semibold text-white">
              {regularWarStats.totalStars}
            </span>
          </div>
        </ProfileSection>

        <ProfileSection title="🏆 CWL">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Wars" value={cwlHistoryRows.length} />
            <MiniStat label="Aanvallen" value={cwlStats.attacks} />
            <MiniStat label="Gem. sterren" value={cwlAverageStars} />
            <MiniStat label="Gem. vernietiging" value={`${cwlAverageDestruction}%`} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="3 sterren" value={cwlStats.threeStars} />
            <MiniStat label="2 sterren" value={cwlStats.twoStars} />
            <MiniStat label="1 ster" value={cwlStats.oneStars} />
            <MiniStat label="0 sterren" value={cwlStats.zeroStars} />
          </div>

          <div className="mt-3 text-sm text-neutral-400">
            Totale sterren:{" "}
            <span className="font-semibold text-white">
              {cwlStats.totalStars}
            </span>
          </div>
        </ProfileSection>

        <ProfileSection title="🏆 CWL">
          <div className="grid grid-cols-2 gap-2">
            <MiniStat
              label="Aanmeldingen"
              value={cwlApplications.length}
            />
            <MiniStat label="Indelingen" value={cwlAssignments.length} />
          </div>

          {cwlApplications.length > 0 ? (
            <div className="mt-4 space-y-2">
              {cwlApplications.slice(0, 5).map((application) => (
                <div
                  key={application.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2"
                >
                  <span className="text-sm text-neutral-300">
                    {application.season}
                  </span>

                  <span className="text-xs font-semibold text-neutral-400">
                    {application.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">
              Nog geen CWL-aanmeldingen opgeslagen.
            </p>
          )}
        </ProfileSection>

        <ProfileSection title="🏅 Persoonlijke records">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <RecordStat
              icon="🏆"
              label="Beste CWL"
              value={
                bestCwlSeason
                  ? `${bestCwlSeason.stars}★`
                  : "—"
              }
            />

            <RecordStat
              icon="⚔️"
              label="Beste CW"
              value={
                bestRegularWar
                  ? `${bestRegularWar.stars}★`
                  : "—"
              }
            />

            <RecordStat
              icon="🎯"
              label="Totaal 3★"
              value={totalThreeStars}
            />

            <RecordStat
              icon="💯"
              label="Hoogste destruction"
              value={`${highestDestruction}%`}
            />

            <RecordStat
              icon="🔥"
              label="Langste 3★-reeks"
              value={longestThreeStarStreak}
            />

            <RecordStat
              icon="⭐"
              label="CWL-totaal"
              value={totalCwlCareerStars}
            />

            <RecordStat
              icon="🏆"
              label="Beste CWL-seizoen"
              value={
                bestCwlSeason
                  ? bestCwlSeason.season
                  : "—"
              }
            />

            <RecordStat
              icon="💥"
              label="Beste CW tegen"
              value={
                bestRegularWar
                  ? bestRegularWar.opponentName
                  : "—"
              }
            />
          </div>

          {bestCwlSeason && (
            <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-xs text-neutral-500">
              Beste CWL:{" "}
              <span className="font-semibold text-neutral-300">
                {bestCwlSeason.clanName}
              </span>{" "}
              · {bestCwlSeason.season} ·{" "}
              <span className="font-semibold text-white">
                {bestCwlSeason.stars}★
              </span>
            </div>
          )}
        </ProfileSection>

        <ProfileSection title="🏆 CWL-carrière">
          {cwlCareer.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <MiniStat label="CWL's" value={cwlCareer.length} />
                <MiniStat label="Totaal sterren" value={totalCwlCareerStars} />
                <MiniStat label="Beste CWL" value={`${bestCwlStars}★`} />
              </div>

              <div className="mt-4 space-y-2">
                {cwlCareer.map((season) => {
                  const average =
                    season.attacks > 0
                      ? (season.stars / season.attacks).toFixed(2)
                      : "0.00";

                  return (
                    <div
                      key={`${season.season}-${season.clanTag}`}
                      className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-semibold text-white">
                            {season.season}
                          </div>

                          <div className="text-xs text-neutral-500">
                            {season.clanName}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <CareerStat
                            label="Ronden"
                            value={season.rounds}
                          />
                          <CareerStat
                            label="Sterren"
                            value={`${season.stars}★`}
                          />
                          <CareerStat
                            label="Gem."
                            value={average}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500">
              Nog geen historische CWL-data voor deze speler.
            </p>
          )}
        </ProfileSection>

        <ProfileSection title="🏰 CWL-clanverleden">
          {cwlClanHistory.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {cwlClanHistory.map((history, index) => (
                  <div
                    key={history.clanTag}
                    className="flex items-center gap-2"
                  >
                    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2">
                      <div className="text-sm font-semibold text-white">
                        {history.clanName}
                      </div>

                      <div className="mt-0.5 text-[10px] text-neutral-500">
                        {history.seasons.length}{" "}
                        {history.seasons.length === 1
                          ? "CWL-seizoen"
                          : "CWL-seizoenen"}
                      </div>
                    </div>

                    {index < cwlClanHistory.length - 1 && (
                      <span className="text-neutral-600">→</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {cwlClanHistory.map((history) => (
                  <div
                    key={`${history.clanTag}-seasons`}
                    className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2.5"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-semibold text-white">
                        {history.clanName}
                      </span>

                      <span className="text-xs text-neutral-500">
                        {history.seasons.join(" · ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[11px] text-neutral-600">
                Gebaseerd op opgeslagen CWL-indelingen. Dit is geen volledige
                historische ledenlijst.
              </p>
            </>
          ) : (
            <p className="text-sm text-neutral-500">
              Nog geen historische CWL-clanindelingen beschikbaar.
            </p>
          )}
        </ProfileSection>

        <ProfileSection title="📜 TDG-carrière">
          {careerEvents.length > 0 ? (
            <div className="space-y-3">
              {careerEvents.map((event) => (
                <div
                  key={event.id}
                  className="border-l border-neutral-700 pl-4"
                >
                  <div className="text-xs font-semibold text-neutral-500">
                    {new Date(event.date).toLocaleDateString("nl-NL")}
                  </div>

                  <div className="mt-1 text-sm font-semibold text-white">
                    {event.type}
                  </div>

                  <div className="mt-0.5 text-sm text-neutral-400">
                    {event.description}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              Nog geen carrière-events opgeslagen.
            </p>
          )}
        </ProfileSection>

        <ProfileSection title="🛡️ Defence">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-neutral-300">
                ⚔️ Gewone CW
              </h3>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat
                  label="Ontvangen"
                  value={regularDefenseStats.attacks}
                />
                <MiniStat
                  label="3★ tegen"
                  value={regularDefenseStats.threeStars}
                />
                <MiniStat
                  label="2★ tegen"
                  value={regularDefenseStats.twoStars}
                />
                <MiniStat
                  label="1★ tegen"
                  value={regularDefenseStats.oneStars}
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat
                  label="0★ tegen"
                  value={regularDefenseStats.zeroStars}
                />
                <MiniStat
                  label="Gem. damage"
                  value={`${regularDefenseAverageDestruction}%`}
                />
                <MiniStat
                  label="Totale stars"
                  value={regularDefenseStats.totalStars}
                />
                <MiniStat
                  label="Unieke TH's"
                  value={regularDefenseStats.attackerTownHalls.length}
                />
              </div>

              <div className="mt-3 text-xs text-neutral-500">
                Aangevallen door:{" "}
                <span className="text-neutral-300">
                  {regularDefenseStats.attackerTownHalls.length > 0
                    ? regularDefenseStats.attackerTownHalls
                        .sort((a, b) => b - a)
                        .map((th) => `TH${th}`)
                        .join(" · ")
                    : "Nog geen data"}
                </span>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-neutral-300">
                🏆 CWL
              </h3>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat
                  label="Ontvangen"
                  value={cwlDefenseStats.attacks}
                />
                <MiniStat
                  label="3★ tegen"
                  value={cwlDefenseStats.threeStars}
                />
                <MiniStat
                  label="2★ tegen"
                  value={cwlDefenseStats.twoStars}
                />
                <MiniStat
                  label="1★ tegen"
                  value={cwlDefenseStats.oneStars}
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat
                  label="0★ tegen"
                  value={cwlDefenseStats.zeroStars}
                />
                <MiniStat
                  label="Gem. damage"
                  value={`${cwlDefenseAverageDestruction}%`}
                />
                <MiniStat
                  label="Totale stars"
                  value={cwlDefenseStats.totalStars}
                />
                <MiniStat
                  label="Unieke TH's"
                  value={cwlDefenseStats.attackerTownHalls.length}
                />
              </div>

              <div className="mt-3 text-xs text-neutral-500">
                Aangevallen door:{" "}
                <span className="text-neutral-300">
                  {cwlDefenseStats.attackerTownHalls.length > 0
                    ? cwlDefenseStats.attackerTownHalls
                        .sort((a, b) => b - a)
                        .map((th) => `TH${th}`)
                        .join(" · ")
                    : "Nog geen data"}
                </span>
              </div>
            </div>
          </div>
        </ProfileSection>

        <ProfileSection title="🟢 Activiteit & aanwezigheid">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <MiniStat
              label="CW wars"
              value={regularWarRows.length}
            />

            <MiniStat
              label="CWL ronden"
              value={cwlHistoryRows.length}
            />

            <MiniStat
              label="CWL aanmeldingen"
              value={cwlApplications.length}
            />

            <MiniStat
              label="Bekende wars"
              value={knownWarCount}
            />

            <MiniStat
              label="Laatste data"
              value={
                lastActivityDate
                  ? lastActivityDate.toLocaleDateString("nl-NL")
                  : "—"
              }
            />
          </div>

          <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5">
            <div className="text-xs text-neutral-500">
              Laatste geregistreerde activiteit
            </div>

            <div className="mt-1 text-sm font-semibold text-white">
              {lastActivityDate
                ? `${lastActivityDate.toLocaleDateString(
                    "nl-NL"
                  )} · ${lastActivityDate.toLocaleTimeString(
                    "nl-NL",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}`
                : "Nog geen activiteit geregistreerd"}
            </div>

            {daysSinceActivity !== null && (
              <div className="mt-1 text-xs text-neutral-500">
                {daysSinceActivity === 0
                  ? "Vandaag voor het laatst geregistreerd."
                  : `${daysSinceActivity} ${
                      daysSinceActivity === 1 ? "dag" : "dagen"
                    } geleden geregistreerd.`}
              </div>
            )}
          </div>
        </ProfileSection>

        <ProfileSection title="📈 Recente prestaties">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-neutral-300">
                ⚔️ Laatste gewone CW
              </h3>

              {recentRegularWars.length > 0 ? (
                <div className="space-y-2">
                  {recentRegularWars.map((war) => (
                    <div
                      key={war.warTag}
                      className="rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">
                            {war.opponentName || "Onbekende tegenstander"}
                          </div>

                          <div className="mt-0.5 text-[10px] text-neutral-500">
                            {new Date(war.warEndTime).toLocaleDateString(
                              "nl-NL"
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-sm font-bold text-white">
                            {war.stars}★
                          </div>

                          <div className="text-[10px] text-neutral-500">
                            {war.attacks} aanv. · {war.missed} gemist
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">
                  Nog geen gewone CW-data beschikbaar.
                </p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-neutral-300">
                🏆 Laatste CWL
              </h3>

              {recentCwlWars.length > 0 ? (
                <div className="space-y-2">
                  {recentCwlWars.map((war) => (
                    <div
                      key={war.warTag}
                      className="rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">
                            {war.season} · Ronde {war.round}
                          </div>

                          <div className="mt-0.5 truncate text-[10px] text-neutral-500">
                            Tegenstander {war.opponentTag}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-sm font-bold text-white">
                            {war.stars}★
                          </div>

                          <div className="text-[10px] text-neutral-500">
                            {war.attacks} aanv. · {war.destruction}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">
                  Nog geen historische CWL-data beschikbaar.
                </p>
              )}
            </div>
          </div>
        </ProfileSection>

        <ProfileSection title="🧠 Phoenix-data">
          <div className="space-y-2 text-sm">
            <InfoRow label="Player ID" value={decodedPlayerTag} />
            <InfoRow label="Huidige clan" value={clan.name} />
            <InfoRow
              label="Town Hall"
              value={`TH${player.townHallLevel}`}
            />
            <InfoRow
              label="Trofeeën"
              value={player.trophies.toLocaleString("nl-NL")}
            />
            <InfoRow
              label="CW aanvallen"
              value={regularWarStats.attacks.toLocaleString("nl-NL")}
            />
            <InfoRow
              label="CWL aanvallen"
              value={cwlStats.attacks.toLocaleString("nl-NL")}
            />
            <InfoRow
              label="CW 3★ / 2★ / 1★"
              value={`${regularWarStats.threeStars} / ${regularWarStats.twoStars} / ${regularWarStats.oneStars}`}
            />
            <InfoRow
              label="CWL 3★ / 2★ / 1★ / 0★"
              value={`${cwlStats.threeStars} / ${cwlStats.twoStars} / ${cwlStats.oneStars} / ${cwlStats.zeroStars}`}
            />
          </div>
        </ProfileSection>
      </div>

      {cwlAssignments.length > 0 && (
        <ProfileSection title="📋 Recente CWL-indelingen">
          <div className="overflow-hidden rounded-lg border border-neutral-800">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-neutral-950 px-3 py-2 text-xs font-semibold text-neutral-500">
              <span>Seizoen</span>
              <span>Clan</span>
              <span>Rol</span>
            </div>

            {cwlAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="grid grid-cols-[1fr_auto_auto] gap-3 border-t border-neutral-800 px-3 py-2.5 text-sm"
              >
                <span className="text-neutral-300">
                  {assignment.clanPlan.plan.season}
                </span>

                <span className="text-neutral-400">
                  {assignment.clanPlan.clanTag}
                </span>

                <span className="font-semibold text-white">
                  {assignment.role}
                </span>
              </div>
            ))}
          </div>
        </ProfileSection>
      )}
    </section>
  );
}

function roleLabel(role: string) {
  switch (role) {
    case "leader":
      return "👑 Leader";
    case "coLeader":
      return "⭐ Co-Leader";
    case "admin":
      return "🛡️ Elder";
    default:
      return "👤 Member";
  }
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>

      <div className="mt-0.5 text-base font-bold text-white">
        {value}
      </div>
    </div>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-3 text-base font-bold text-white">{title}</h2>
      {children}
    </div>
  );
}

function RecordStat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2.5">
      <div className="text-sm">{icon}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-bold text-white">
        {value}
      </div>
    </div>
  );
}

function CareerStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-[58px]">
      <div className="text-[9px] uppercase tracking-wide text-neutral-600">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-bold text-white">
        {value}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-2 last:border-0 last:pb-0">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}
