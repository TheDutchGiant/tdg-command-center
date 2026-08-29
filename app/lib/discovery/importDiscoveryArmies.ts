import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

const WAR_REPORT_BASE_URL = "https://api.warreport.app";
const MAX_DAYS = 31;
const TOP_ARMIES_PER_DAY = 1000;

const DATA_ROOT =
  process.env.PHOENIX_GAME_DATA_ROOT ??
  "/var/lib/phoenix/clash-game-data";

type GameItem = {
  id?: string | number;
  name?: string;
};

type BattleStatsArmy = {
  name?: string;
  armyShareCode?: string;
  usageCount?: number;
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

type DecodedArmy = {
  troops: {
    id: string;
    name: string;
    quantity: number;
  }[];

  spells: {
    id: string;
    name: string;
    quantity: number;
  }[];

  siegeMachine: {
    id: string;
    name: string;
    quantity: number;
  } | null;

  heroes: {
    id: string;
    name: string;
    equipment: {
      id: string;
      name: string;
    }[];
  }[];

  pets: {
    id: string;
    name: string;
  }[];
};

async function readCategory(
  category: string
): Promise<GameItem[]> {
  const directory = path.join(
    DATA_ROOT,
    category
  );

  const entries = await fs.readdir(
    directory,
    {
      withFileTypes: true,
    }
  );

  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".json")
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name)
    );

  return Promise.all(
    files.map(
      async (entry) =>
        JSON.parse(
          await fs.readFile(
            path.join(
              directory,
              entry.name
            ),
            "utf8"
          )
        ) as GameItem
    )
  );
}

function byId(
  items: GameItem[]
): Map<string, GameItem> {
  return new Map(
    items
      .filter(
        (item) =>
          item.id !== undefined
      )
      .map(
        (item) => [
          String(item.id),
          item,
        ]
      )
  );
}

function nameOf(
  item: GameItem | undefined,
  id: string
): string {
  return item?.name
    ? String(item.name)
    : "Unknown #" + id;
}

function parseStack(
  encoded: string
): {
  id: string;
  quantity: number;
}[] {
  if (!encoded) {
    return [];
  }

  return encoded
    .split("-")
    .map((part) => {
      const match =
        part.match(
          /^(\\d+)x(\\d+)$/
        );

      if (!match) {
        return null;
      }

      return {
        id: match[2],
        quantity: Number(
          match[1]
        ),
      };
    })
    .filter(
      (
        row
      ): row is {
        id: string;
        quantity: number;
      } =>
        row !== null &&
        row.quantity > 0
    );
}

function getSection(
  code: string,
  marker: "h" | "i" | "d" | "u" | "s"
): string {
  const start =
    code.indexOf(marker);

  if (start < 0) {
    return "";
  }

  const nextIndex = [
    "h",
    "i",
    "d",
    "u",
    "s",
  ]
    .map((candidate) => {
      const index =
        code.indexOf(
          candidate,
          start + 1
        );

      return index >= 0
        ? index
        : code.length;
    })
    .sort(
      (a, b) => a - b
    )[0];

  return code.slice(
    start + 1,
    nextIndex
  );
}

function decodeHeroes(
  encoded: string,
  heroMap: Map<string, GameItem>,
  petMap: Map<string, GameItem>,
  equipmentMap: Map<string, GameItem>
): {
  heroes: DecodedArmy["heroes"];
  pets: DecodedArmy["pets"];
} {
  const heroes:
    DecodedArmy["heroes"] = [];

  const pets:
    DecodedArmy["pets"] = [];

  for (
    const token of encoded
      .split("-")
      .filter(Boolean)
  ) {
    const match =
      token.match(
        /^(\\d+)(m\\d+)?(?:p(\\d+))?(?:e(\\d+(?:_\\d+)*))?$/
      );

    if (!match) {
      continue;
    }

    const baseId =
      match[1];

    const mode =
      match[2] ?? "";

    const petId =
      match[3] ?? null;

    const equipmentIds =
      match[4]
        ? match[4].split("_")
        : [];

    heroes.push({
      id:
        baseId + mode,

      name:
        baseId === "2" &&
        mode === "m1"
          ? "Flying Grand Warden"
          : nameOf(
              heroMap.get(
                baseId
              ),
              baseId
            ),

      equipment:
        equipmentIds.map(
          (id) => ({
            id,
            name:
              nameOf(
                equipmentMap.get(
                  id
                ),
                id
              ),
          })
        ),
    });

    if (
      petId &&
      !pets.some(
        (pet) =>
          pet.id === petId
      )
    ) {
      pets.push({
        id: petId,
        name:
          nameOf(
            petMap.get(
              petId
            ),
            petId
          ),
      });
    }
  }

  return {
    heroes,
    pets,
  };
}

function decodeArmyShareCode(
  armyShareCode: string,
  maps: {
    troops: Map<string, GameItem>;
    spells: Map<string, GameItem>;
    siegeMachines: Map<string, GameItem>;
    heroes: Map<string, GameItem>;
    pets: Map<string, GameItem>;
    equipment: Map<string, GameItem>;
  }
): DecodedArmy {
  let code =
    armyShareCode.trim();

  if (
    code.includes(
      "?army="
    )
  ) {
    code =
      code.substring(
        code.indexOf(
          "?army="
        ) + 6
      );
  }

  try {
    code =
      decodeURIComponent(
        code
      );
  } catch {
    // Ongeldige URL-encoding:
    // ruwe code blijven gebruiken.
  }

  const units =
    parseStack(
      getSection(
        code,
        "u"
      )
    ).map(
      (row) => {
        const siege =
          maps.siegeMachines.get(
            row.id
          );

        const troop =
          maps.troops.get(
            row.id
          );

        return {
          id:
            row.id,
          name:
            nameOf(
              siege ??
                troop,
              row.id
            ),
          quantity:
            row.quantity,
          isSiege:
            Boolean(
              siege
            ),
        };
      }
    );

  const heroData =
    decodeHeroes(
      getSection(
        code,
        "h"
      ),
      maps.heroes,
      maps.pets,
      maps.equipment
    );

  const siege =
    units.find(
      (item) =>
        item.isSiege
    );

  return {
    troops:
      units
        .filter(
          (item) =>
            !item.isSiege
        )
        .map(
          (item) => ({
            id:
              item.id,
            name:
              item.name,
            quantity:
              item.quantity,
          })
        ),

    spells:
      parseStack(
        getSection(
          code,
          "s"
        )
      ).map(
        (row) => ({
          id:
            row.id,
          name:
            nameOf(
              maps.spells.get(
                row.id
              ),
              row.id
            ),
          quantity:
            row.quantity,
        })
      ),

    siegeMachine:
      siege
        ? {
            id:
              siege.id,
            name:
              siege.name,
            quantity:
              siege.quantity,
          }
        : null,

    heroes:
      heroData.heroes,

    pets:
      heroData.pets,
  };
}

function numberValue(
  value: unknown
): number {
  return typeof value ===
    "number" &&
    Number.isFinite(value)
    ? value
    : 0;
}

function stringValue(
  value: unknown
): string | null {
  return typeof value ===
    "string" &&
    value.trim()
    ? value.trim()
    : null;
}

async function fetchJson<T>(
  url: string
): Promise<T> {
  const response =
    await fetch(
      url,
      {
        headers: {
          Accept:
            "application/json",
          "User-Agent":
            "TDG-Phoenix/1.0",
        },
        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      "War Report gaf HTTP " +
        response.status +
        " voor " +
        url
    );
  }

  return response.json() as Promise<T>;
}

async function getAvailableDates(): Promise<string[]> {
  const dates =
    await fetchJson<string[]>(
      WAR_REPORT_BASE_URL +
        "/battle-stats/dates"
    );

  return dates
    .filter(
      (date) =>
        /^\\d{4}-\\d{2}-\\d{2}$/.test(
          date
        )
    )
    .sort()
    .slice(
      -MAX_DAYS
    );
}

async function getBattleStats(
  dates: string[]
): Promise<BattleStatsSpan> {
  if (
    dates.length === 0
  ) {
    throw new Error(
      "War Report heeft geen beschikbare Legend-dagen."
    );
  }

  return fetchJson<BattleStatsSpan>(
    WAR_REPORT_BASE_URL +
      "/battle-stats?from=" +
      dates[0] +
      "&to=" +
      dates[dates.length - 1] +
      "&top=" +
      TOP_ARMIES_PER_DAY +
      "&heroes=true"
  );
}

export async function importDiscoveryArmies() {
  const [
    troopsData,
    spellsData,
    siegeData,
    heroesData,
    petsData,
    equipmentData,
    dates,
  ] = await Promise.all([
    readCategory(
      "troops"
    ),
    readCategory(
      "spells"
    ),
    readCategory(
      "siege-machines"
    ),
    readCategory(
      "heroes"
    ),
    readCategory(
      "pets"
    ),
    readCategory(
      "hero-equipment"
    ),
    getAvailableDates(),
  ]);

  const maps = {
    troops:
      byId(troopsData),

    spells:
      byId(spellsData),

    siegeMachines:
      byId(siegeData),

    heroes:
      byId(heroesData),

    pets:
      byId(petsData),

    equipment:
      byId(equipmentData),
  };

  const data =
    await getBattleStats(
      dates
    );

  if (
    !Array.isArray(
      data.days
    ) ||
    data.days.length ===
      0
  ) {
    throw new Error(
      "War Report leverde geen Battle Stats-dagen op."
    );
  }

  const totalAttacks =
    data.days.reduce(
      (
        total,
        day
      ) =>
        total +
        numberValue(
          day.totalAttacks
        ),
      0
    );

  type AggregatedArmy = {
    name: string;
    armyShareCode: string;
    usageCount: number;
    daysSeen: number;
    troops: DecodedArmy["troops"];
    spells: DecodedArmy["spells"];
    siegeMachine:
      DecodedArmy["siegeMachine"];
    heroes:
      DecodedArmy["heroes"];
    pets:
      DecodedArmy["pets"];
  };

  const aggregated =
    new Map<
      string,
      AggregatedArmy
    >();

  for (
    const day of
    data.days
  ) {
    const seenToday =
      new Set<string>();

    for (
      const army of
      day.armies ?? []
    ) {
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

      let existing =
        aggregated.get(
          code
        );

      if (!existing) {
        let decoded:
          DecodedArmy;

        try {
          decoded =
            decodeArmyShareCode(
              code,
              maps
            );
        } catch (
          error
        ) {
          console.warn(
            "Army decode mislukt voor " +
              code,
            error
          );
          continue;
        }

        existing = {
          name:
            stringValue(
              army.name
            ) ??
            "Unknown Army",

          armyShareCode:
            code,

          usageCount:
            usage,

          daysSeen:
            0,

          troops:
            decoded.troops,

          spells:
            decoded.spells,

          siegeMachine:
            decoded.siegeMachine,

          heroes:
            decoded.heroes,

          pets:
            decoded.pets,
        };

        aggregated.set(
          code,
          existing
        );
      } else {
        existing.usageCount +=
          usage;

        const name =
          stringValue(
            army.name
          );

        if (name) {
          existing.name =
            name;
        }
      }

      if (
        usage > 0 &&
        !seenToday.has(
          code
        )
      ) {
        existing.daysSeen +=
          1;

        seenToday.add(
          code
        );
      }
    }
  }

  const armies =
    [...aggregated.values()]
      .map(
        (army) => ({
          ...army,

          usagePercentage:
            totalAttacks > 0
              ? (
                  army.usageCount /
                  totalAttacks
                ) *
                100
              : 0,
        })
      )
      .sort(
        (a, b) =>
          b.usageCount -
          a.usageCount
      );

  if (
    armies.length ===
    0
  ) {
    throw new Error(
      "Geen decodeerbare War Report armies gevonden."
    );
  }

  await prisma.discoveryArmy.deleteMany({
    where: {
      tier: "L1",
    },
  });

  await prisma.discoveryArmy.createMany({
    data:
      armies.map(
        (army) => ({
          tier:
            "L1",

          name:
            army.name,

          fingerprint:
            army.armyShareCode,

          armyShareCode:
            army.armyShareCode,

          troops:
            army.troops as Prisma.InputJsonValue,

          spells:
            army.spells as Prisma.InputJsonValue,

          siegeMachine:
            army.siegeMachine
              ? (army.siegeMachine as Prisma.InputJsonValue)
              : Prisma.JsonNull,

          heroes:
            army.heroes as Prisma.InputJsonValue,

          pets:
            army.pets as Prisma.InputJsonValue,

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
        })
      ),
  });

  return {
    source:
      "WarReport",

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

    decodedArmies:
      armies.length,
  };
}
