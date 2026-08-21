import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth/session";
import CwlProposalGenerator from "./CwlProposalGenerator";
import CwlDraftEditor from "./CwlDraftEditor";
import CwlApplicationCard from "./CwlApplicationCard";

type Availability =
  | "FULL"
  | "LIMITED";

type PlayerStats = {
  playerTag: string;
  name: string;
  townHall: number | null;
  stars: number;
  attacks: number;
  missedAttacks: number;
  defenceStars: number;
  starsPerAttack: number;
  lastCwlClan: string | null;
  difficultyBonus: number;
  availability: Availability | null;
  applied: boolean;
};

function getDifficultyBonus(
  clanName: string | null
) {
  if (!clanName) {
    return 0;
  }

  const name =
    clanName.toLowerCase();

  if (name === "the dutch giant") {
    return 10;
  }

  if (name === "tdg ii") {
    return 5;
  }

  if (name === "tdg mini") {
    return 3;
  }

  if (name === "tdg micro") {
    return 1;
  }

  return 0;
}

export default async function AdminCwlPage() {
  await requireAdmin();

  const season = new Date()
    .toISOString()
    .slice(0, 7);

  const [
    applications,
    players,
    attacks,
    missedAttacks,
  ] = await Promise.all([
    prisma.cwlApplication.findMany({
      where: {
        season,
      },
      orderBy: {
        submittedAt: "asc",
      },
    }),

    prisma.player.findMany({
      orderBy: {
        currentName: "asc",
      },
    }),

    prisma.attack.findMany({
      include: {
        war: {
          include: {
            clan: true,
          },
        },
      },
      orderBy: {
        war: {
          warStartTime: "desc",
        },
      },
    }),

    prisma.missedAttack.findMany({
      orderBy: {
        warEndTime: "desc",
      },
    }),
  ]);

  const applicationMap =
    new Map(
      applications.map(
        (application) => [
          application.playerTag,
          application,
        ]
      )
    );

  const statsMap =
    new Map<
      string,
      PlayerStats
    >();

  for (const player of players) {
    const application =
      applicationMap.get(
        player.playerTag
      );

    statsMap.set(
      player.playerTag,
      {
        playerTag:
          player.playerTag,

        name:
          application?.clashName ||
          player.currentName,

        townHall: null,

        stars: 0,
        attacks: 0,
        missedAttacks: 0,
        defenceStars: 0,
        starsPerAttack: 0,

        lastCwlClan: null,
        difficultyBonus: 0,

        availability:
          application?.availability ||
          null,

        applied:
          Boolean(application),
      }
    );
  }

  const latestWarByPlayer =
    new Map<
      string,
      Date
    >();

  for (const attack of attacks) {
    if (
      !statsMap.has(
        attack.playerTag
      )
    ) {
      statsMap.set(
        attack.playerTag,
        {
          playerTag:
            attack.playerTag,

          name:
            attack.playerTag,

          townHall:
            attack.attackerTownHall,

          stars: 0,
          attacks: 0,
          missedAttacks: 0,
          defenceStars: 0,
          starsPerAttack: 0,

          lastCwlClan: null,
          difficultyBonus: 0,

          availability:
            applicationMap.get(
              attack.playerTag
            )?.availability ||
            null,

          applied:
            applicationMap.has(
              attack.playerTag
            ),
        }
      );
    }

    const currentStats =
      statsMap.get(
        attack.playerTag
      )!;

    currentStats.stars +=
      attack.stars;

    currentStats.attacks +=
      1;

    currentStats.defenceStars +=
      attack.defenseStars;

    if (
      attack.attackerTownHall >
      (currentStats.townHall || 0)
    ) {
      currentStats.townHall =
        attack.attackerTownHall;
    }

    const warDate =
      attack.war.warStartTime;

    const previousDate =
      latestWarByPlayer.get(
        attack.playerTag
      );

    if (
      !previousDate ||
      warDate > previousDate
    ) {
      latestWarByPlayer.set(
        attack.playerTag,
        warDate
      );

      currentStats.lastCwlClan =
        attack.war.clan.name;

      currentStats.difficultyBonus =
        getDifficultyBonus(
          attack.war.clan.name
        );
    }
  }

  for (const missed of missedAttacks) {
    const stats =
      statsMap.get(
        missed.playerTag
      );

    if (!stats) {
      continue;
    }

    stats.missedAttacks +=
      missed.missedAttacks;
  }

  const playerStats =
    Array.from(
      statsMap.values()
    ).map((stats) => ({
      ...stats,

      starsPerAttack:
        stats.attacks > 0
          ? Number(
              (
                stats.stars /
                stats.attacks
              ).toFixed(2)
            )
          : 0,
    }));

  const applicationsStats =
    playerStats
      .filter(
        (player) =>
          player.applied
      )
      .sort(
        (a, b) =>
          (b.townHall || 0) -
            (a.townHall || 0) ||
          b.stars - a.stars
      );

  const notAppliedStats =
    playerStats
      .filter(
        (player) =>
          !player.applied
      )
      .sort(
        (a, b) =>
          (b.townHall || 0) -
            (a.townHall || 0) ||
          b.stars - a.stars
      );

  const fullCount =
    applications.filter(
      (application) =>
        application.availability ===
        "FULL"
    ).length;

  const limitedCount =
    applications.filter(
      (application) =>
        application.availability ===
        "LIMITED"
    ).length;

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto w-full max-w-7xl">

        <a
          href="/admin"
          className="text-xs text-white/40 transition hover:text-orange-300"
        >
          ← Admin dashboard
        </a>

        <header className="mt-5 mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300">
            🏆 CWL COMMAND CENTER
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            CWL selectie
          </h1>

          <p className="mt-1 text-xs text-white/40">
            Selectiepool voor CWL{" "}
            {season}.
          </p>
        </header>

        {/* Statistieken */}
        <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Aanmeldingen"
            value={
              applications.length
            }
          />

          <Stat
            label="Volledig"
            value={fullCount}
          />

          <Stat
            label="Beperkt"
            value={limitedCount}
          />

          <Stat
            label="Bekende spelers"
            value={
              playerStats.length
            }
          />
        </section>

        {/* CWL aanmeldingenbeheer */}
        <section className="mb-7">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                📋 CWL aanmeldingen
              </h2>

              <p className="mt-1 text-[10px] text-white/30">
                Controleer gastaanmeldingen en keur ze goed of af.
              </p>
            </div>

            <span className="text-[10px] text-white/30">
              {applications.length}
            </span>
          </div>

          {applications.length === 0 ? (
            <Empty text="Nog geen CWL-aanmeldingen." />
          ) : (
            <div className="space-y-2">
              {applications.map((application) => (
                <CwlApplicationCard
                  key={application.id}
                  application={{
                    id: application.id,
                    playerTag: application.playerTag,
                    clashName: application.clashName,
                    availability: application.availability,
                    status: application.status,
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* CWL voorstelgenerator */}
        <CwlProposalGenerator />

        {/* CWL draft editor */}
        <CwlDraftEditor />

        {/* Aangemeld */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                🟢 Aangemeld
              </h2>

              <p className="mt-1 text-[10px] text-white/30">
                Spelers die zichzelf
                hebben aangemeld.
              </p>
            </div>

            <span className="text-[10px] text-white/30">
              {
                applicationsStats.length
              }
            </span>
          </div>

          {applicationsStats.length ===
          0 ? (
            <Empty
              text="Nog geen aanmeldingen."
            />
          ) : (
            <div className="space-y-2">
              {applicationsStats.map(
                (player) => (
                  <PlayerCard
                    key={
                      player.playerTag
                    }
                    player={player}
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* Niet aangemeld */}
        <section className="mt-7">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">
              ⚠️ Bekende spelers zonder
              aanmelding
            </h2>

            <p className="mt-1 text-[10px] text-white/30">
              Deze spelers zijn bekend
              bij Phoenix, maar hebben
              zich niet aangemeld.
            </p>
          </div>

          {notAppliedStats.length ===
          0 ? (
            <Empty
              text="Geen bekende spelers zonder aanmelding."
            />
          ) : (
            <div className="space-y-2">
              {notAppliedStats.map(
                (player) => (
                  <PlayerCard
                    key={
                      player.playerTag
                    }
                    player={player}
                  />
                )
              )}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

function PlayerCard({
  player,
}: {
  player: PlayerStats;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.02] p-3">

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">

            <h3 className="text-sm font-semibold">
              {player.name}
            </h3>

            {player.townHall && (
              <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold text-purple-300">
                TH
                {player.townHall}
              </span>
            )}

            {player.availability ===
              "FULL" && (
              <span className="rounded bg-green-500/10 px-2 py-0.5 text-[9px] font-bold text-green-300">
                🟢 VOLLEDIG
              </span>
            )}

            {player.availability ===
              "LIMITED" && (
              <span className="rounded bg-yellow-500/10 px-2 py-0.5 text-[9px] font-bold text-yellow-300">
                🟡 BEPERKT
              </span>
            )}

          </div>

          <p className="mt-1 font-mono text-[9px] text-white/30">
            {player.playerTag}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">

          <MiniStat
            label="⭐"
            value={player.stars}
          />

          <MiniStat
            label="⚔️"
            value={player.attacks}
          />

          <MiniStat
            label="⭐/⚔️"
            value={
              player.starsPerAttack
            }
          />

          <MiniStat
            label="❌"
            value={
              player.missedAttacks
            }
          />

          <MiniStat
            label="🛡️"
            value={
              player.defenceStars
            }
          />

          <MiniStat
            label="➕"
            value={`+${player.difficultyBonus}`}
          />

          <MiniStat
            label="🏆"
            value={
              player.lastCwlClan ||
              "-"
            }
          />

        </div>

      </div>

    </article>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-center">
      <p className="text-[9px] text-white/30">
        {label}
      </p>

      <p className="mt-0.5 truncate text-[10px] font-semibold text-white/75">
        {value}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[10px] text-white/35">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/35">
      {text}
    </div>
  );
}