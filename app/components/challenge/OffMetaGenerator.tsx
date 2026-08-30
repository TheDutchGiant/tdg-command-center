"use client";

import { useState } from "react";

type ArmyItem = {
  id?: string;
  name?: string;
  quantity?: number;
  iconPath?: string | null;
  isSuperTroop?: boolean;
};

type EquipmentItem = {
  id?: string;
  name?: string;
  iconPath?: string | null;
};

type HeroItem = {
  id?: string;
  name?: string;
  iconPath?: string | null;
  equipment?: EquipmentItem[];
};

type OffMetaArmy = {
  id: number;
  tier: string;
  cycle: number;
  name: string;
  armyShareCode: string;
  armyLink: string;
  usageCount: number;
  usagePercentage: number;
  daysSeen: number;
  source: string;
  troops: ArmyItem[];
  spells: ArmyItem[];
  siegeMachine: ArmyItem | null;
  heroes: HeroItem[];
  pets: ArmyItem[];
};

const GAME_DATA = "/game-data";

function getIconPath(
  item?: {
    iconPath?: string | null;
  } | null
): string | null {
  if (!item?.iconPath) {
    return null;
  }

  const normalizedPath =
    item.iconPath
      .replace(/^images\/home\//, "");

  return `${GAME_DATA}/${normalizedPath}`;
}

function ItemCard({
  item,
}: {
  item: ArmyItem;
}) {
  const icon = getIconPath(item);

  return (
    <div className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.025] px-2.5 py-2 transition hover:border-emerald-300/20 hover:bg-white/[0.04]">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black/30">
        {icon ? (
          <img
            src={icon}
            alt=""
            className="h-11 w-11 object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
              const fallback =
                event.currentTarget.parentElement?.querySelector(
                  "[data-icon-fallback]"
                );

              if (fallback) {
                fallback.classList.remove("hidden");
              }
            }}
          />
        ) : null}

        <span
          data-icon-fallback
          className={icon ? "hidden text-lg text-white/20" : "text-lg text-white/20"}
        >
          ?
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="max-w-[150px] truncate text-xs font-black">
            {item.name ?? "Unknown"}
          </p>

          {item.isSuperTroop && (
            <span className="shrink-0 rounded-md border border-purple-300/20 bg-purple-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-purple-200">
              Super
            </span>
          )}
        </div>

        {typeof item.quantity === "number" && (
          <p className="mt-0.5 text-[11px] font-bold text-white/40">
            ×{item.quantity}
          </p>
        )}
      </div>
    </div>
  );
}

function EquipmentCard({
  item,
}: {
  item: EquipmentItem;
}) {
  const icon = getIconPath(item);

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-2 py-1.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
        {icon ? (
          <img
            src={icon}
            alt=""
            className="h-8 w-8 object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
              const fallback =
                event.currentTarget.parentElement?.querySelector(
                  "[data-icon-fallback]"
                );

              if (fallback) {
                fallback.classList.remove("hidden");
              }
            }}
          />
        ) : null}

        <span
          data-icon-fallback
          className={icon ? "hidden text-sm text-white/20" : "text-sm text-white/20"}
        >
          ?
        </span>
      </div>

      <p className="max-w-[130px] truncate text-[10px] font-bold text-white/60">
        {item.name ?? "Unknown"}
      </p>
    </div>
  );
}

function ItemSection({
  title,
  items,
}: {
  title: string;
  items: ArmyItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
          {title}
        </p>

        <span className="text-[10px] font-bold text-white/20">
          {items.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <ItemCard
            key={`${item.id ?? item.name ?? "item"}-${index}`}
            item={item}
          />
        ))}
      </div>
    </section>
  );
}

function HeroSection({
  heroes,
}: {
  heroes: HeroItem[];
}) {
  if (heroes.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
          Heroes
        </p>

        <span className="text-[10px] font-bold text-white/20">
          {heroes.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {heroes.map((hero, index) => {
          const icon = getIconPath(hero);

          return (
            <div
              key={`${hero.id ?? hero.name ?? "hero"}-${index}`}
              className="rounded-xl border border-white/10 bg-white/[0.025] p-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black/30">
                  {icon ? (
                    <img
                      src={icon}
                      alt=""
                      className="h-11 w-11 object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        const fallback =
                          event.currentTarget.parentElement?.querySelector(
                            "[data-icon-fallback]"
                          );

                        if (fallback) {
                          fallback.classList.remove("hidden");
                        }
                      }}
                    />
                  ) : null}

                  <span
                    data-icon-fallback
                    className={
                      icon
                        ? "hidden text-lg text-white/20"
                        : "text-lg text-white/20"
                    }
                  >
                    ?
                  </span>
                </div>

                <p className="min-w-0 flex-1 truncate text-xs font-black">
                  {hero.name ?? "Unknown"}
                </p>
              </div>

              {hero.equipment &&
                hero.equipment.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {hero.equipment.map(
                      (equipment, equipmentIndex) => (
                        <EquipmentCard
                          key={`${equipment.id ?? equipment.name ?? "equipment"}-${equipmentIndex}`}
                          item={equipment}
                        />
                      )
                    )}
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function OffMetaGenerator() {
  const [army, setArmy] =
    useState<OffMetaArmy | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/challenge/off-meta?tier=L1",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as {
          success?: boolean;
          army?: OffMetaArmy;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success ||
        !data.army
      ) {
        throw new Error(
          data.error ??
            "De Off-Meta army kon niet worden opgehaald."
        );
      }

      setArmy(data.army);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Onbekende fout."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.035]">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300/70">
              🧪 TDG Discovery
            </p>

            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              Off-Meta Army
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Oefen een echte L1-army buiten de 20
              meest gebruikte compositions. Iedere
              unieke army wordt binnen een cycle
              één keer uitgegeven.
            </p>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="shrink-0 rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-wait disabled:opacity-50"
          >
            {loading
              ? "Army ophalen..."
              : army
                ? "🎲 Nieuwe Off-Meta Army"
                : "🎲 Geef mij een Off-Meta Army"}
          </button>
        </div>
      </div>

      {error && (
        <div className="m-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {army && (
        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-white/10 bg-black/20">
            <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">
                    L1 Off-Meta
                  </span>

                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/40">
                    Cycle {army.cycle}
                  </span>
                </div>

                <h3 className="mt-3 text-2xl font-black">
                  {army.name}
                </h3>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/35">
                  <span>
                    {army.usageCount.toLocaleString(
                      "nl-NL"
                    )}{" "}
                    × gebruikt
                  </span>

                  <span>
                    {army.usagePercentage.toLocaleString(
                      "nl-NL",
                      {
                        maximumFractionDigits: 1,
                      }
                    )}
                    % van de aanvallen
                  </span>

                  <span>
                    {army.daysSeen} dagen gezien
                  </span>
                </div>
              </div>

              <a
                href={army.armyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-xl border border-orange-400/25 bg-orange-500/10 px-5 py-3 text-center text-sm font-black text-orange-200 transition hover:bg-orange-500/20"
              >
                ⚔️ Open deze Army in Clash
              </a>
            </div>

            <div className="space-y-6 p-4 sm:p-5">
              <ItemSection
                title="Troepen"
                items={army.troops}
              />

              <ItemSection
                title="Spells"
                items={army.spells}
              />

              {army.siegeMachine && (
                <ItemSection
                  title="Siege Machine"
                  items={[army.siegeMachine]}
                />
              )}

              <HeroSection
                heroes={army.heroes}
              />

              <ItemSection
                title="Pets"
                items={army.pets}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
