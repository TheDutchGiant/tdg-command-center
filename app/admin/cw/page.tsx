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

    const existing =
      players.get(playerTag);

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

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto w-full max-w-6xl">

        <a
          href="/admin"
          className="text-xs text-white/40 transition hover:text-orange-300"
        >
          ← Admin dashboard
        </a>

        <header className="mt-5 mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300">
            ⚔️ REGULAR CW
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            CW beheer
          </h1>

          <p className="mt-1 text-xs text-white/40">
            Gewone-CW-resultaten van deze maand.
          </p>
        </header>

        <div className="space-y-5">
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
                  b.attacks -
                    a.attacks ||
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
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
              >
                <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold">
                        ⚔️ {clan.name}
                      </h2>

                      <p className="mt-1 text-[10px] text-white/30">
                        Gewone CW van{" "}
                        {monthStart.toLocaleDateString(
                          "nl-NL",
                          {
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-center">
                        <p className="text-[9px] uppercase tracking-wide text-white/25">
                          Spelers
                        </p>

                        <p className="mt-0.5 text-sm font-bold">
                          {players.length}
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-center">
                        <p className="text-[9px] uppercase tracking-wide text-white/25">
                          Aanvallen
                        </p>

                        <p className="mt-0.5 text-sm font-bold">
                          {totalAttacks}
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-center">
                        <p className="text-[9px] uppercase tracking-wide text-white/25">
                          Gemist
                        </p>

                        <p className="mt-0.5 text-sm font-bold text-red-200">
                          {totalMissed}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {players.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-white/25">
                    Geen gewone-CW gegevens van deze maand.
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {players.map((player) => (
                      <div
                        key={player.playerTag}
                        className="px-4 py-4 sm:px-5"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {player.playerName}
                            </p>

                            <p className="mt-0.5 text-[9px] text-white/20">
                              {player.playerTag}
                            </p>
                          </div>

                          <CwMissedAttackDeleteButton
                            playerTag={
                              player.playerTag
                            }
                            clanTag={clanTag}
                            playerName={
                              player.playerName
                            }
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-wide text-white/25">
                              Aanvallen
                            </p>
                            <p className="mt-1 text-base font-bold">
                              {player.attacks}
                            </p>
                          </div>

                          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-wide text-white/25">
                              3 ⭐
                            </p>
                            <p className="mt-1 text-base font-bold">
                              {player.threeStars}
                            </p>
                          </div>

                          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-wide text-white/25">
                              2 ⭐
                            </p>
                            <p className="mt-1 text-base font-bold">
                              {player.twoStars}
                            </p>
                          </div>

                          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-wide text-white/25">
                              1 ⭐
                            </p>
                            <p className="mt-1 text-base font-bold">
                              {player.oneStars}
                            </p>
                          </div>

                          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-wide text-white/25">
                              0 ⭐
                            </p>
                            <p className="mt-1 text-base font-bold">
                              {player.zeroStars}
                            </p>
                          </div>

                          <div className="rounded-lg border border-red-400/15 bg-red-500/[0.04] px-3 py-2.5">
                            <p className="text-[9px] uppercase tracking-wide text-red-200/50">
                              Gemist
                            </p>
                            <p className="mt-1 text-base font-bold text-red-200">
                              {player.missedAttacks}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
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
