import { prisma } from "@/app/lib/prisma";

type StatsPageProps = {
  params: Promise<{
    tag: string;
  }>;
};

type RecordEntry = {
  playerTag: string;
  playerName: string;
  value: number;
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function RecordCard({
  icon,
  title,
  entries,
  formatter,
}: {
  icon: string;
  title: string;
  entries: RecordEntry[];
  formatter?: (value: number) => string;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
      <h2 className="mb-5 text-lg font-bold text-yellow-400">
        {icon} {title}
      </h2>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={`${title}-${entry.playerTag}-${index}`}
            className={`flex items-center justify-between rounded-xl px-4 py-3 ${
              index === 0
                ? "bg-yellow-500/10 border border-yellow-500/30"
                : "bg-neutral-950/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-7 text-center text-lg">
                {index === 0
                  ? "🥇"
                  : index === 1
                  ? "🥈"
                  : "🥉"}
              </span>

              <span
                className={
                  index === 0
                    ? "font-bold text-white"
                    : "font-semibold text-neutral-300"
                }
              >
                {entry.playerName}
              </span>
            </div>

            <span className="font-bold text-neutral-200">
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function StatsPage({
  params,
}: StatsPageProps) {
  const { tag } = await params;

  const normalizedTag = decodeURIComponent(tag).replace(/^#/, "");

  const clan = await prisma.clan.findUnique({
    where: {
      tag: normalizedTag,
    },
  });

  if (!clan) {
    return (
      <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6 text-red-300">
        Clan niet gevonden.
      </div>
    );
  }

  const attacks = await prisma.attack.findMany({
    where: {
      war: {
        clanId: clan.id,
        isFinalized: true,
      },
    },
    include: {
      player: true,
    },
  });

  const playerStats = new Map<
    string,
    {
      playerName: string;
      attacks: number;
      triples: number;
      stars: number;
      destruction: number;
    }
  >();

  for (const attack of attacks) {
    const existing = playerStats.get(attack.playerTag);

    if (existing) {
      existing.attacks += 1;
      existing.stars += attack.stars;
      existing.destruction += attack.destruction;

      if (attack.stars === 3) {
        existing.triples += 1;
      }
    } else {
      playerStats.set(attack.playerTag, {
        playerName: attack.player.currentName,
        attacks: 1,
        triples: attack.stars === 3 ? 1 : 0,
        stars: attack.stars,
        destruction: attack.destruction,
      });
    }
  }

  const stats = Array.from(playerStats.entries()).map(
    ([playerTag, value]) => ({
      playerTag,
      playerName: value.playerName,
      attacks: value.attacks,
      triples: value.triples,
      stars: value.stars,
      destruction: value.destruction,
    })
  );

  const mostTriples = [...stats]
    .sort((a, b) => b.triples - a.triples)
    .slice(0, 3)
    .map((player) => ({
      playerTag: player.playerTag,
      playerName: player.playerName,
      value: player.triples,
    }));

  const mostStars = [...stats]
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 3)
    .map((player) => ({
      playerTag: player.playerTag,
      playerName: player.playerName,
      value: player.stars,
    }));

  const mostAttacks = [...stats]
    .sort((a, b) => b.attacks - a.attacks)
    .slice(0, 3)
    .map((player) => ({
      playerTag: player.playerTag,
      playerName: player.playerName,
      value: player.attacks,
    }));

  const mostDestruction = [...stats]
    .sort((a, b) => b.destruction - a.destruction)
    .slice(0, 3)
    .map((player) => ({
      playerTag: player.playerTag,
      playerName: player.playerName,
      value: player.destruction,
    }));

  const fastestTriples = attacks
    .filter((attack) => attack.stars === 3)
    .sort((a, b) => a.duration - b.duration)
    .slice(0, 3)
    .map((attack) => ({
      playerTag: attack.playerTag,
      playerName: attack.player.currentName,
      value: attack.duration,
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">
          🏆 Hall of Records
        </h1>

        <p className="mt-2 text-sm text-neutral-400">
          De persoonlijke records van {clan.name}.
          <br />
          Gebaseerd op geregistreerde oorlogen in Phoenix.
        </p>
      </div>

      {attacks.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-8 text-center">
          <div className="text-4xl">🏆</div>

          <h2 className="mt-4 text-xl font-bold text-white">
            Nog geen records
          </h2>

          <p className="mt-2 text-sm text-neutral-400">
            Zodra Phoenix oorlogen registreert, verschijnen hier automatisch
            de eerste records.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <RecordCard
            icon="💥"
            title="Meeste triples"
            entries={mostTriples}
          />

          <RecordCard
            icon="⭐"
            title="Meeste sterren"
            entries={mostStars}
          />

          <RecordCard
            icon="⚔️"
            title="Meeste aanvallen"
            entries={mostAttacks}
          />

          <RecordCard
            icon="💣"
            title="Meeste destruction"
            entries={mostDestruction}
            formatter={(value) => `${value}%`}
          />

          <RecordCard
            icon="⚡"
            title="Snelste triple"
            entries={fastestTriples}
            formatter={formatDuration}
          />
        </div>
      )}
    </div>
  );
}