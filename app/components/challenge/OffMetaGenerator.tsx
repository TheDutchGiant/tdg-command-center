"use client";

import { useState } from "react";

type ArmyItem = {
  id?: string;
  name?: string;
  quantity?: number;
};

type HeroItem = {
  id?: string;
  name?: string;
  equipment?: {
    id?: string;
    name?: string;
  }[];
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

const HERO_ICONS: Record<string, string> = {
  "Barbarian King": "heroes/barbarian-king/icon.png",
  "Archer Queen": "heroes/archer-queen/icon.png",
  "Grand Warden": "heroes/grand-warden/icon.png",
  "Flying Grand Warden": "heroes/grand-warden/icon.png",
  "Royal Champion": "heroes/royal-champion/icon.png",
  "Minion Prince": "heroes/minion-prince/icon.png",
  "Dragon Duke": "heroes/dragon-duke/icon.png",
};

function iconPath(item: ArmyItem | HeroItem): string {
  const name = item.name ?? item.id ?? "";

  if (HERO_ICONS[name]) {
    return `${GAME_DATA}/${HERO_ICONS[name]}`;
  }

  const slug = String(item.id ?? name)
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll(".", "")
    .replaceAll("’", "")
    .replaceAll("'", "");

  const lower = name.toLowerCase();

  let category = "troops";

  if (
    lower.includes("king") ||
    lower.includes("queen") ||
    lower.includes("warden") ||
    lower.includes("champion") ||
    lower.includes("prince") ||
    lower.includes("duke")
  ) {
    category = "heroes";
  } else if (
    lower.includes("spell")
  ) {
    category = "spells";
  } else if (
    lower.includes("wrecker") ||
    lower.includes("blimp") ||
    lower.includes("slammer") ||
    lower.includes("launcher") ||
    lower.includes("drill") ||
    lower.includes("flinger") ||
    lower.includes("barracks")
  ) {
    category = "siege-machines";
  } else if (
    lower.includes("phoenix") ||
    lower.includes("spirit fox") ||
    lower.includes("diggy") ||
    lower.includes("lassi") ||
    lower.includes("owl") ||
    lower.includes("unicorn") ||
    lower.includes("yak")
  ) {
    category = "pets";
  }

  return `${GAME_DATA}/${category}/${slug}/icon.png`;
}

function ItemGrid({
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
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">
        {title}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div
            key={`${item.id ?? item.name ?? "item"}-${index}`}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2 py-2"
          >
            <img
              src={iconPath(item)}
              alt=""
              className="h-11 w-11 object-contain"
            />

            <div className="min-w-0">
              <p className="max-w-[110px] truncate text-[11px] font-bold">
                {item.name ?? "Unknown"}
              </p>

              {typeof item.quantity === "number" && (
                <p className="text-[10px] font-bold text-white/40">
                  ×{item.quantity}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroGrid({
  heroes,
}: {
  heroes: HeroItem[];
}) {
  if (heroes.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">
        Heroes
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {heroes.map((hero, index) => (
          <div
            key={`${hero.id ?? hero.name ?? "hero"}-${index}`}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2 py-2"
          >
            <img
              src={iconPath(hero)}
              alt=""
              className="h-11 w-11 object-contain"
            />

            <div className="min-w-0">
              <p className="max-w-[150px] truncate text-[11px] font-bold">
                {hero.name ?? "Unknown"}
              </p>

              {hero.equipment &&
                hero.equipment.length > 0 && (
                  <p className="max-w-[190px] truncate text-[9px] text-white/35">
                    {hero.equipment
                      .map(
                        (equipment) =>
                          equipment.name ?? "Unknown"
                      )
                      .join(" · ")}
                  </p>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
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
      const response =
        await fetch(
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
    <section className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.035] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300/70">
            🧪 TDG Discovery
          </p>

          <h2 className="mt-1 text-2xl font-black">
            Off-Meta Army
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/40">
            Oefen een echte L1-army die buiten de
            20 meest gebruikte compositions valt.
            Iedere beschikbare army wordt binnen
            een cycle maar één keer uitgegeven.
          </p>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-wait disabled:opacity-50"
        >
          {loading
            ? "Army ophalen..."
            : army
              ? "🎲 Nieuwe Off-Meta Army"
              : "🎲 Geef mij een Off-Meta Army"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {army && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/30">
                L1 · Off-Meta · Cycle {army.cycle}
              </p>

              <h3 className="mt-1 text-xl font-black">
                {army.name}
              </h3>

              <p className="mt-1 text-xs text-white/30">
                Deze composition is{" "}
                {army.usageCount.toLocaleString(
                  "nl-NL"
                )}
                × aangetroffen in de verzamelde
                Legend-data.
              </p>
            </div>

            <a
              href={army.armyLink}
              className="shrink-0 rounded-xl border border-orange-400/25 bg-orange-500/10 px-4 py-3 text-center text-sm font-black text-orange-200 transition hover:bg-orange-500/20"
            >
              ⚔️ Open in Clash
            </a>
          </div>

          <div className="mt-5 space-y-5">
            <ItemGrid
              title="Troepen"
              items={army.troops}
            />

            <ItemGrid
              title="Spells"
              items={army.spells}
            />

            {army.siegeMachine && (
              <ItemGrid
                title="Siege Machine"
                items={[
                  army.siegeMachine,
                ]}
              />
            )}

            <HeroGrid
              heroes={army.heroes}
            />

            <ItemGrid
              title="Pets"
              items={army.pets}
            />
          </div>
        </div>
      )}
    </section>
  );
}
