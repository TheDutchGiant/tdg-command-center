import {
  getTownHallCapabilities,
  type GameDataItem,
  type TownHallCapabilities,
} from "./gameData";

export type Difficulty =
  | "OH_MY_GOD"
  | "OH_HELL_NO"
  | "FUCK_MY_LIFE";

export type GeneratedStackItem = {
  id: string;
  name: string;
  quantity: number;
  housingSpace: number;
};

export type GeneratedSpellItem = {
  id: string;
  name: string;
  quantity: number;
  housingSpace: number;
};

export type GeneratedHero = {
  id: string;
  name: string;
  equipment: {
    id: string;
    name: string;
  }[];
};

export type GeneratedArmy = {
  townHall: number;
  difficulty: Difficulty;

  troops: GeneratedStackItem[];
  troopCapacity: number;

  spells: GeneratedSpellItem[];
  spellCapacity: number;

  siegeMachine: {
    id: string;
    name: string;
  };

  heroes: GeneratedHero[];

  pets: {
    id: string;
    name: string;
  }[];

  clanCastle: {
    troops: GeneratedStackItem[];
    troopCapacity: number;

    spells: GeneratedSpellItem[];
    spellCapacity: number;

    siegeMachine: null;
  };

  generatedAt: string;
};

type WeightedItem<T> = {
  item: T;
  weight: number;
};

const MAX_GENERATION_ATTEMPTS = 5000;

function idOf(item: GameDataItem): string {
  return String(
    item.id ??
      item.name ??
      crypto.randomUUID()
  );
}

function nameOf(item: GameDataItem): string {
  return String(
    item.name ??
      item.id ??
      "Unknown"
  );
}

function numberValue(
  value: unknown
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function getHousingSpace(
  item: GameDataItem
): number {
  const direct =
    numberValue(
      item.housingSpace
    );

  if (direct !== null) {
    return direct;
  }

  const levels = Array.isArray(
    item.levels
  )
    ? (item.levels as GameDataItem[])
    : [];

  for (const level of levels) {
    const value =
      numberValue(
        level.housingSpace
      );

    if (value !== null) {
      return value;
    }
  }

  return 1;
}

function randomInt(
  min: number,
  max: number
): number {
  return Math.floor(
    Math.random() *
      (max - min + 1)
  ) + min;
}

function shuffled<T>(
  items: T[]
): T[] {
  const copy = [...items];

  for (
    let index = copy.length - 1;
    index > 0;
    index--
  ) {
    const swap =
      randomInt(0, index);

    [
      copy[index],
      copy[swap],
    ] = [
      copy[swap],
      copy[index],
    ];
  }

  return copy;
}

function weightedRandom<T>(
  items: WeightedItem<T>[]
): T {
  const total = items.reduce(
    (sum, entry) =>
      sum + Math.max(0, entry.weight),
    0
  );

  if (total <= 0) {
    return items[
      randomInt(
        0,
        items.length - 1
      )
    ].item;
  }

  let cursor =
    Math.random() * total;

  for (const entry of items) {
    cursor -= Math.max(
      0,
      entry.weight
    );

    if (cursor <= 0) {
      return entry.item;
    }
  }

  return items.at(-1)!.item;
}

function difficultyProfile(
  difficulty: Difficulty
) {
  switch (difficulty) {
    case "OH_MY_GOD":
      return {
        variety: 0.45,
        repetition: 0.75,
        badSynergy: 0.15,
      };

    case "OH_HELL_NO":
      return {
        variety: 0.75,
        repetition: 0.35,
        badSynergy: 0.55,
      };

    case "FUCK_MY_LIFE":
      return {
        variety: 1,
        repetition: 0.15,
        badSynergy: 0.9,
      };
  }
}

function buildCapacityStacks(
  items: GameDataItem[],
  capacity: number,
  difficulty: Difficulty
): GeneratedStackItem[] {
  if (capacity <= 0) {
    return [];
  }

  const candidates = items
    .map((item) => ({
      item,
      housingSpace:
        getHousingSpace(item),
    }))
    .filter(
      (entry) =>
        entry.housingSpace > 0 &&
        entry.housingSpace <=
          capacity
    );

  if (!candidates.length) {
    throw new Error(
      "Geen geldige troops gevonden voor deze capaciteit."
    );
  }

  const profile =
    difficultyProfile(difficulty);

  for (
    let attempt = 0;
    attempt < MAX_GENERATION_ATTEMPTS;
    attempt++
  ) {
    let remaining = capacity;
    const selected =
      new Map<string, GeneratedStackItem>();

    const pool =
      shuffled(candidates);

    while (remaining > 0) {
      const possible =
        pool.filter(
          (candidate) =>
            candidate.housingSpace <=
            remaining
        );

      if (!possible.length) {
        break;
      }

      const weighted =
        possible.map((candidate) => {
          const existing =
            selected.has(
              idOf(candidate.item)
            );

          let weight =
            1 + profile.variety;

          if (existing) {
            weight *=
              profile.repetition;
          }

          return {
            item: candidate,
            weight,
          };
        });

      const chosen =
        weightedRandom(weighted);

      const id =
        idOf(chosen.item);

      const existing =
        selected.get(id);

      if (existing) {
        existing.quantity += 1;
      } else {
        selected.set(id, {
          id,
          name: nameOf(
            chosen.item
          ),
          quantity: 1,
          housingSpace:
            chosen.housingSpace,
        });
      }

      remaining -=
        chosen.housingSpace;
    }

    if (remaining === 0) {
      return [...selected.values()];
    }
  }

  throw new Error(
    `Kon geen geldige army vinden met exact ${capacity} housing space na ${MAX_GENERATION_ATTEMPTS} pogingen.`
  );
}

function buildSpellStacks(
  items: GameDataItem[],
  capacity: number,
  difficulty: Difficulty
): GeneratedSpellItem[] {
  if (capacity <= 0) {
    return [];
  }

  const candidates = items
    .map((item) => ({
      item,
      housingSpace:
        getHousingSpace(item),
    }))
    .filter(
      (entry) =>
        entry.housingSpace > 0 &&
        entry.housingSpace <=
          capacity
    );

  if (!candidates.length) {
    throw new Error(
      "Geen geldige spells gevonden voor deze capaciteit."
    );
  }

  const profile =
    difficultyProfile(difficulty);

  for (
    let attempt = 0;
    attempt < MAX_GENERATION_ATTEMPTS;
    attempt++
  ) {
    let remaining = capacity;
    const selected =
      new Map<string, GeneratedSpellItem>();

    while (remaining > 0) {
      const possible =
        candidates.filter(
          (candidate) =>
            candidate.housingSpace <=
            remaining
        );

      if (!possible.length) {
        break;
      }

      const weighted =
        possible.map((candidate) => {
          const id =
            idOf(candidate.item);

          const existing =
            selected.has(id);

          let weight =
            1 + profile.variety;

          if (existing) {
            weight *=
              profile.repetition;
          }

          return {
            item: candidate,
            weight,
          };
        });

      const chosen =
        weightedRandom(weighted);

      const id =
        idOf(chosen.item);

      const existing =
        selected.get(id);

      if (existing) {
        existing.quantity += 1;
      } else {
        selected.set(id, {
          id,
          name: nameOf(
            chosen.item
          ),
          quantity: 1,
          housingSpace:
            chosen.housingSpace,
        });
      }

      remaining -=
        chosen.housingSpace;
    }

    if (remaining === 0) {
      return [...selected.values()];
    }
  }

  throw new Error(
    `Kon geen geldige spells vinden met exact ${capacity} spell capacity.`
  );
}

function chooseSiege(
  capabilities: TownHallCapabilities
): {
  id: string;
  name: string;
} {
  if (
    capabilities.siegeMachines.length ===
    0
  ) {
    throw new Error(
      `TH${capabilities.townHall} heeft geen beschikbare siege machines.`
    );
  }

  const chosen =
    capabilities.siegeMachines[
      randomInt(
        0,
        capabilities.siegeMachines.length -
          1
      )
    ];

  return {
    id: idOf(chosen),
    name: nameOf(chosen),
  };
}

function chooseHeroes(
  capabilities: TownHallCapabilities
): GeneratedHero[] {
  if (
    capabilities.heroes.length <
    capabilities.heroSlots
  ) {
    throw new Error(
      `TH${capabilities.townHall} heeft onvoldoende beschikbare heroes voor ${capabilities.heroSlots} slots.`
    );
  }

  return shuffled(
    capabilities.heroes
  )
    .slice(
      0,
      capabilities.heroSlots
    )
    .map((hero) => {
      const equipment =
        shuffled(
          capabilities.heroEquipment
        )
          .slice(
            0,
            capabilities.heroEquipmentSlotsPerHero
          )
          .map((item) => ({
            id: idOf(item),
            name: nameOf(item),
          }));

      return {
        id: idOf(hero),
        name: nameOf(hero),
        equipment,
      };
    });
}

function choosePets(
  capabilities: TownHallCapabilities
): {
  id: string;
  name: string;
}[] {
  const count = Math.min(
    capabilities.petSlots,
    capabilities.pets.length
  );

  return shuffled(
    capabilities.pets
  )
    .slice(0, count)
    .map((pet) => ({
      id: idOf(pet),
      name: nameOf(pet),
    }));
}

export async function generateRandomArmy(
  townHall: number,
  difficulty: Difficulty
): Promise<GeneratedArmy> {
  const capabilities =
    await getTownHallCapabilities(
      townHall
    );

  const troops =
    buildCapacityStacks(
      capabilities.troops,
      capabilities.troopCapacity,
      difficulty
    );

  const spells =
    buildSpellStacks(
      capabilities.spells,
      capabilities.spellCapacity,
      difficulty
    );

  const clanCastleTroops =
    buildCapacityStacks(
      capabilities.troops,
      capabilities.clanCastle.troopCapacity,
      difficulty
    );

  const clanCastleSpells =
    buildSpellStacks(
      capabilities.spells,
      capabilities.clanCastle.spellCapacity,
      difficulty
    );

  return {
    townHall,
    difficulty,

    troops,
    troopCapacity:
      capabilities.troopCapacity,

    spells,
    spellCapacity:
      capabilities.spellCapacity,

    siegeMachine:
      chooseSiege(capabilities),

    heroes:
      chooseHeroes(capabilities),

    pets:
      choosePets(capabilities),

    clanCastle: {
      troops:
        clanCastleTroops,

      troopCapacity:
        capabilities.clanCastle.troopCapacity,

      spells:
        clanCastleSpells,

      spellCapacity:
        capabilities.clanCastle.spellCapacity,

      siegeMachine: null,
    },

    generatedAt:
      new Date().toISOString(),
  };
}
