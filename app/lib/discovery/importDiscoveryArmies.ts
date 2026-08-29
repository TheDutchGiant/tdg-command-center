import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

const WAR_REPORT_BASE_URL =
  "https://api.warreport.app";

const MAX_DAYS = 31;
const TOP_ARMIES_PER_DAY = 1000;

type BattleStatsArmy = {
  name?: string;
  armyShareCode?: string;
  usageCount?: number;
  playerCount?: number;
};

type BattleStatsDay = {
  date: string;
  totalAttacks?: number;
  armies?: BattleStatsArmy[];
};

type BattleStatsSpan = {
  from: string;
  to: string;
  days: BattleStatsDay[];
  missing: string[];
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

async function fetchJson<T>(
  url: string
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TDG-Phoenix/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `War Report gaf HTTP ${response.status} voor ${url}`
    );
  }

  return response.json() as Promise<T>;
}

async function getAvailableDates(): Promise<string[]> {
  const dates =
    await fetchJson<string[]>(
      `${WAR_REPORT_BASE_URL}/battle-stats/dates`
    );

  if (!Array.isArray(dates)) {
    throw new Error(
      "War Report gaf geen geldige lijst met Legend-dagen terug."
    );
  }

  return dates
    .filter((date) =>
      /^\d{4}-\d{2}-\d{2}$/.test(date)
    )
    .sort()
    .slice(-MAX_DAYS);
}

async function getBattleStats(
  dates: string[]
): Promise<BattleStatsSpan> {
  if (dates.length === 0) {
    throw new Error(
      "War Report heeft geen beschikbare Legend-dagen."
    );
  }

  const from = dates[0];
  const to = dates[dates.length - 1];

  return fetchJson<BattleStatsSpan>(
    `${WAR_REPORT_BASE_URL}/battle-stats?from=${from}&to=${to}&top=${TOP_ARMIES_PER_DAY}&heroes=true`
  );
}

export async function importDiscoveryArmies() {
  const dates =
    await getAvailableDates();

  const data =
    await getBattleStats(dates);

  if (
    !Array.isArray(data.days) ||
    data.days.length === 0
  ) {
    throw new Error(
      "War Report leverde geen Battle Stats-dagen op."
    );
  }

  const totalAttacks =
    data.days.reduce(
      (sum, day) =>
        sum + numberValue(day.totalAttacks),
      0
    );

  if (totalAttacks <= 0) {
    throw new Error(
      "War Report gaf 0 totale aanvallen terug."
    );
  }

  type AggregatedArmy = {
    name: string;
    armyShareCode: string;
    usageCount: number;
    daysSeen: number;
    lastName: string;
  };

  const aggregated =
    new Map<string, AggregatedArmy>();

  for (const day of data.days) {
    const seenToday =
      new Set<string>();

    for (const army of day.armies ?? []) {
      const code =
        stringValue(
          army.armyShareCode
        );

      if (!code) {
        continue;
      }

      const usage =
        Math.max(
          0,
          Math.round(
            numberValue(
              army.usageCount
            )
          )
        );

      const existing =
        aggregated.get(code);

      if (!existing) {
        aggregated.set(code, {
          name:
            stringValue(
              army.name
            ) ??
            "Unknown Army",

          armyShareCode: code,

          usageCount:
            usage,

          daysSeen:
            usage > 0 ? 1 : 0,

          lastName:
            stringValue(
              army.name
            ) ??
            "Unknown Army",
        });
      } else {
        existing.usageCount += usage;

        existing.lastName =
          stringValue(
            army.name
          ) ??
          existing.lastName;
      }

      if (
        usage > 0 &&
        !seenToday.has(code)
      ) {
        seenToday.add(code);

        const row =
          aggregated.get(code);

        if (
          row &&
          row.daysSeen > 0
        ) {
          /*
           * De eerste waarneming is al bij
           * aanmaak geteld. Voor bestaande
           * armies tellen we hier de extra dag.
           */
          if (
            row.daysSeen <
            data.days.length
          ) {
            row.daysSeen += 1;
          }
        }
      }
    }
  }

  /*
   * De daysSeen-logica hierboven is expres
   * niet leidend voor de einddata: we tellen
   * hieronder exact per composition over de
   * beschikbare dagen.
   */
  const exactDaysSeen =
    new Map<string, number>();

  for (const day of data.days) {
    const codesToday =
      new Set(
        (day.armies ?? [])
          .map(
            (army) =>
              stringValue(
                army.armyShareCode
              )
          )
          .filter(
            (code): code is string =>
              code !== null
          )
      );

    for (const code of codesToday) {
      exactDaysSeen.set(
        code,
        (exactDaysSeen.get(code) ?? 0) +
          1
      );
    }
  }

  const armies =
    [...aggregated.values()]
      .map((army) => ({
        ...army,
        daysSeen:
          exactDaysSeen.get(
            army.armyShareCode
          ) ?? 0,
        usagePercentage:
          (army.usageCount /
            totalAttacks) *
          100,
      }))
      .sort(
        (a, b) =>
          b.usageCount -
          a.usageCount
      );

  if (armies.length === 0) {
    throw new Error(
      "Geen bruikbare unieke armies gevonden."
    );
  }

  /*
   * Nieuwe maandelijkse dataset:
   * alle oude L1-records worden vervangen.
   *
   * We starten een nieuwe Off-Meta-cyclus
   * met alle armies als nog niet gebruikt.
   */
  await prisma.discoveryArmy.deleteMany({
    where: {
      tier: "L1",
    },
  });

  await prisma.discoveryArmy.createMany({
    data: armies.map((army) => ({
      tier: "L1",

      name:
        army.name,

      fingerprint:
        army.armyShareCode,

      armyShareCode:
        army.armyShareCode,

      troops:
        [] as Prisma.InputJsonValue,

      spells:
        [] as Prisma.InputJsonValue,

      siegeMachine: Prisma.JsonNull,

      heroes:
        [] as Prisma.InputJsonValue,

      pets:
        [] as Prisma.InputJsonValue,

      usageCount:
        army.usageCount,

      usagePercentage:
        army.usagePercentage,

      daysSeen:
        army.daysSeen,

      source:
        "WarReport",

      cycle:
        1,

      isUsed:
        false,

      lastUsedAt:
        null,
    })),
  });

  return {
    source: "WarReport",
    days:
      data.days.length,
    from:
      data.from,
    to:
      data.to,
    missing:
      data.missing ?? [],
    totalAttacks,
    uniqueArmies:
      armies.length,
  };
}
