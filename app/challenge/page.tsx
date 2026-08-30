import { prisma } from "@/app/lib/prisma";
import { ensureActiveChallenge } from "@/app/lib/challenge/ensureActiveChallenge";
import ChallengeSubmitForm from "@/app/components/challenge/ChallengeSubmitForm";
import OffMetaGenerator from "@/app/components/challenge/OffMetaGenerator";
import type { GeneratedArmy } from "@/app/lib/challenge/randomArmy";

export const dynamic = "force-dynamic";

const HERO_IDS: Record<string, string> = {
  "Barbarian King": "0",
  "Archer Queen": "1",
  "Grand Warden": "2",
  "Flying Grand Warden": "2m1",
  "Royal Champion": "4",
  "Minion Prince": "6",
};

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

type CatalogDisplayItem = {
  name: string;
  slug: string;
  iconPath: string | null;
  isSuperTroop: boolean;
};

function getCatalogIconPath(
  item?: CatalogDisplayItem
) {
  if (!item?.iconPath) return null;

  return `/game-data/${item.iconPath.replace(
    /^images\/home\//,
    ""
  )}`;
}

function RandomArmyItem({
  item,
  catalog,
}: {
  item: {
    id: string;
    name: string;
    quantity?: number;
  };
  catalog?: CatalogDisplayItem;
}) {
  const icon =
    getCatalogIconPath(catalog);

  return (
    <div
      className="relative flex aspect-square min-w-0 items-center justify-center rounded-lg border border-white/10 bg-black/20 p-0.5"
      title={item.name}
    >
      {icon ? (
        <img
          src={icon}
          alt=""
          className="h-8 w-8 object-contain"
        />
      ) : (
        <span className="text-[8px] text-white/20">
          ?
        </span>
      )}

      {typeof item.quantity === "number" && (
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[7px] font-black leading-3 text-white">
          ×{item.quantity}
        </span>
      )}

      {catalog?.isSuperTroop && (
        <span className="absolute left-0.5 top-0.5 rounded bg-purple-500/80 px-0.5 text-[6px] font-black leading-3 text-white">
          S
        </span>
      )}
    </div>
  );
}

function RandomArmyItems({
  items,
  catalogBySlug,
}: {
  items: {
    id: string;
    name: string;
    quantity?: number;
  }[];
  catalogBySlug: Map<string, CatalogDisplayItem>;
}) {
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-6 gap-1">
      {items.map((item, index) => (
        <RandomArmyItem
          key={`${item.id}-${index}`}
          item={item}
          catalog={catalogBySlug.get(item.id)}
        />
      ))}
    </div>
  );
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

  if (units) {
    armyPart += `u${units}`;
  }

  if (spells) {
    armyPart += `s${spells}`;
  }

  if (heroes) {
    armyPart += `h${heroes}`;
  }

  return `https://link.clashofclans.com/en?action=CopyArmy&army=${armyPart}`;
}

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

  const armyLink =
    buildArmyLink(army);

  // Phoenix Game Catalogus is de centrale bron
  // voor namen, iconen en SuperTroop-status.
  const catalogItems =
    await prisma.gameCatalogItem.findMany({
      where: {
        active: true,
      },
      select: {
        name: true,
        slug: true,
        iconPath: true,
        isSuperTroop: true,
      },
    });

  const catalogBySlug =
    new Map<string, CatalogDisplayItem>();

  for (const item of catalogItems) {
    catalogBySlug.set(
      item.slug,
      {
        name: item.name,
        slug: item.slug,
        iconPath: item.iconPath,
        isSuperTroop: item.isSuperTroop,
      }
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-3 py-5 text-white sm:px-5 sm:py-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-4 flex justify-start">
          <a
            href="/clan/2JLLPVGUU"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/55 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            ⬅️ The Dutch Giant
          </a>
        </div>

        <header className="mb-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">
            🔥 TDG Phoenix Challenge
          </p>

          <p className="mt-1 text-xs text-white/35">
            TH{challenge.townHall} ·{" "}
            {challenge.difficulty.replaceAll(
              "_",
              " "
            )}
          </p>

          {endsAt && (
            <p className="mt-1 text-[10px] text-orange-300/60">
              ⏳ Eindigt op{" "}
              {new Date(
                endsAt
              ).toLocaleString("nl-NL")}
            </p>
          )}
        </header>

        {/* ====================================================
            DESKTOP: OFF-META | BASE | RANDOM ARMY
            MOBIEL: onder elkaar
           ==================================================== */}

        <section className="grid items-start gap-4 lg:grid-cols-3">

          {/* OFF-META */}
          <div className="min-w-0">
            <OffMetaGenerator />
          </div>

          {/* BASE */}
          <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/60">
                  TDG Challenge
                </p>

                <h2 className="mt-1 text-lg font-black">
                  🏰 Challenge Base
                </h2>
              </div>
            </div>

            {base ? (
              <>
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-base font-black">
                    {base.name}
                  </p>

                  <p className="mt-1 text-[10px] text-white/35">
                    TH{base.townHall} ·{" "}
                    {base.category}
                  </p>
                </div>

                <a
                  href={base.baseLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block rounded-xl border border-orange-400/25 bg-orange-500/10 px-4 py-3 text-center text-xs font-black text-orange-200 transition hover:bg-orange-500/20"
                >
                  🏰 Open Challenge Base
                </a>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
                <p className="text-sm font-bold text-white/25">
                  Geen geschikte base beschikbaar.
                </p>
              </div>
            )}
          </section>

          {/* RANDOM ARMY */}
          <section className="min-w-0 rounded-2xl border border-orange-400/20 bg-orange-500/[0.035] p-2.5 sm:p-5">

            {/* Challenge titel hoort bij Random Army */}
            <div className="mb-2 border-b border-white/10 pb-2 sm:mb-4 sm:pb-3">
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-orange-300/60 sm:text-[10px]">
                TDG Random Army Challenge
              </p>

              <h2 className="mt-0.5 text-sm font-black sm:text-lg">
                {challenge.title}
              </h2>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-orange-300/60 sm:text-[10px]">
                  Random Army
                </p>

                <h3 className="mt-0.5 text-sm font-black sm:text-lg">
                  🎲 Army
                </h3>
              </div>

              <a
                href={armyLink}
                className="shrink-0 rounded-lg border border-orange-400/25 bg-orange-500/10 px-2 py-1.5 text-[8px] font-black text-orange-200 transition hover:bg-orange-500/20 sm:px-3 sm:py-2 sm:text-[10px]"
              >
                ⚔️ Clash
              </a>
            </div>

            <div className="mt-2 space-y-2 sm:mt-4 sm:space-y-3">

              <RandomArmyItems
                items={army.troops ?? []}
                catalogBySlug={catalogBySlug}
              />

              <RandomArmyItems
                items={army.spells ?? []}
                catalogBySlug={catalogBySlug}
              />

              {army.siegeMachine && (
                <RandomArmyItems
                  items={[
                    {
                      id: army.siegeMachine.id,
                      name: army.siegeMachine.name,
                      quantity: 1,
                    },
                  ]}
                  catalogBySlug={catalogBySlug}
                />
              )}

              {army.heroes &&
                army.heroes.length > 0 && (
                  <div className="grid grid-cols-4 gap-1">
                    {army.heroes.map(
                      (hero, index) => {
                        const heroCatalog =
                          catalogBySlug.get(
                            hero.id
                          );

                        return (
                          <div
                            key={`${hero.name}-${index}`}
                            className="flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-black/20 p-0.5"
                            title={hero.name}
                          >
                            {getCatalogIconPath(
                              heroCatalog
                            ) ? (
                              <img
                                src={
                                  getCatalogIconPath(
                                    heroCatalog
                                  )!
                                }
                                alt=""
                                className="h-8 w-8 object-contain"
                              />
                            ) : (
                              <span className="text-[8px] text-white/20">
                                ?
                              </span>
                            )}

                            {hero.equipment &&
                              hero.equipment.length > 0 && (
                                <div className="mt-0.5 flex items-center justify-center gap-0.5">
                                  {hero.equipment
                                    .slice(0, 2)
                                    .map(
                                      (
                                        equipment,
                                        equipmentIndex
                                      ) => {
                                        const equipmentCatalog =
                                          catalogBySlug.get(
                                            equipment.id
                                          );

                                        const equipmentIcon =
                                          getCatalogIconPath(
                                            equipmentCatalog
                                          );

                                        return (
                                          <div
                                            key={`${equipment.name}-${equipmentIndex}`}
                                            className="flex h-4 w-4 items-center justify-center"
                                            title={
                                              equipment.name
                                            }
                                          >
                                            {equipmentIcon ? (
                                              <img
                                                src={
                                                  equipmentIcon
                                                }
                                                alt=""
                                                className="h-4 w-4 object-contain"
                                              />
                                            ) : (
                                              <span className="text-[6px] text-white/20">
                                                ?
                                              </span>
                                            )}
                                          </div>
                                        );
                                      }
                                    )}
                                </div>
                              )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

              <RandomArmyItems
                items={army.pets ?? []}
                catalogBySlug={catalogBySlug}
              />
            </div>

            <a
              href={armyLink}
              className="mt-2 block rounded-lg border border-orange-400/25 bg-orange-500/[0.08] px-2 py-2 text-center text-[9px] font-black text-orange-200 transition hover:bg-orange-500/15 sm:mt-3 sm:px-4 sm:py-3 sm:text-xs"
            >
              ⚔️ Copy Army
            </a>
          </section>

        </section>

        {/* ====================================================
            MEEDOEN
           ==================================================== */}

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                Challenge
              </p>

              <h2 className="mt-1 text-lg font-black">
                📸 Meedoen
              </h2>

              <p className="mt-2 max-w-2xl text-xs leading-5 text-white/40">
                Doe de challenge met exact deze
                army en deze base. Upload daarna
                alleen je screenshot. Phoenix
                controleert het resultaat automatisch.
              </p>
            </div>

            <div className="w-full lg:max-w-md">
              <ChallengeSubmitForm />
            </div>
          </div>
        </section>

        {/* ====================================================
            LEADERBOARD
           ==================================================== */}

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">
              🏆 Leaderboard
            </h2>

            <span className="text-[10px] font-bold text-white/25">
              {entries.length} deelnemers
            </span>
          </div>

          {entries.length === 0 ? (
            <p className="mt-4 text-xs text-white/30">
              Nog geen gevalideerde resultaten.
            </p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {entries.map(
                (entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5"
                  >
                    <span className="w-7 text-center text-xs font-black text-white/30">
                      #{index + 1}
                    </span>

                    <span className="min-w-0 flex-1 truncate text-xs font-bold">
                      {entry.playerName}
                    </span>

                    <span className="text-[10px] font-bold text-white/50">
                      {entry.result?.stars ??
                        0}
                      ⭐
                    </span>

                    <span className="text-[10px] font-bold text-orange-300">
                      {entry.result?.destruction ??
                        0}
                      %
                    </span>

                    <span className="w-14 text-right text-[10px] font-black">
                      {entry.result?.score ??
                        0}
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
