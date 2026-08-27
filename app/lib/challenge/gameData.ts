import fs from "node:fs/promises";
import path from "node:path";

const DATA_ROOT =
  process.env.PHOENIX_GAME_DATA_ROOT ??
  "/var/lib/phoenix/clash-game-data";

const TOWN_HALL_MIN = 13;
const TOWN_HALL_MAX = 18;

export type GameDataItem = Record<string, unknown>;

type TownHallLimits = {
  troopCapacity: number;
  spellCapacity: number;
  siegeCapacity: number;
};

type CapacityFile = {
  source: string;
  syncedAt: string;
  townHalls: Record<string, TownHallLimits>;
};

export type TownHallCapabilities = {
  townHall: number;

  troopCapacity: number;
  spellCapacity: number;
  siegeCapacity: number;

  clanCastle: {
    troopCapacity: number;
    spellCapacity: number;
    siegeCapacity: 0;
  };

  heroes: GameDataItem[];
  heroSlots: number;

  heroEquipment: GameDataItem[];
  heroEquipmentSlotsPerHero: number;

  pets: GameDataItem[];
  petSlots: number;

  troops: GameDataItem[];
  spells: GameDataItem[];
  siegeMachines: GameDataItem[];

  buildings: {
    armyCampLevel: number;
    armyCampCount: number;
    clanCastleLevel: number;
    heroHallLevel: number;
    blacksmithLevel: number;
    petHouseLevel: number;
    workshopLevel: number;
    spellFactoryLevel: number;
    darkSpellFactoryLevel: number;
  };

  source: {
    gameDataPath: string;
    capacitySource: string;
    capacitySyncedAt: string;
  };
};

async function readJson(filePath: string): Promise<GameDataItem> {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text) as GameDataItem;
}

async function readCategory(
  category: string
): Promise<GameDataItem[]> {
  const directory = path.join(DATA_ROOT, category);

  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".json")
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );

  return Promise.all(
    files.map((entry) =>
      readJson(
        path.join(directory, entry.name)
      )
    )
  );
}

async function readCapacity(): Promise<CapacityFile> {
  return (await readJson(
    path.join(DATA_ROOT, "capacity.json")
  )) as CapacityFile;
}

function numberValue(
  value: unknown
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function latestLevelForTownHall(
  building: GameDataItem,
  townHall: number
): GameDataItem | null {
  const levels = Array.isArray(building.levels)
    ? (building.levels as GameDataItem[])
    : [];

  const eligible = levels.filter((level) => {
    const required = numberValue(
      level.townHallRequired
    );

    return (
      required !== null &&
      required <= townHall
    );
  });

  return eligible.at(-1) ?? null;
}

function latestLevelNumberForTownHall(
  building: GameDataItem,
  townHall: number
): number {
  return (
    numberValue(
      latestLevelForTownHall(
        building,
        townHall
      )?.level
    ) ?? 0
  );
}

function hasTownHallAvailability(
  item: GameDataItem,
  townHall: number
): boolean {
  if (
    Array.isArray(
      item.availablePerTownHall
    )
  ) {
    const row = (
      item.availablePerTownHall as GameDataItem[]
    ).find(
      (entry) =>
        numberValue(
          entry.townHallLevel
        ) === townHall
    );

    if (row) {
      return (
        numberValue(row.count) ?? 0
      ) > 0;
    }
  }

  const levels = Array.isArray(item.levels)
    ? (item.levels as GameDataItem[])
    : [];

  return levels.some((level) => {
    const required = numberValue(
      level.townHallRequired
    );

    return (
      required !== null &&
      required <= townHall
    );
  });
}

function equipmentAvailable(
  equipment: GameDataItem,
  blacksmithLevel: number
): boolean {
  const levels = Array.isArray(
    equipment.levels
  )
    ? (equipment.levels as GameDataItem[])
    : [];

  return levels.some((level) => {
    const required = numberValue(
      level.blacksmithLevelRequired
    );

    return (
      required !== null &&
      required <= blacksmithLevel
    );
  });
}

function getUnlockedPets(
  petHouse: GameDataItem,
  petHouseLevel: number,
  pets: GameDataItem[]
): GameDataItem[] {
  const levels = Array.isArray(
    petHouse.levels
  )
    ? (petHouse.levels as GameDataItem[])
    : [];

  const unlockedNames = new Set<string>();

  for (const level of levels) {
    const levelNumber =
      numberValue(level.level) ?? 0;

    if (levelNumber > petHouseLevel) {
      continue;
    }

    if (
      typeof level.unlockedPet === "string"
    ) {
      unlockedNames.add(
        level.unlockedPet
          .replace(/[^a-z0-9]/gi, "")
          .toLowerCase()
      );
    }
  }

  return pets.filter((pet) => {
    const name =
      typeof pet.name === "string"
        ? pet.name
        : "";

    return unlockedNames.has(
      name
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase()
    );
  });
}

async function loadAll() {
  const [
    troops,
    spells,
    siegeMachines,
    heroes,
    heroEquipment,
    pets,
    armyBuildings,
    resourceBuildings,
    capacity,
  ] = await Promise.all([
    readCategory("troops"),
    readCategory("spells"),
    readCategory("siege-machines"),
    readCategory("heroes"),
    readCategory("hero-equipment"),
    readCategory("pets"),
    readCategory("army-buildings"),
    readCategory("resource-buildings"),
    readCapacity(),
  ]);

  return {
    troops,
    spells,
    siegeMachines,
    heroes,
    heroEquipment,
    pets,
    armyBuildings,
    resourceBuildings,
    capacity,
  };
}

export async function getTownHallCapabilities(
  townHall: number
): Promise<TownHallCapabilities> {
  if (
    !Number.isInteger(townHall) ||
    townHall < TOWN_HALL_MIN ||
    townHall > TOWN_HALL_MAX
  ) {
    throw new Error(
      `Challenge ondersteunt alleen TH${TOWN_HALL_MIN} t/m TH${TOWN_HALL_MAX}.`
    );
  }

  const data = await loadAll();

  const limits =
    data.capacity.townHalls[
      String(townHall)
    ];

  if (!limits) {
    throw new Error(
      `Geen actuele capaciteitsdata gevonden voor TH${townHall}.`
    );
  }

  const armyCamp =
    data.armyBuildings.find(
      (item) => item.id === "army-camp"
    );

  const clanCastle =
    data.resourceBuildings.find(
      (item) => item.id === "clan-castle"
    );

  const heroHall =
    data.armyBuildings.find(
      (item) => item.id === "hero-hall"
    );

  const blacksmith =
    data.armyBuildings.find(
      (item) => item.id === "blacksmith"
    );

  const petHouse =
    data.armyBuildings.find(
      (item) => item.id === "pet-house"
    );

  const workshop =
    data.armyBuildings.find(
      (item) => item.id === "workshop"
    );

  const spellFactory =
    data.armyBuildings.find(
      (item) => item.id === "spell-factory"
    );

  const darkSpellFactory =
    data.armyBuildings.find(
      (item) =>
        item.id === "dark-spell-factory"
    );

  if (
    !armyCamp ||
    !clanCastle ||
    !heroHall ||
    !blacksmith ||
    !petHouse ||
    !workshop
  ) {
    throw new Error(
      "Benodigde Challenge game-data ontbreekt."
    );
  }

  const armyCampLevel =
    latestLevelNumberForTownHall(
      armyCamp,
      townHall
    );

  const armyCampRow =
    (
      armyCamp.availablePerTownHall as
        | GameDataItem[]
        | undefined
    )?.find(
      (entry) =>
        numberValue(
          entry.townHallLevel
        ) === townHall
    );

  const armyCampCount =
    numberValue(
      armyCampRow?.count
    ) ?? 0;

  const clanCastleLevel =
    latestLevelForTownHall(
      clanCastle,
      townHall
    );

  const heroHallLevelData =
    latestLevelForTownHall(
      heroHall,
      townHall
    );

  const heroHallLevel =
    numberValue(
      heroHallLevelData?.level
    ) ?? 0;

  const blacksmithLevel =
    latestLevelNumberForTownHall(
      blacksmith,
      townHall
    );

  const petHouseLevel =
    latestLevelNumberForTownHall(
      petHouse,
      townHall
    );

  const workshopLevel =
    latestLevelNumberForTownHall(
      workshop,
      townHall
    );

  const spellFactoryLevel =
    spellFactory
      ? latestLevelNumberForTownHall(
          spellFactory,
          townHall
        )
      : 0;

  const darkSpellFactoryLevel =
    darkSpellFactory
      ? latestLevelNumberForTownHall(
          darkSpellFactory,
          townHall
        )
      : 0;

  const heroCaps =
    heroHallLevelData?.heroLevelCaps;

  const heroIds =
    heroCaps &&
    typeof heroCaps === "object"
      ? Object.keys(
          heroCaps as Record<
            string,
            unknown
          >
        )
      : [];

  /*
   * Hero Hall gebruikt interne hero IDs zoals
   * "barbarianKing", terwijl de game-data soms
   * een andere ID/naamnotatie gebruikt.
   *
   * Daarom koppelen we eerst op ID en daarna
   * op een genormaliseerde versie van ID/naam.
   */
  const normalizeHeroKey = (
    value: unknown
  ) =>
    String(value ?? "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();

  const heroesByKey = new Map<
    string,
    GameDataItem
  >();

  for (const hero of data.heroes) {
    heroesByKey.set(
      normalizeHeroKey(hero.id),
      hero
    );

    heroesByKey.set(
      normalizeHeroKey(hero.name),
      hero
    );
  }

  const heroes = heroIds
    .map((id) =>
      heroesByKey.get(
        normalizeHeroKey(id)
      )
    )
    .filter(
      (hero): hero is GameDataItem =>
        Boolean(hero)
    );

  const heroSlots =
    numberValue(
      heroHallLevelData?.heroSlots
    ) ?? 0;

  const troops =
    data.troops.filter((troop) =>
      hasTownHallAvailability(
        troop,
        townHall
      )
    );

  const spells =
    data.spells.filter((spell) => {
      const levels = Array.isArray(
        spell.levels
      )
        ? (spell.levels as GameDataItem[])
        : [];

      return levels.some((level) => {
        const requiredTH =
          numberValue(
            level.townHallRequired
          );

        const requiredFactory =
          numberValue(
            level.spellFactoryLevelRequired
          );

        if (
          requiredTH !== null
        ) {
          return (
            requiredTH <= townHall
          );
        }

        if (
          requiredFactory !== null
        ) {
          return (
            requiredFactory <=
            Math.max(
              spellFactoryLevel,
              darkSpellFactoryLevel
            )
          );
        }

        return hasTownHallAvailability(
          spell,
          townHall
        );
      });
    });

  const siegeMachines =
    data.siegeMachines.filter(
      (siege) =>
        hasTownHallAvailability(
          siege,
          townHall
        )
    );

  const heroEquipment =
    data.heroEquipment.filter(
      (equipment) =>
        equipmentAvailable(
          equipment,
          blacksmithLevel
        )
    );

  const pets =
    getUnlockedPets(
      petHouse,
      petHouseLevel,
      data.pets
    );

  return {
    townHall,

    troopCapacity:
      limits.troopCapacity,

    spellCapacity:
      limits.spellCapacity,

    siegeCapacity:
      limits.siegeCapacity,

    clanCastle: {
      troopCapacity:
        numberValue(
          clanCastleLevel?.troopCapacity
        ) ?? 0,

      spellCapacity:
        numberValue(
          clanCastleLevel?.spellCapacity
        ) ?? 0,

      // Voor onze Challenge bewust geen CC siege.
      siegeCapacity: 0,
    },

    heroes,
    heroSlots,

    heroEquipment,
    heroEquipmentSlotsPerHero: 2,

    pets,
    petSlots: 4,

    troops,
    spells,
    siegeMachines,

    buildings: {
      armyCampLevel,
      armyCampCount,

      clanCastleLevel:
        numberValue(
          clanCastleLevel?.level
        ) ?? 0,

      heroHallLevel,
      blacksmithLevel,
      petHouseLevel,
      workshopLevel,
      spellFactoryLevel,
      darkSpellFactoryLevel,
    },

    source: {
      gameDataPath: DATA_ROOT,
      capacitySource:
        data.capacity.source,
      capacitySyncedAt:
        data.capacity.syncedAt,
    },
  };
}

export async function getAllChallengeCapabilities() {
  const capabilities = [];

  for (
    let townHall = TOWN_HALL_MIN;
    townHall <= TOWN_HALL_MAX;
    townHall++
  ) {
    capabilities.push(
      await getTownHallCapabilities(
        townHall
      )
    );
  }

  return capabilities;
}
