import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";

const CLASHKING_BASE_URL = process.env.CLASHKING_API_URL || "https://go.api.clashk.ing/v2";

type DiscoveryTier = "L1" | "L2" | "L3";

type RawArmy = Record<string, unknown>;

type NormalizedArmy = {
  tier: DiscoveryTier;
  fingerprint: string;
  armyShareCode: string | null;
  troops: unknown[];
  spells: unknown[];
  siegeMachine: unknown | null;
  heroes: unknown[];
  pets: unknown[];
  usageCount: number;
  usagePercentage: number;
};

function asRecord(value: unknown): RawArmy | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as RawArmy
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function stringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeTier(value: unknown): DiscoveryTier | null {
  if (typeof value !== "string") return null;

  const v = value
    .trim()
    .toUpperCase()
    .replace(/^LEGEND[ _-]*/i, "");

  if (v === "L1" || v === "1" || v === "I") return "L1";
  if (v === "L2" || v === "2" || v === "II") return "L2";
  if (v === "L3" || v === "3" || v === "III") return "L3";

  return null;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(object).sort()) {
      result[key] = canonicalize(object[key]);
    }

    return result;
  }

  return value;
}

function fingerprintArmy(data: {
  troops: unknown[];
  spells: unknown[];
  siegeMachine: unknown | null;
  heroes: unknown[];
  pets: unknown[];
}): string {
  return JSON.stringify(
    canonicalize({
      troops: data.troops,
      spells: data.spells,
      siegeMachine: data.siegeMachine,
      heroes: data.heroes,
      pets: data.pets,
    })
  );
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const record = asRecord(payload);
  if (!record) return [];

  for (const key of ["armies", "data", "results", "items"]) {
    if (Array.isArray(record[key])) return record[key];
  }

  return [];
}

function normalizeArmy(value: unknown): NormalizedArmy | null {
  const raw = asRecord(value);
  if (!raw) return null;

  const tier = normalizeTier(
    raw.tier ??
    raw.league ??
    raw.leagueTier ??
    raw.league_tier ??
    raw.legendLeague ??
    raw.legend_league
  );

  if (!tier) return null;

  const troops = asArray(raw.troops ?? raw.units ?? raw.army);
  const spells = asArray(raw.spells);
  const heroes = asArray(raw.heroes);
  const pets = asArray(raw.pets);

  const siegeMachine =
    raw.siegeMachine ??
    raw.siege_machine ??
    raw.siege ??
    null;

  const armyShareCode = stringValue(
    raw.armyShareCode,
    raw.army_share_code,
    raw.shareCode,
    raw.share_code
  );

  const usageCount = numberValue(
    raw.usageCount,
    raw.usage_count,
    raw.uses,
    raw.count
  );

  const usagePercentage = numberValue(
    raw.usagePercentage,
    raw.usage_percentage,
    raw.usageRate,
    raw.usage_rate,
    raw.percentage
  );

  if (
    troops.length === 0 &&
    spells.length === 0 &&
    heroes.length === 0 &&
    pets.length === 0 &&
    siegeMachine === null
  ) {
    return null;
  }

  return {
    tier,
    fingerprint: fingerprintArmy({
      troops,
      spells,
      siegeMachine,
      heroes,
      pets,
    }),
    armyShareCode,
    troops,
    spells,
    siegeMachine,
    heroes,
    pets,
    usageCount,
    usagePercentage,
  };
}

async function fetchClashKing(): Promise<unknown> {
  const response = await fetch(
    `${CLASHKING_BASE_URL}/v2/battlelogs/ranked/armies`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "TDG-Phoenix/1.0",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `ClashKing gaf HTTP ${response.status}`
    );
  }

  return response.json();
}

export async function importDiscoveryArmies() {
  const payload = await fetchClashKing();
  const rows = extractRows(payload);

  const normalized = rows
    .map(normalizeArmy)
    .filter(
      (army): army is NormalizedArmy => army !== null
    );

  const unique = new Map<string, NormalizedArmy>();

  for (const army of normalized) {
    const key = `${army.tier}:${army.fingerprint}`;
    const existing = unique.get(key);

    if (!existing) {
      unique.set(key, army);
      continue;
    }

    existing.usageCount += army.usageCount;
    existing.usagePercentage += army.usagePercentage;

    if (!existing.armyShareCode && army.armyShareCode) {
      existing.armyShareCode = army.armyShareCode;
    }
  }

  const armies = [...unique.values()];

  if (armies.length === 0) {
    throw new Error(
      "ClashKing leverde geen bruikbare Discovery armies op."
    );
  }

  await prisma.discoveryArmy.deleteMany({});

  await prisma.discoveryArmy.createMany({
    data: armies.map((army) => ({
      tier: army.tier,
      fingerprint: army.fingerprint,
      armyShareCode: army.armyShareCode,
      troops: army.troops as Prisma.InputJsonValue,
      spells: army.spells as Prisma.InputJsonValue,
      siegeMachine: army.siegeMachine as Prisma.InputJsonValue,
      heroes: army.heroes as Prisma.InputJsonValue,
      pets: army.pets as Prisma.InputJsonValue,
      usageCount: Math.max(0, Math.round(army.usageCount)),
      usagePercentage: Number.isFinite(army.usagePercentage)
        ? army.usagePercentage
        : 0,
      source: "ClashKing",
    })),
  });

  return {
    imported: armies.length,
    L1: armies.filter((army) => army.tier === "L1").length,
    L2: armies.filter((army) => army.tier === "L2").length,
    L3: armies.filter((army) => army.tier === "L3").length,
  };
}
