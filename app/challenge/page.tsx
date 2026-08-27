import { prisma } from "@/app/lib/prisma";
import { ensureActiveChallenge } from "@/app/lib/challenge/ensureActiveChallenge";
import ChallengeSubmitForm from "@/app/components/challenge/ChallengeSubmitForm";
import type { GeneratedArmy } from "@/app/lib/challenge/randomArmy";

export const dynamic = "force-dynamic";

export default async function ChallengePage() {
  const challenge =
    await ensureActiveChallenge();

  const army =
    challenge.army as unknown as GeneratedArmy;

  const base = challenge.baseId
    ? await prisma.base.findUnique({
        where: {
          id: challenge.baseId,
        },
      })
    : null;

  const entries =
    await prisma.randomChallengeEntry.findMany({
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
    });

  const endsAt =
    challenge.endsAt?.toISOString() ?? null;

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">

        <header className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-300">
            🔥 TDG Phoenix Challenge
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-5xl">
            {challenge.title}
          </h1>

          <p className="mt-3 text-sm text-white/45">
            TH{challenge.townHall} ·{" "}
            {challenge.difficulty.replaceAll(
              "_",
              " "
            )}
          </p>

          {endsAt && (
            <p className="mt-2 text-xs text-orange-300/70">
              ⏳ Challenge eindigt op{" "}
              {new Date(endsAt).toLocaleString(
                "nl-NL"
              )}
            </p>
          )}
        </header>

        <section className="grid gap-4 lg:grid-cols-2">

          <div className="rounded-2xl border border-orange-400/20 bg-orange-500/[0.04] p-5">
            <h2 className="text-lg font-bold">
              🎲 Random Army
            </h2>

            <div className="mt-5 space-y-4">

              <ArmySection
                title="⚔️ Troepen"
                items={army.troops}
              />

              <ArmySection
                title="🪄 Spells"
                items={army.spells}
              />

              <div>
                <p className="text-xs font-bold text-white/40">
                  🏰 Siege Machine
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {army.siegeMachine.name}
                </p>
              </div>

              <ArmySection
                title="👑 Heroes"
                items={army.heroes}
                hero
              />

              <ArmySection
                title="🐾 Pets"
                items={army.pets}
              />

            </div>
          </div>

          <div className="space-y-4">

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-lg font-bold">
                🏰 Challenge Base
              </h2>

              {base ? (
                <>
                  <p className="mt-3 text-lg font-bold">
                    {base.name}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    TH{base.townHall} ·{" "}
                    {base.category}
                  </p>

                  <a
                    href={base.baseLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block rounded-xl border border-orange-400/25 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200 hover:bg-orange-500/20"
                  >
                    🏰 Open Challenge Base
                  </a>
                </>
              ) : (
                <p className="mt-3 text-sm text-white/40">
                  Er is geen geschikte base beschikbaar.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-lg font-bold">
                📸 Meedoen
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/50">
                Doe de challenge met exact deze army
                en deze base. Upload daarna je
                screenshot. Phoenix controleert het
                resultaat automatisch.
              </p>

              <ChallengeSubmitForm />
            </div>

          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              🏆 Leaderboard
            </h2>

            <span className="text-xs text-white/30">
              {entries.length} deelnemers
            </span>
          </div>

          {entries.length === 0 ? (
            <p className="mt-5 text-sm text-white/35">
              Nog geen gevalideerde resultaten.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {entries.map(
                (entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-3"
                  >
                    <span className="w-8 text-center text-sm font-black text-white/40">
                      #{index + 1}
                    </span>

                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {entry.playerName}
                    </span>

                    <span className="text-xs font-bold text-white/60">
                      {entry.result?.stars ?? 0}⭐
                    </span>

                    <span className="text-xs font-bold text-orange-300">
                      {entry.result?.destruction ?? 0}%
                    </span>

                    <span className="w-20 text-right text-xs font-black">
                      {entry.result?.score ?? 0}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

function ArmySection({
  title,
  items,
  hero = false,
}: {
  title: string;
  items: unknown[];
  hero?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-white/40">
        {title}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map(
          (item, index) => {
            const value =
              item as {
                id?: string;
                name?: string;
                quantity?: number;
              };

            return (
              <span
                key={`${value.id ?? "item"}-${index}`}
                className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px] font-semibold"
              >
                {value.name ?? "Unknown"}
                {!hero &&
                typeof value.quantity ===
                  "number"
                  ? ` ×${value.quantity}`
                  : ""}
              </span>
            );
          }
        )}
      </div>
    </div>
  );
}
