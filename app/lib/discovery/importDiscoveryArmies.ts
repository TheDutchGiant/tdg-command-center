import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";

const WAR_REPORT_URL =
  "https://api.warreport.app/armies";

type WarReportArmy = {
  name?: string;
  canonicalKey?: string;
  armyShareCode?: string;
  armyLink?: string;
  playerCount?: number;
  useCount?: number;
  percentage?: number;
};

function numberValue(value: unknown): number {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : 0;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

export async function importDiscoveryArmies() {
  const response = await fetch(WAR_REPORT_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TDG-Phoenix/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `War Report gaf HTTP ${response.status}`
    );
  }

  const payload =
    (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new Error(
      "War Report gaf geen array met armies terug."
    );
  }

  const armies = payload
    .map((row): WarReportArmy | null => {
      if (
        typeof row !== "object" ||
        row === null
      ) {
        return null;
      }

      return row as WarReportArmy;
    })
    .filter(
      (row): row is WarReportArmy =>
        row !== null
    )
    .map((row) => {
      const armyShareCode =
        stringValue(row.armyShareCode);

      const fingerprint =
        stringValue(row.canonicalKey) ??
        armyShareCode;

      if (!armyShareCode || !fingerprint) {
        return null;
      }

      return {
        tier: "L1" as const,
        fingerprint,
        armyShareCode,
        usageCount: Math.max(
          0,
          Math.round(
            numberValue(row.useCount)
          )
        ),
        usagePercentage:
          numberValue(row.percentage),

        /*
         * De decoder is op dit moment nog niet betrouwbaar.
         * Daarom slaan we de ruwe army tijdelijk veilig op.
         * De volgende stap vult troops/spells/heroes/pets
         * vanuit de share code correct aan.
         */
        troops:
          [] as unknown[],
        spells:
          [] as unknown[],
        siegeMachine:
          null as unknown | null,
        heroes:
          [] as unknown[],
        pets:
          [] as unknown[],
        source:
          "WarReport",
      };
    })
    .filter(
      (
        row
      ): row is {
        tier: "L1";
        fingerprint: string;
        armyShareCode: string;
        usageCount: number;
        usagePercentage: number;
        troops: unknown[];
        spells: unknown[];
        siegeMachine: unknown | null;
        heroes: unknown[];
        pets: unknown[];
        source: string;
      } =>
        row !== null
    );

  if (armies.length === 0) {
    throw new Error(
      "War Report leverde geen bruikbare armies op."
    );
  }

  const unique =
    new Map<
      string,
      (typeof armies)[number]
    >();

  for (const army of armies) {
    const key =
      `${army.tier}:${army.fingerprint}`;

    if (!unique.has(key)) {
      unique.set(key, army);
    }
  }

  const uniqueArmies =
    [...unique.values()];

  await prisma.discoveryArmy.deleteMany({
    where: {
      tier: "L1",
    },
  });

  await prisma.discoveryArmy.createMany({
    data:
      uniqueArmies.map((army) => ({
        tier: army.tier,
        fingerprint:
          army.fingerprint,
        armyShareCode:
          army.armyShareCode,

        troops:
          army.troops as Prisma.InputJsonValue,
        spells:
          army.spells as Prisma.InputJsonValue,
        siegeMachine:
          army.siegeMachine as Prisma.InputJsonValue,
        heroes:
          army.heroes as Prisma.InputJsonValue,
        pets:
          army.pets as Prisma.InputJsonValue,

        usageCount:
          army.usageCount,
        usagePercentage:
          army.usagePercentage,
        source:
          army.source,
      })),
  });

  return {
    source:
      "WarReport",
    imported:
      uniqueArmies.length,
    L1:
      uniqueArmies.length,
  };
}
