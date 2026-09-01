"use client";

import { useMemo, useState } from "react";
import ChallengeSubmitForm from "@/app/components/challenge/ChallengeSubmitForm";

type CatalogItem = {
  name: string;
  slug: string;
  iconPath: string | null;
  isSuperTroop: boolean;
};

type ArmyItem = {
  id: string;
  name: string;
  quantity?: number;
};

type ArmyHero = {
  id: string;
  name: string;
  equipment?: {
    id: string;
    name: string;
  }[];
};

type Army = {
  townHall: number;
  troops?: ArmyItem[];
  spells?: ArmyItem[];
  siegeMachine?: ArmyItem | null;
  heroes?: ArmyHero[];
  pets?: ArmyItem[];
};

type Variant = {
  id: number;
  difficulty: string;
  mutatedPercent: number;
  originalArmy: Army | null;
  army: unknown;
  armyShareCode: string | null;
  sourceArmyId: number;
  sourceArmyName: string;
};

type Props = {
  challengeId: number;
  title: string;
  townHall: number;
  generationAt: string;
  endsAt: string;
  variants: Variant[];
  catalog: CatalogItem[];
};

const DIFFICULTIES = [
  {
    key: "OH_MY_GOD",
    title: "OH MY GOD",
    emoji: "😇",
    subtitle: "Dit valt nog wel mee...",
  },
  {
    key: "OH_HELL_NO",
    title: "OH HELL NO",
    emoji: "😈",
    subtitle: "Dit gaat pijn doen.",
  },
  {
    key: "FUCK_MY_LIFE",
    title: "FUCK MY LIFE",
    emoji: "💀",
    subtitle: "Succes. Echt.",
  },
] as const;

function iconPath(
  item?: CatalogItem,
): string | null {
  if (!item?.iconPath) {
    return null;
  }

  return `/game-data/${item.iconPath.replace(
    /^images\/home\//,
    "",
  )}`;
}

function ArmyItem({
  item,
  catalogBySlug,
}: {
  item: ArmyItem;
  catalogBySlug: Map<string, CatalogItem>;
}) {
  const catalog =
    catalogBySlug.get(item.id) ??
    catalogBySlug.get(item.id.toLowerCase()) ??
    catalogBySlug.get(
      item.id
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase(),
    ) ??
    catalogBySlug.get(item.name) ??
    catalogBySlug.get(item.name.toLowerCase()) ??
    catalogBySlug.get(
      item.name
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase(),
    );

  const src =
    iconPath(catalog);

  return (
    <div
      className="relative flex aspect-square min-w-0 items-center justify-center rounded-lg border border-white/10 bg-black/20 p-0.5"
      title={item.name}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="h-8 w-8 object-contain"
        />
      ) : (
        <span className="text-[8px] text-white/20">
          ?
        </span>
      )}

      {typeof item.quantity ===
        "number" && (
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

function ArmyContents({
  army,
  catalogBySlug,
}: {
  army: Army;
  catalogBySlug: Map<string, CatalogItem>;
}) {
  return (
    <div className="mt-2 space-y-2">
      {!!army.troops?.length && (
        <div className="grid grid-cols-6 gap-1">
          {army.troops.map(
            (
              item,
              index,
            ) => (
              <ArmyItem
                key={`${item.id}-${index}`}
                item={item}
                catalogBySlug={
                  catalogBySlug
                }
              />
            ),
          )}
        </div>
      )}

      {!!army.spells?.length && (
        <div className="grid grid-cols-6 gap-1">
          {army.spells.map(
            (
              item,
              index,
            ) => (
              <ArmyItem
                key={`spell-${item.id}-${index}`}
                item={item}
                catalogBySlug={
                  catalogBySlug
                }
              />
            ),
          )}
        </div>
      )}

      {army.siegeMachine && (
        <div>
          <p className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/25">
            Siege Machine
          </p>

          <div className="grid grid-cols-6 gap-1">
            <ArmyItem
              item={{
                id:
                  army.siegeMachine.id,
                name:
                  army.siegeMachine.name,
                quantity:
                  army.siegeMachine
                    .quantity ?? 1,
              }}
              catalogBySlug={
                catalogBySlug
              }
            />
          </div>
        </div>
      )}

      {!!army.heroes?.length && (
        <div className="grid grid-cols-4 gap-1">
          {army.heroes.map(
            (
              hero,
              index,
            ) => {
              const catalog =
                catalogBySlug.get(hero.id) ??
                catalogBySlug.get(hero.id.toLowerCase()) ??
                catalogBySlug.get(
                  hero.id
                    .replace(/[^a-z0-9]/gi, "")
                    .toLowerCase(),
                ) ??
                catalogBySlug.get(hero.name) ??
                catalogBySlug.get(hero.name.toLowerCase()) ??
                catalogBySlug.get(
                  hero.name
                    .replace(/[^a-z0-9]/gi, "")
                    .toLowerCase(),
                );

              const src =
                iconPath(
                  catalog,
                );

              return (
                <div
                  key={`${hero.name}-${index}`}
                  className="flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-black/20 p-0.5"
                  title={hero.name}
                >
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      className="h-8 w-8 object-contain"
                    />
                  ) : (
                    <span className="text-[8px] text-white/20">
                      ?
                    </span>
                  )}

                  {!!hero.equipment
                    ?.length && (
                    <div className="mt-0.5 flex items-center justify-center gap-0.5">
                      {hero.equipment
                        .slice(
                          0,
                          2,
                        )
                        .map(
                          (
                            equipment,
                            equipmentIndex,
                          ) => {
                            const equipmentCatalog =
                              catalogBySlug.get(equipment.id) ??
                              catalogBySlug.get(equipment.id.toLowerCase()) ??
                              catalogBySlug.get(
                                equipment.id
                                  .replace(/[^a-z0-9]/gi, "")
                                  .toLowerCase(),
                              ) ??
                              catalogBySlug.get(equipment.name) ??
                              catalogBySlug.get(equipment.name.toLowerCase()) ??
                              catalogBySlug.get(
                                equipment.name
                                  .replace(/[^a-z0-9]/gi, "")
                                  .toLowerCase(),
                              );

                            const equipmentSrc =
                              iconPath(
                                equipmentCatalog,
                              );

                            return (
                              <div
                                key={`${equipment.id}-${equipmentIndex}`}
                                className="flex h-4 w-4 items-center justify-center"
                                title={
                                  equipment.name
                                }
                              >
                                {equipmentSrc ? (
                                  <img
                                    src={
                                      equipmentSrc
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
                          },
                        )}
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}

      {!!army.pets?.length && (
        <div className="grid grid-cols-6 gap-1">
          {army.pets.map(
            (
              item,
              index,
            ) => (
              <ArmyItem
                key={`pet-${item.id}-${index}`}
                item={item}
                catalogBySlug={
                  catalogBySlug
                }
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function remaining(
  target: string,
) {
  const diff =
    new Date(
      target,
    ).getTime() -
    Date.now();

  if (diff <= 0) {
    return "Beschikbaar";
  }

  const seconds =
    Math.floor(
      diff / 1000,
    );

  const days =
    Math.floor(
      seconds / 86400,
    );

  const hours =
    Math.floor(
      (seconds % 86400) /
        3600,
    );

  const minutes =
    Math.floor(
      (seconds % 3600) /
        60,
    );

  const secs =
    seconds % 60;

  return [
    days > 0
      ? `${days}d`
      : null,
    `${hours}u`,
    `${minutes}m`,
    `${secs}s`,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function RandomArmyChallenge({
  challengeId,
  title,
  townHall,
  generationAt,
  endsAt,
  variants,
  catalog,
}: Props) {
  const [
    selectedDifficulty,
    setSelectedDifficulty,
  ] =
    useState<
      string | null
    >(null);

  const [
    generated,
    setGenerated,
  ] =
    useState(false);

  const catalogBySlug =
    useMemo(() => {
      const map = new Map<string, CatalogItem>();

      const add = (
        value: unknown,
        item: CatalogItem,
      ) => {
        if (typeof value !== "string" || !value) {
          return;
        }

        map.set(value, item);
        map.set(value.toLowerCase(), item);
        map.set(
          value
            .replace(/[^a-z0-9]/gi, "")
            .toLowerCase(),
          item,
        );
      };

      for (const item of catalog) {
        add(item.slug, item);
        add(item.name, item);
      }

      return map;
    }, [catalog]);

  const selectedVariant =
    variants.find(
      (variant) =>
        variant.difficulty ===
        selectedDifficulty,
    ) ?? null;

  const generationReady =
    new Date(
      generationAt,
    ).getTime() <=
    Date.now();

  return (
    <section className="min-w-0 rounded-2xl border border-orange-400/20 bg-orange-500/[0.035] p-2.5 sm:p-4">
      <div className="mb-2 border-b border-white/10 pb-2 sm:mb-4 sm:pb-3">
        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-orange-300/60 sm:text-[10px]">
          🔥 TDG Phoenix Challenge · TH
          {townHall}
        </p>

        <h2 className="mt-0.5 text-sm font-black sm:text-lg">
          {title}
        </h2>

        <p className="mt-1 text-[8px] text-white/40 sm:text-[10px]">
          {generationReady
            ? "De drie armies zijn gelocked."
            : `Generator over ${remaining(
                generationAt,
              )}`}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {DIFFICULTIES.map(
          (difficulty) => {
            const variant =
              variants.find(
                (item) =>
                  item.difficulty ===
                  difficulty.key,
              );

            const selected =
              selectedDifficulty ===
              difficulty.key;

            return (
              <button
                key={
                  difficulty.key
                }
                type="button"
                disabled={
                  !variant
                }
                onClick={() => {
                  setSelectedDifficulty(
                    difficulty.key,
                  );

                  setGenerated(
                    false,
                  );
                }}
                className={[
                  "rounded-xl border px-1.5 py-2 text-center transition",
                  selected
                    ? "border-orange-300/60 bg-orange-500/20"
                    : "border-white/10 bg-black/20 hover:border-orange-300/25",
                  !variant
                    ? "cursor-not-allowed opacity-40"
                    : "",
                ].join(" ")}
              >
                <div className="text-lg leading-none">
                  {
                    difficulty.emoji
                  }
                </div>

                <div className="mt-1 text-[8px] font-black leading-tight sm:text-[10px]">
                  {
                    difficulty.title
                  }
                </div>

                <div className="mt-1 text-[7px] text-white/30 sm:text-[8px]">
                  {variant
                    ? `${variant.mutatedPercent}%`
                    : "locked"}
                </div>
              </button>
            );
          },
        )}
      </div>

      <button
        type="button"
        disabled={
          !generationReady ||
          !selectedVariant
        }
        onClick={() =>
          setGenerated(
            true,
          )
        }
        className="mt-2 w-full rounded-lg border border-orange-400/25 bg-orange-500/10 px-3 py-2 text-[9px] font-black text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
      >
        {generationReady
          ? "🎲 Genereer mijn army"
          : `⏳ ${remaining(
              generationAt,
            )}`}
      </button>

      {generated &&
        selectedVariant && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2.5 sm:p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-orange-300/60">
                  {selectedVariant.difficulty.replaceAll(
                    "_",
                    " ",
                  )}
                </p>

                <p className="mt-1 text-sm font-black sm:text-base">
                  🧬{" "}
                  {
                    selectedVariant.mutatedPercent
                  }
                  % mutated
                </p>

                <p className="mt-0.5 text-[8px] text-white/25">
                  Basis:{" "}
                  {
                    selectedVariant.sourceArmyName
                  }
                </p>
              </div>

              {selectedVariant.armyShareCode && (
                <a
                  href={
                    selectedVariant.armyShareCode
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border border-orange-400/25 bg-orange-500/10 px-2 py-1.5 text-[8px] font-black text-orange-200"
                >
                  ⚔️ Clash
                </a>
              )}
            </div>

            {selectedVariant.originalArmy != null && (
              <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.02] p-2">
                <p className="mb-2 text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
                  YOU COULD HAVE HAD THIS ARMY
                </p>

                <div className="[&_img]:h-5 [&_img]:w-5 sm:[&_img]:h-7 sm:[&_img]:w-7 [&_.grid]:gap-0.5 sm:[&_.grid]:gap-1">
                  <ArmyContents
                    army={
                      selectedVariant.originalArmy as Army
                    }
                    catalogBySlug={
                      catalogBySlug
                    }
                  />
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-[8px] font-black uppercase tracking-[0.18em] text-orange-300/60">
                BUT YOU CHOSE VIOLENCE INSTEAD AND ENDED UP WITH THIS MONSTROSITY
              </p>

              <ArmyContents
                army={
                  selectedVariant.army as Army
                }
                catalogBySlug={
                  catalogBySlug
                }
              />
            </div>

            {selectedVariant.armyShareCode && (
              <a
                href={
                  selectedVariant.armyShareCode
                }
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block rounded-lg border border-orange-400/25 bg-orange-500/[0.08] px-2 py-2 text-center text-[9px] font-black text-orange-200 sm:px-4 sm:py-3 sm:text-xs"
              >
                ⚔️ Copy Army
              </a>
            )}

            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-orange-300/50">
                Gekozen variant
              </p>

              <p className="mt-1 text-[10px] text-white/40">
                {selectedVariant.difficulty.replaceAll(
                  "_",
                  " ",
                )}{" "}
                ·{" "}
                {
                  selectedVariant.mutatedPercent
                }
                %
              </p>

              <p className="mt-1 text-[9px] text-white/20">
                De inzending kan straks
                rechtstreeks aan deze
                variant worden gekoppeld.
              </p>
            </div>
          </div>
        )}

      <p className="mt-2 text-center text-[8px] text-white/20">
        Challenge eindigt{" "}
        {new Date(
          endsAt,
        ).toLocaleString(
          "nl-NL",
        )}
      </p>
    </section>
  );
}
