import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ChallengeLeaderboardPage() {
  const challenge =
    await prisma.randomChallenge.findFirst({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        startsAt: "desc",
      },
    });

  const entries =
    challenge
      ? await prisma.randomChallengeEntry.findMany({
          where: {
            challengeId: challenge.id,
            status: "APPROVED",
          },
          include: {
            result: true,
          },
          orderBy: {
            result: {
              score: "desc",
            },
          },
        })
      : [];

  return (
    <main className="min-h-screen bg-neutral-950 px-3 py-5 text-white sm:px-5 sm:py-6">
      <div className="mx-auto max-w-5xl">

        <div className="mb-4 flex items-center justify-between gap-2">
          <a
            href="/challenge"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/55 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            ⬅️ Challenge
          </a>
        </div>

        <div className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-2xl">
          <img
            src="/images/challenge/challenge-banner.png"
            alt="TDG Phoenix Challenge"
            className="block h-auto w-full object-cover"
          />
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/60">
                TDG Challenge
              </p>

              <h1 className="mt-1 text-xl font-black">
                🏆 Leaderboard
              </h1>
            </div>

            <span className="text-[10px] font-bold text-white/25">
              {entries.length} deelnemers
            </span>
          </div>

          {!challenge ? (
            <p className="mt-5 text-sm text-white/30">
              Geen actieve challenge.
            </p>
          ) : entries.length === 0 ? (
            <p className="mt-5 text-sm text-white/30">
              Nog geen gevalideerde resultaten.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-3"
                >
                  <span className="w-8 text-center text-sm font-black text-white/30">
                    #{index + 1}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {entry.playerName}
                  </span>

                  <span className="text-xs font-bold text-white/50">
                    {entry.result?.stars ?? 0} ⭐
                  </span>

                  <span className="text-xs font-bold text-orange-300">
                    {entry.result?.destruction ?? 0}%
                  </span>

                  <span className="w-16 text-right text-xs font-black">
                    {entry.result?.score ?? 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
