import { prisma } from "@/app/lib/prisma";

export type DiscoveryTier = "L1" | "L2" | "L3";

export type OffMetaArmy = {
  id: number;
  tier: DiscoveryTier;
  fingerprint: string;
  armyShareCode: string;
  armyLink: string;
  usageCount: number;
  usagePercentage: number;
  troops: unknown[];
  spells: unknown[];
  siegeMachine: unknown | null;
  heroes: unknown[];
  pets: unknown[];
  source: string;
};

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildArmyLink(shareCode: string): string {
  if (
    shareCode.startsWith("http://") ||
    shareCode.startsWith("https://")
  ) {
    return shareCode;
  }

  return (
    "https://link.clashofclans.com/en?action=CopyArmy&army=" +
    encodeURIComponent(shareCode)
  );
}

/**
 * Kies een bestaande army uit de Discovery-database.
 *
 * De drie meest gebruikte armies van de gekozen tier worden
 * uitgesloten. Daarna wordt willekeurig gekozen uit de
 * overgebleven bestaande armies.
 */
export async function generateOffMetaArmy(
  tier: DiscoveryTier
): Promise<OffMetaArmy> {
  const armies = await prisma.discoveryArmy.findMany({
    where: {
      tier,
      armyShareCode: {
        not: null,
      },
    },
    orderBy: [
      {
        usageCount: "desc",
      },
      {
        id: "asc",
      },
    ],
  });

  if (armies.length < 4) {
    throw new Error(
      `Er zijn minimaal 4 ${tier}-armies nodig om de top 3 uit te sluiten. Er zijn nu ${armies.length} armies beschikbaar.`
    );
  }

  const candidates = armies.slice(3);
  const selected = randomItem(candidates);

  if (!selected.armyShareCode) {
    throw new Error(
      "De geselecteerde Discovery army heeft geen armyShareCode."
    );
  }

  return {
    id: selected.id,
    tier: selected.tier,
    fingerprint: selected.fingerprint,
    armyShareCode: selected.armyShareCode,
    armyLink: buildArmyLink(selected.armyShareCode),
    usageCount: selected.usageCount,
    usagePercentage: selected.usagePercentage,
    troops: Array.isArray(selected.troops)
      ? selected.troops
      : [],
    spells: Array.isArray(selected.spells)
      ? selected.spells
      : [],
    siegeMachine:
      selected.siegeMachine &&
      typeof selected.siegeMachine === "object"
        ? selected.siegeMachine
        : null,
    heroes: Array.isArray(selected.heroes)
      ? selected.heroes
      : [],
    pets: Array.isArray(selected.pets)
      ? selected.pets
      : [],
    source: selected.source,
  };
}

export async function getOffMetaPoolInfo(
  tier: DiscoveryTier
) {
  const armies = await prisma.discoveryArmy.findMany({
    where: {
      tier,
      armyShareCode: {
        not: null,
      },
    },
    orderBy: [
      {
        usageCount: "desc",
      },
      {
        id: "asc",
      },
    ],
    select: {
      id: true,
      tier: true,
      fingerprint: true,
      usageCount: true,
      usagePercentage: true,
      source: true,
    },
  });

  return {
    tier,
    total: armies.length,
    excludedTop3: armies.slice(0, 3),
    candidates: armies.slice(3),
  };
}
