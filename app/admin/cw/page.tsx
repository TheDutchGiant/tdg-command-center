import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth/session";
import { PHOENIX } from "@/app/lib/config";
import CwMissedAttackDeleteButton from "./CwMissedAttackDeleteButton";

function normalizeTag(tag: string) {
  return tag.replace(/^#/, "").toUpperCase();
}

type PlayerStats = {
  playerTag: string;
  playerName: string;
  attacks: number;
  threeStars: number;
  twoStars: number;
  oneStars: number;
  zeroStars: number;
  missedAttacks: number;
};

export default async function AdminCwPage() {
  await requireAdmin();

  const now = new Date();

  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const nextMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  const [warPlayers, missedAttacks] =
    await Promise.all([
      prisma.regularWarPlayer.findMany({
        where: {
          war: {
            warEndTime: {
              gte: monthStart,
              lt: nextMonthStart,
            },
          },
        },
        include: {
          war: true,
        },
        orderBy: {
          playerName: "asc",
        },
      }),

      prisma.missedAttack.findMany({
        where: {
          warEndTime: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
    ]);

  const clanData = new Map<
    string,
    Map<string, PlayerStats>
  >();

  for (const clan of PHOENIX.clans) {
    clanData.set(
      normalizeTag(clan.tag),
      new Map()
    );
  }

  /*
   * ---------------------------------------------------------
   * GEWONE CW RESULTATEN
   * ---------------------------------------------------------
   */

  for (const record of warPlayers) {
    const clanTag = normalizeTag(
      record.war.clanTag
    );

    if (!clanData.has(clanTag)) {
      continue;
    }

    const players =
      clanData.get(clanTag)!;

    const playerTag =
      normalizeTag(record.playerTag);

    const attacks =
      Math.max(record.attacksDone ?? 0, 0);

    const threeStars =
      Math.max(record.threeStars ?? 0, 0);

    const twoStars =
      Math.max(record.twoStars ?? 0, 0);

    const oneStars =
      Math.max(record.oneStars ?? 0, 0);

    const zeroStars = Math.max(
      attacks -
        threeStars -
        twoStars -
        oneStars,
      0
    );

    const existing =
      players.get(playerTag);

    if (existing) {
      existing.attacks += attacks;
      existing.threeStars += threeStars;
      existing.twoStars += twoStars;
      existing.oneStars += oneStars;
      existing.zeroStars += zeroStars;
    } else {
      players.set(playerTag, {
        playerTag,
        playerName: record.playerName,
        attacks,
        threeStars,
        twoStars,
        oneStars,
        zeroStars,
        missedAttacks: 0,
      });
    }
  }

  /*
   * ---------------------------------------------------------
   * GEMISTE AANVALLEN
   * ---------------------------------------------------------
   */

  for (const record of missedAttacks) {
    const clanTag = normalizeTag(
      record.clanTag
    );

    if (!clanData.has(clanTag)) {
      continue;
    }

    const players =
      clanData.get(clanTag)!;

    const playerTag =
      normalizeTag(record.playerTag);

    const existing =
      players.get(playerTag);

    if (existing) {
      existing.missedAttacks +=
        Math.max(
          record.missedAttacks ?? 0,
          0
        );
    } else {
      players.set(playerTag, {
        playerTag,
        playerName: record.playerName,
        attacks: 0,
        threeStars: 0,
        twoStars: 0,
        oneStars: 0,
        zeroStars: 0,
        missedAttacks: Math.max(
          record.missedAttacks ?? 0,
          0
        ),
      });
    }
  }

  const monthLabel =
    monthStart.toLocaleDateString(
      "nl-NL",
      {
        month: "long",
        year: "numeric",
      }
    );

  return (
    <main className="min-h-screen bg-black px-3 py-5 text-white sm:px-5 sm:py-6">
      <div className="mx-auto w-full max-w-6xl">

        <a
          href="/admin"
          className="text-xs text-white/50 transition hover:text-orange-300"
        >
          ← Admin dashboard
        </a>

        <header className="mt-5 mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300">
            ⚔️ Regular CW
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            CW beheer
          </h1>

          <p className="mt-1 text-xs text-white/50">
            Gewone-CW-resultaten van {monthLabel}.
          </p>
        </header>

        <div className="space-y-4">
          {PHOENIX.clans.map((clan) => {
            const clanTag =
              normalizeTag(clan.tag);

            const players = Array.from(
              clanData
                .get(clanTag)
                ?.values() || []
            )
              .filter(
                (player) =>
                  player.attacks > 0 ||
                  player.missedAttacks > 0
              )
              .sort(
                (a, b) =>
                  b.missedAttacks -
                    a.missedAttacks ||
                  a.playerName.localeCompare(
                    b.playerName
                  )
              );

            const totalAttacks =
              players.reduce(
                (sum, player) =>
                  sum + player.attacks,
                0
              );

            const totalMissed =
              players.reduce(
                (sum, player) =>
                  sum +
                  player.missedAttacks,
                0
              );

            return (
              <section
                key={clanTag}
                className="overflow-hidden rounded-xl border border-white/15 bg-zinc-950"
              >
                {/* Clan header */}
                <div className="border-b border-white/10 bg-zinc-900/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-white">
                        ⚔️ {clan.name}
                      </h2>

                      <p className="mt-0.5 text-[10px] text-white/45">
                        {players.length} spelers ·{" "}
                        {totalAttacks} aanvallen ·{" "}
                        {totalMissed} gemist
                      </p>
                    </div>

                    <div className="shrink-0 rounded-md border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-right">
                      <p className="text-[8px] uppercase tracking-wide text-red-200/60">
                        Gemist
                      </p>

                      <p className="text-sm font-bold text-red-100">
                        {totalMissed}
                      </p>
                    </div>
                  </div>
                </div>

                {players.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-white/35">
                    Geen gewone-CW gegevens van deze maand.
                  </div>
                ) : (
                  <div>
                    {/* Desktop header */}
                    <div className="hidden border-b border-white/10 bg-white/[0.025] px-4 py-2 text-[9px] font-semibold uppercase tracking-wide text-white/45 lg:grid lg:grid-cols-[280px_52px_52px_52px_52px_52px_64px_84px] lg:items-center lg:gap-1">
                      <div>Speler</div>
                      <div className="text-center">Aanv.</div>
                      <div className="text-center">3★</div>
                      <div className="text-center">2★</div>
                      <div className="text-center">1★</div>
                      <div className="text-center">0★</div>
                      <div className="text-center">Gemist</div>
                      <div></div>
                    </div>

                    <div className="divide-y divide-white/10">
                      {players.map((player) => (
                        <div
                          key={player.playerTag}
                          className="px-4 py-2.5"
                        >
                          {/* Mobile */}
                          <div className="lg:hidden">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                  {player.playerName}
                                </p>
                              </div>

                              <CwMissedAttackDeleteButton
                                playerTag={
                                  player.playerTag
                                }
                                clanTag={
                                  clanTag
                                }
                                playerName={
                                  player.playerName
                                }
                              />
                            </div>

                            <div className="grid grid-cols-6 gap-1.5">
                              <div className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1.5 text-center">
                                <p className="text-[8px] text-white/45">
                                  AANV.
                                </p>
                                <p className="mt-0.5 text-sm font-bold">
                                  {player.attacks}
                                </p>
                              </div>

                              <div className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1.5 text-center">
                                <p className="text-[8px] text-white/45">
                                  3★
                                </p>
                                <p className="mt-0.5 text-sm font-bold">
                                  {player.threeStars}
                                </p>
                              </div>

                              <div className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1.5 text-center">
                                <p className="text-[8px] text-white/45">
                                  2★
                                </p>
                                <p className="mt-0.5 text-sm font-bold">
                                  {player.twoStars}
                                </p>
                              </div>

                              <div className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1.5 text-center">
                                <p className="text-[8px] text-white/45">
                                  1★
                                </p>
                                <p className="mt-0.5 text-sm font-bold">
                                  {player.oneStars}
                                </p>
                              </div>

                              <div className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1.5 text-center">
                                <p className="text-[8px] text-white/45">
                                  0★
                                </p>
                                <p className="mt-0.5 text-sm font-bold">
                                  {player.zeroStars}
                                </p>
                              </div>

                              <div className="rounded-md border border-red-400/20 bg-red-500/10 px-1.5 py-1.5 text-center">
                                <p className="text-[8px] text-red-200/70">
                                  GEMIST
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-red-100">
                                  {player.missedAttacks}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Desktop */}
                          <div className="hidden lg:grid lg:grid-cols-[280px_52px_52px_52px_52px_52px_64px_84px] lg:items-center lg:gap-1">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-white">
                                {player.playerName}
                              </p>
                            </div>

                            <div className="text-center text-sm font-semibold text-white">
                              {player.attacks}
                            </div>

                            <div className="text-center text-sm font-semibold text-white">
                              {player.threeStars}
                            </div>

                            <div className="text-center text-sm font-semibold text-white">
                              {player.twoStars}
                            </div>

                            <div className="text-center text-sm font-semibold text-white">
                              {player.oneStars}
                            </div>

                            <div className="text-center text-sm font-semibold text-white">
                              {player.zeroStars}
                            </div>

                            <div className="text-center">
                              <span className="inline-flex min-w-9 justify-center rounded-md border border-red-400/20 bg-red-500/10 px-2 py-1 text-sm font-bold text-red-100">
                                {player.missedAttacks}
                              </span>
                            </div>

                            <div className="flex justify-end">
                              <CwMissedAttackDeleteButton
                                playerTag={
                                  player.playerTag
                                }
                                clanTag={
                                  clanTag
                                }
                                playerName={
                                  player.playerName
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
