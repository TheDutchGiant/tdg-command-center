import { prisma } from "@/app/lib/prisma";
import { PHOENIX } from "@/app/lib/config";

type Props = {
  params: Promise<{
    tag: string;
  }>;
};

export default async function CWLPage({
  params,
}: Props) {
  const { tag } = await params;

  const clan = PHOENIX.clans.find(
    (c) => c.tag === tag
  );

  const wars =
    await prisma.war.findMany({
      where: {
        clan: {
          tag: tag,
        },
      },
      orderBy: {
        round: "asc",
      },
      include: {
        season: true,
        clan: true,
      },
    });

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-8">
      <h1 className="mb-6 text-3xl font-bold sm:mb-8 sm:text-4xl">
        CWL History
      </h1>

      <p className="mb-6 text-lg font-semibold text-yellow-400 sm:text-xl">
        🏰 {clan?.name ?? tag}
      </p>

      <div className="mb-8 rounded-2xl border border-orange-400/20 bg-orange-500/[0.06] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-white sm:text-base">
              🏆 Meedoen met de komende CWL?
            </h2>

            <p className="mt-1 text-xs text-white/45">
              Meld je hier aan met je Player ID en geef je beschikbaarheid door.
            </p>
          </div>

          <a
            href="/cwl"
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
          >
            🏆 Aanmelden voor CWL →
          </a>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr className="border-b bg-white/[0.02]">
              <th className="p-3 text-left">
                Season
              </th>
              <th className="p-3 text-left">
                Round
              </th>
              <th className="p-3 text-left">
                Stars
              </th>
              <th className="p-3 text-left">
                Enemy
              </th>
              <th className="p-3 text-left">
                Destruction
              </th>
            </tr>
          </thead>

          <tbody>
            {wars.map((war) => (
              <tr
                key={war.warTag}
                className="border-b hover:bg-white/5"
              >
                <td className="p-3">
                  {war.season.season}
                </td>

                <td className="p-3">
                  {war.round}
                </td>

                <td className="p-3">
                  {war.clanStars} -{" "}
                  {war.opponentStars}
                </td>

                <td className="p-3">
                  {war.clanStars >
                  war.opponentStars
                    ? "✅ Win"
                    : war.clanStars <
                      war.opponentStars
                    ? "❌ Loss"
                    : war.clanDestruction >
                      war.opponentDestruction
                    ? "✅ Win"
                    : war.clanDestruction <
                      war.opponentDestruction
                    ? "❌ Loss"
                    : "🤝 Draw"}
                </td>

                <td className="p-3">
                  {war.clanDestruction.toFixed(
                    1
                  )}
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}