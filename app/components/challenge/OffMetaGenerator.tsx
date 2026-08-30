"use client";

import { useState } from "react";

type ArmyItem = {
  id?: string;
  name?: string;
  quantity?: number;
  iconPath?: string | null;
  isSuperTroop?: boolean;
  catalogItemId?: number | null;
};

type EquipmentItem = {
  id?: string;
  name?: string;
  iconPath?: string | null;
  catalogItemId?: number | null;
};

type HeroItem = {
  id?: string;
  name?: string;
  iconPath?: string | null;
  catalogItemId?: number | null;
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

function getIconCandidates(
  item?: {
    iconPath?: string | null;
  } | null
): string[] {
  if (!item?.iconPath) {
    return [];
  }

  const normalized = item.iconPath.replace(
    /^images\/home\//,
    ""
  );

  const candidates = [
    normalized,

    // Super Troop variant:
    // troops/miner/super/icon.png
    // ↔ troops/miner/super-icon.png
    normalized.replace(
      /\/super\/icon\.png$/,
      "/super-icon.png"
    ),

    normalized.replace(
      /\/super-icon\.png$/,
      "/super/icon.png"
    ),

    // Sommige oude/nieuwe assets gebruiken een
    // variant-directory in plaats van super.
    normalized.replace(
      /\/super\/icon\.png$/,
      "/super/icon.webp"
    ),

    normalized.replace(
      /\/super-icon\.png$/,
      "/super-icon.webp"
    ),

    normalized.replace(
      /\/icon\.png$/,
      "/icon.webp"
    ),
  ];

  return [
    ...new Set(
      candidates.map(
        (candidate) =>
          `${GAME_DATA}/${candidate}`
      )
    ),
  ];
}

function Icon({
  item,
  size = "normal",
}: {
  item?: {
    iconPath?: string | null;
    name?: string;
  } | null;
  size?: "small" | "normal";
}) {
  const candidates = getIconCandidates(item);

  const imageClass =
    size === "small"
      ? "h-8 w-8 object-contain"
      : "h-10 w-10 object-contain";

  const boxClass =
    size === "small"
      ? "h-9 w-9"
      : "h-12 w-12";

  const [candidateIndex, setCandidateIndex] =
    useState(0);

  const icon =
    candidates[candidateIndex] ?? null;

  if (!icon) {
    return (
      <div
        className={`flex ${boxClass} shrink-0 items-center justify-center`}
      >
        <span className="text-xs text-white/20">
          ?
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex ${boxClass} shrink-0 items-center justify-center`}
    >
      <img
        src={icon}
        alt=""
        className={imageClass}
        onError={() => {
          setCandidateIndex((current) => {
            if (current + 1 < candidates.length) {
              return current + 1;
            }

            return current;
          });
        }}
      />

      {candidateIndex >= candidates.length && (
        <span className="text-xs text-white/20">
          ?
        </span>
      )}
    </div>
  );
}

function CompactItem({
  item,
}: {
  item: ArmyItem;
}) {
  return (
    <div
      className="relative flex aspect-square w-full items-center justify-center rounded-lg border border-white/10 bg-black/20"
      title={item.name ?? "Unknown"}
    >
      <Icon item={item} />

      {typeof item.quantity === "number" && (
        <span className="absolute bottom-1 right-1 rounded-md bg-black/80 px-1.5 py-0.5 text-[9px] font-black leading-none text-white">
          ×{item.quantity}
        </span>
      )}

      {item.isSuperTroop && (
        <span className="absolute left-1 top-1 rounded-md bg-purple-500/80 px-1 py-0.5 text-[7px] font-black leading-none text-white">
          S
        </span>
      )}
    </div>
  );
}

function CompactSection({
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
      <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/25">
        {title}
      </p>

      <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
        {items.map((item, index) => (
          <CompactItem
            key={`${item.id ?? item.name ?? "item"}-${index}`}
            item={item}
          />
        ))}
      </div>
    </section>
  );
}

function HeroItem({
  hero,
}: {
  hero: HeroItem;
}) {
  return (
    <div
      className="flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-black/20 p-1"
      title={hero.name ?? "Hero"}
    >
      <Icon
        item={hero}
        size="small"
      />

      {hero.equipment &&
        hero.equipment.length > 0 && (
          <div className="mt-1 flex items-center justify-center gap-0.5">
            {hero.equipment
              .slice(0, 2)
              .map(
                (equipment, index) => (
                  <div
                    key={`${equipment.id ?? equipment.name ?? "equipment"}-${index}`}
                    className="flex h-5 w-5 items-center justify-center rounded-md border border-white/10 bg-neutral-950"
                    title={
                      equipment.name ??
                      "Equipment"
                    }
                  >
                    <Icon
                      item={equipment}
                      size="small"
                    />
                  </div>
                )
              )}
          </div>
        )}
    </div>
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
      <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/25">
        Heroes
      </p>

      <div className="grid grid-cols-4 gap-1 sm:grid-cols-4">
        {heroes.map((hero, index) => (
          <HeroItem
            key={`${hero.id ?? hero.name ?? "hero"}-${index}`}
            hero={hero}
          />
        ))}
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
    <section className="h-full overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.035]">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300/70">
              🧪 TDG Discovery
            </p>

            <h2 className="mt-1 text-lg font-black">
              Off-Meta Army
            </h2>

            <p className="mt-1 text-[10px] leading-4 text-white/30">
              Buiten de 20 meest gebruikte
              compositions.
            </p>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="shrink-0 rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-[10px] font-black text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-wait disabled:opacity-50"
          >
            {loading
              ? "..."
              : army
                ? "🎲 Nieuwe"
                : "🎲 Geef Army"}
          </button>
        </div>
      </div>

      {error && (
        <div className="m-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
          {error}
        </div>
      )}

      {army ? (
        <div className="p-2.5">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black">
                  {army.name}
                </h3>

                <p className="mt-1 text-[9px] leading-4 text-white/35">
                  {army.usageCount.toLocaleString(
                    "nl-NL"
                  )}
                  × gebruikt ·{" "}
                  {army.daysSeen} dagen · Cycle{" "}
                  {army.cycle}
                </p>
              </div>

              <a
                href={army.armyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg border border-orange-400/25 bg-orange-500/10 px-2.5 py-2 text-[9px] font-black text-orange-200 transition hover:bg-orange-500/20"
              >
                ⚔️ Clash
              </a>
            </div>

            <div className="mt-2 space-y-2">
              <CompactSection
                title="Troepen"
                items={army.troops}
              />

              <CompactSection
                title="Spells"
                items={army.spells}
              />

              {army.siegeMachine && (
                <CompactSection
                  title="Siege"
                  items={[
                    army.siegeMachine,
                  ]}
                />
              )}

              <HeroSection
                heroes={army.heroes}
              />

              <CompactSection
                title="Pets"
                items={army.pets}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[190px] items-center justify-center p-4 text-center">
          <div>
            <p className="text-xs font-bold text-white/20">
              Geef mij een Off-Meta Army
            </p>

            <p className="mt-1 text-[10px] text-white/15">
              Iedere army wordt binnen een cycle
              één keer uitgegeven.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
