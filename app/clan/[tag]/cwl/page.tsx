import { prisma } from "@/app/lib/prisma";
import { PHOENIX } from "@/app/lib/config";
import { getCwlDisplaySeason } from "@/app/lib/getCwlDisplaySeason";

type Props = {
  params: Promise<{
    tag: string;
  }>;
};

function getResult(
  clanStars: number,
  opponentStars: number,
  clanDestruction: number,
  opponentDestruction: number
) {
  if (clanStars > opponentStars) return "✅ Win";
  if (clanStars < opponentStars) return "❌ Loss";
  if (clanDestruction > opponentDestruction) return "✅ Win";
  if (clanDestruction < opponentDestruction) return "❌ Loss";
  return "🤝 Draw";
}

export default async function CWLPage({ params }: Props) {
  const { tag } = await params;
  const clan = PHOENIX.clans.find((c) => c.tag === tag);

  const season =
    getCwlDisplaySeason();

  const wars = await prisma.war.findMany({
    where: {
      clan: {
        tag,
      },
    },
    orderBy: [
      {
        season: {
          season: "desc",
        },
      },
      {
        round: "asc",
      },
    ],
    include: {
      season: true,
      clan: true,
    },
  });

  const matchupMap = new Map<
    string,
    {
      clanName: string;
      opponentName: string;
    }
  >();

  if (wars.length > 0) {
    const matchups = await prisma.cwlMatchup.findMany({
      where: {
        warTag: {
          in: wars.map((war) => war.warTag),
        },
      },
    });

    for (const matchup of matchups) {
      const isClanA = matchup.clanATag === tag;

      matchupMap.set(matchup.warTag, {
        clanName: isClanA ? matchup.clanAName : matchup.clanBName,
        opponentName: isClanA
          ? matchup.clanBName
          : matchup.clanAName,
      });
    }
  }

  const normalizedClanTag = `#${tag.replace("#", "")}`;

  const currentPlan = season
    ? await prisma.cwlPlan.findUnique({
        where: {
          season,
        },
        include: {
      clanPlans: {
        where: {
          clanTag: normalizedClanTag,
        },
        include: {
          assignments: {
            orderBy: {
              position: "asc",
            },
          },
        },
        },
      },
    })
    : null;

  const currentClanPlan =
    currentPlan?.status === "FINAL"
      ? currentPlan.clanPlans[0]
      : null;

  const now = new Date();

  const currentWars = wars.filter(
    (war) =>
      war.warStartTime <= now &&
      war.warEndTime >= now
  );

  const historyWars = wars.filter(
    (war) => war.warEndTime < now
  );

  const historySeasons = Array.from(
    new Set(historyWars.map((war) => war.season.season))
  );

  const clashClanLink =
    `https://link.clashofclans.com/en?action=OpenClanProfile&tag=%23${tag}`;

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
            CWL
          </p>

          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            {clan?.name ?? tag}
          </h1>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href="/cwl"
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
          >
            🏆 Aanmelden voor CWL →
          </a>

          <a
            href={clashClanLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white transition hover:bg-white/[0.08]"
          >
            🏰 Bekijk clan in Clash of Clans →
          </a>
        </div>
      </div>

      {/* HUIDIGE CWL / INDELING */}
      <section className="mb-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <img
          src="/images/admin/cwl-beheer.png"
          alt="CWL"
          className="h-auto w-full object-contain"
        />

        <div className="p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
            Huidige CWL
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            CWL-selectie · {season}
          </h2>

          {currentClanPlan ? (
            <div className="mt-5">
              <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-white/60">
                <span className="rounded-full bg-white/[0.06] px-3 py-1.5">
                  {currentClanPlan.format === "V15"
                    ? "15v15"
                    : "30v30"}
                </span>

                <span className="rounded-full bg-white/[0.06] px-3 py-1.5">
                  {currentClanPlan.assignments.length} geselecteerd
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {currentClanPlan.assignments.map(
                  (assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-4 py-3"
                    >
                      <span className="w-7 shrink-0 text-sm font-bold text-orange-400">
                        {assignment.position}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">
                          {assignment.playerName ??
                            assignment.playerTag}
                        </p>

                        {assignment.townHall ? (
                          <p className="text-xs text-white/40">
                            TH{assignment.townHall}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-white/45">
              De definitieve CWL-selectie is nog niet gepubliceerd.
            </p>
          )}
        </div>
      </section>

      {/* ACTUELE CWL */}
      <section className="mb-10">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
            Actuele CWL
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Actuele CWL
          </h2>
        </div>

        {currentWars.length > 0 ? (
          <div className="w-full overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="p-3 text-left">Ronde</th>
                  <th className="p-3 text-left">Tegenstander</th>
                  <th className="p-3 text-left">Score</th>
                  <th className="p-3 text-left">Resultaat</th>
                  <th className="p-3 text-left">Destruction</th>
                </tr>
              </thead>

              <tbody>
                {currentWars.map((war) => {
                  const matchup = matchupMap.get(war.warTag);

                  return (
                    <tr
                      key={war.warTag}
                      className="border-b border-white/10 last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="p-3">
                        {war.round}
                      </td>

                      <td className="p-3">
                        {matchup?.opponentName ??
                          "Tegenstander"}
                      </td>

                      <td className="p-3 font-semibold">
                        {war.clanStars} -{" "}
                        {war.opponentStars}
                      </td>

                      <td className="p-3">
                        {getResult(
                          war.clanStars,
                          war.opponentStars,
                          war.clanDestruction,
                          war.opponentDestruction
                        )}
                      </td>

                      <td className="p-3">
                        {war.clanDestruction.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/45">
            Er is momenteel geen actieve CWL.
          </div>
        )}
      </section>

      {/* GESCHIEDENIS */}
      <section>
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
            Geschiedenis
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            CWL geschiedenis
          </h2>
        </div>

        {historySeasons.length > 0 ? (
          <div className="space-y-3">
            {historySeasons.map((historySeason) => {
              const seasonWars = historyWars.filter(
                (war) =>
                  war.season.season === historySeason
              );

              return (
                <details
                  key={historySeason}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 font-bold transition hover:bg-white/[0.04]">
                    <span className="mr-3 text-orange-400">
                      ▶
                    </span>

                    {historySeason}

                    <span className="ml-2 text-sm font-normal text-white/40">
                      {seasonWars.length} rondes
                    </span>
                  </summary>

                  <div className="overflow-x-auto border-t border-white/10">
                    <table className="w-full min-w-[700px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-black/10">
                          <th className="p-3 text-left">
                            Ronde
                          </th>

                          <th className="p-3 text-left">
                            Tegenstander
                          </th>

                          <th className="p-3 text-left">
                            Score
                          </th>

                          <th className="p-3 text-left">
                            Resultaat
                          </th>

                          <th className="p-3 text-left">
                            Destruction
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {seasonWars.map((war) => {
                          const matchup =
                            matchupMap.get(
                              war.warTag
                            );

                          return (
                            <tr
                              key={war.warTag}
                              className="border-b border-white/10 last:border-0"
                            >
                              <td className="p-3">
                                {war.round}
                              </td>

                              <td className="p-3">
                                {matchup?.opponentName ??
                                  "Tegenstander"}
                              </td>

                              <td className="p-3">
                                {war.clanStars} -{" "}
                                {war.opponentStars}
                              </td>

                              <td className="p-3">
                                {getResult(
                                  war.clanStars,
                                  war.opponentStars,
                                  war.clanDestruction,
                                  war.opponentDestruction
                                )}
                              </td>

                              <td className="p-3">
                                {war.clanDestruction.toFixed(
                                  1
                                )}
                                %
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/45">
            Er is nog geen CWL-geschiedenis beschikbaar.
          </div>
        )}
      </section>
    </main>
  );
}
