import { prisma } from "@/app/lib/prisma";
import { ensureActiveChallenge } from "@/app/lib/challenge/ensureActiveChallenge";
import ChallengeSubmitForm from "@/app/components/challenge/ChallengeSubmitForm";
import type { GeneratedArmy } from "@/app/lib/challenge/randomArmy";

export const dynamic = "force-dynamic";

const GAME_DATA = "/game-data";

const UNIT_IDS: Record<string, number> = {
  Barbarian: 0,
  Archer: 1,
  Goblin: 2,
  Giant: 3,
  "Wall Breaker": 4,
  Balloon: 5,
  Wizard: 6,
  Healer: 7,
  Dragon: 8,
  "P.E.K.K.A": 9,
  Minion: 10,
  "Hog Rider": 11,
  Valkyrie: 12,
  Golem: 13,
  Witch: 15,
  "Lava Hound": 17,
  Bowler: 22,
  "Baby Dragon": 23,
  Miner: 24,
  "Super Barbarian": 26,
  "Super Archer": 27,
  "Super Wall Breaker": 28,
  "Super Giant": 29,
  Yeti: 53,
  "Sneaky Goblin": 55,
  "Super Miner": 56,
  "Rocket Balloon": 57,
  "Ice Golem": 58,
  "Electro Dragon": 59,
  "Inferno Dragon": 63,
  "Super Valkyrie": 64,
  "Dragon Rider": 65,
  "Super Witch": 66,
  "Ice Hound": 76,
  "Super Bowler": 80,
  "Super Dragon": 81,
  Headhunter: 82,
  "Super Wizard": 83,
  "Super Minion": 84,
  "Electro Titan": 95,
  "Apprentice Warden": 97,
  "Super Hog": 98,
  "Root Rider": 110,
  Druid: 123,
  Thrower: 132,
  "Super Yeti": 147,
  Furnace: 150,
  "Ice Wizard": 30,
  "Battle Ram": 45,
  "Royal Ghost": 47,
  "Pumpkin Barbarian": 48,
  "Giant Skeleton": 50,
  "Skeleton Barrel": 61,
  "El Primo": 67,
  "Party Wizard": 72,
  Firecracker: 119,
  "Azure Dragon": 120,
  "Snake Barrel": 142,
  "Wall Wrecker": 51,
  "Battle Blimp": 52,
  "Stone Slammer": 62,
  "Siege Barracks": 75,
  "Log Launcher": 87,
  "Flame Flinger": 91,
  "Battle Drill": 92,
  "Troop Launcher": 135,
};

const SPELL_IDS: Record<string, number> = {
  "Lightning Spell": 0,
  "Healing Spell": 1,
  "Rage Spell": 2,
  "Jump Spell": 3,
  "Freeze Spell": 5,
  "Poison Spell": 9,
  "Earthquake Spell": 10,
  "Haste Spell": 11,
  "Clone Spell": 16,
  "Skeleton Spell": 17,
  "Bat Spell": 28,
  "Invisibility Spell": 35,
  "Recall Spell": 53,
  "Overgrowth Spell": 70,
  "Revive Spell": 98,
};

const HERO_IDS: Record<string, string> = {
  "Barbarian King": "0",
  "Archer Queen": "1",
  "Grand Warden": "2",
  "Flying Grand Warden": "2m1",
  "Royal Champion": "4",
  "Minion Prince": "6",
};

const ICONS: Record<string, string> = {
  "Barbarian King": "heroes/barbarian-king/icon.png",
  "Archer Queen": "heroes/archer-queen/icon.png",
  "Grand Warden": "heroes/grand-warden/icon.png",
  "Royal Champion": "heroes/royal-champion/icon.png",
  "Minion Prince": "heroes/minion-prince/icon.png",
  "Dragon Duke": "heroes/dragon-duke/icon.png",
};

function iconPath(item: { id?: string; name?: string }) {
  const name = item.name ?? item.id ?? "";

  if (ICONS[name]) {
    return `${GAME_DATA}/${ICONS[name]}`;
  }

  const slug = (item.id ?? name)
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll(".", "")
    .replaceAll("’", "")
    .replaceAll("'", "");

  const category =
    name.includes("Spell")
      ? "spells"
      : name.includes("King") ||
          name.includes("Queen") ||
          name.includes("Warden") ||
          name.includes("Champion") ||
          name.includes("Prince") ||
          name.includes("Duke")
        ? "heroes"
        : "troops";

  return `${GAME_DATA}/${category}/${slug}/icon.png`;
}

function buildArmyLink(army: GeneratedArmy) {
  const units = (army.troops ?? [])
    .map((item) => {
      const name = item.name ?? item.id ?? "";
      const id = UNIT_IDS[name];
      const quantity = item.quantity ?? 0;

      return id === undefined || quantity <= 0
        ? null
        : `${quantity}x${id}`;
    })
    .filter(Boolean)
    .join("-");

  const spells = (army.spells ?? [])
    .map((item) => {
      const name = item.name ?? item.id ?? "";
      const id = SPELL_IDS[name];
      const quantity = item.quantity ?? 0;

      return id === undefined || quantity <= 0
        ? null
        : `${quantity}x${id}`;
    })
    .filter(Boolean)
    .join("-");

  const heroes = (army.heroes ?? [])
    .map((item) => {
      const name = item.name ?? item.id ?? "";
      return HERO_IDS[name] ?? null;
    })
    .filter(Boolean)
    .join("-");

  let armyPart = "";

  if (units) armyPart += `u${units}`;
  if (spells) armyPart += `s${spells}`;
  if (heroes) armyPart += `h${heroes}`;

  return `https://link.clashofclans.com/en?action=CopyArmy&army=${armyPart}`;
}

export default async function ChallengePage() {
  const challenge = await ensureActiveChallenge();

  const army =
    challenge.army as unknown as GeneratedArmy;

  const base = challenge.baseId
    ? await prisma.base.findUnique({
        where: { id: challenge.baseId },
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

  const armyLink = buildArmyLink(army);

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
            {challenge.difficulty.replaceAll("_", " ")}
          </p>

          {endsAt && (
            <p className="mt-2 text-xs text-orange-300/70">
              ⏳ Challenge eindigt op{" "}
              {new Date(endsAt).toLocaleString("nl-NL")}
            </p>
          )}
        </header>

        <section className="grid gap-4 lg:grid-cols-2">

          <div className="rounded-2xl border border-orange-400/20 bg-orange-500/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                🎲 Random Army
              </h2>

              <a
                href={armyLink}
                className="rounded-xl border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-xs font-black text-orange-200 hover:bg-orange-500/20"
              >
                ⚔️ Copy Army
              </a>
            </div>

            <p className="mt-2 text-xs text-white/35">
              Klik op Copy Army om deze legeropstelling
              rechtstreeks in Clash of Clans te openen.
            </p>

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

                <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <ArmyIcon item={army.siegeMachine} />
                  <span className="text-sm font-semibold">
                    {army.siegeMachine.name}
                  </span>
                </div>
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
                    TH{base.townHall} · {base.category}
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
                en deze base. Upload daarna alleen je
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
              {entries.map((entry, index) => (
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
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

function ArmyIcon({
  item,
}: {
  item: {
    id?: string;
    name?: string;
  };
}) {
  return (
    <img
      src={iconPath(item)}
      alt=""
      className="h-10 w-10 object-contain"
    />
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

      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item, index) => {
          const value =
            item as {
              id?: string;
              name?: string;
              quantity?: number;
            };

          return (
            <div
              key={`${value.id ?? "item"}-${index}`}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2 py-1.5"
            >
              <ArmyIcon item={value} />

              <div className="leading-tight">
                <p className="text-[11px] font-bold">
                  {value.name ?? "Unknown"}
                </p>

                {!hero &&
                  typeof value.quantity === "number" && (
                    <p className="text-[10px] text-white/40">
                      ×{value.quantity}
                    </p>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
