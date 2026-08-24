import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth/session";
import { PHOENIX } from "@/app/lib/config";
import CwMissedAttackDeleteButton from "./CwMissedAttackDeleteButton";

function normalizeTag(
  tag: string
) {
  return tag
    .replace(/^#/, "")
    .toUpperCase();
}

export default async function AdminCwPage() {
  await requireAdmin();

  const missedAttacks =
    await prisma.missedAttack.findMany({
      orderBy: [
        {
          missedAttacks: "desc",
        },
        {
          playerName: "asc",
        },
      ],
    });

  const clanData =
    new Map<
      string,
      Map<
        string,
        {
          playerTag: string;
          playerName: string;
          totalMissed: number;
        }
      >
    >();

  for (const clan of PHOENIX.clans) {
    clanData.set(
      normalizeTag(clan.tag),
      new Map()
    );
  }

  for (const record of missedAttacks) {
    const clanTag =
      normalizeTag(
        record.clanTag
      );

    if (
      !clanData.has(clanTag)
    ) {
      continue;
    }

    const players =
      clanData.get(clanTag)!;

    const existing =
      players.get(
        normalizeTag(
          record.playerTag
        )
      );

    if (existing) {
      existing.totalMissed +=
        record.missedAttacks;
    } else {
      players.set(
        normalizeTag(
          record.playerTag
        ),
        {
          playerTag:
            normalizeTag(
              record.playerTag
            ),
          playerName:
            record.playerName,
          totalMissed:
            record.missedAttacks,
        }
      );
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto w-full max-w-5xl">

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
            Gemiste gewone-CW-aanvallen per clan.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            {PHOENIX.clans.map(
            (clan) => {
              const clanTag =
                normalizeTag(
                  clan.tag
                );

              const players =
                Array.from(
                  clanData.get(
                    clanTag
                  )?.values() || []
                ).sort(
                  (a, b) =>
                    b.totalMissed -
                      a.totalMissed ||
                    a.playerName.localeCompare(
                      b.playerName
                    )
                );

              const totalMissed =
                players.reduce(
                  (
                    sum,
                    player
                  ) =>
                    sum +
                    player.totalMissed,
                  0
                );

              return (
                <section
                  key={clanTag}
                  className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
                    <div>
                      <h2 className="text-sm font-semibold">
                        ⚔️ {clan.name}
                      </h2>

                      <p className="mt-0.5 text-[9px] text-white/25">
                        Gemiste aanvallen in deze clan
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] text-white/25">
                        Spelers
                      </p>

                      <p className="text-sm font-bold">
                        {players.length}
                      </p>
                    </div>
                  </div>

                  {players.length ===
                  0 ? (
                    <div className="px-4 py-4 text-xs text-white/25">
                      Geen gemiste aanvallen geregistreerd.
                    </div>
                  ) : (
                    <div>
                      {players.map(
                        (
                          player,
                          index
                        ) => (
                          <div
                            key={
                              player.playerTag
                            }
                            className={`flex items-center justify-between gap-3 px-4 py-3 ${
                              index > 0
                                ? "border-t border-white/10"
                                : ""
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold">
                                {player.playerName}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <span className="rounded-md border border-red-400/15 bg-red-500/[0.05] px-3 py-1 text-sm font-bold text-red-200">
                                {player.totalMissed}
                              </span>

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
                        )
                      )}
                    </div>
                  )}

                  {players.length >
                    0 && (
                    <div className="border-t border-white/10 px-4 py-2 text-right text-[9px] text-white/25">
                      Totaal gemist:{" "}
                      <span className="font-semibold text-white/50">
                        {totalMissed}
                      </span>
                    </div>
                  )}
                </section>
              );
            }
          )}
          </div>

          <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
              <img
                src="/images/admin/cw-losers.png"
                alt="Gemiste aanvallen"
                className="h-auto w-full object-contain"
              />
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
