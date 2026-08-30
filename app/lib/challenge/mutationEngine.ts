import {
  getTownHallCapabilities,
  type GameDataItem,
} from "./gameData";

import type {
  Difficulty,
  GeneratedArmy,
  GeneratedHero,
  GeneratedStackItem,
  GeneratedSpellItem,
} from "./randomArmy";

export type MutationDifficulty = Difficulty;

export type MutationPercentage = {
  difficulty: MutationDifficulty;
  mutatedPercent: number;
};

export type MutatedArmy = GeneratedArmy & {
  mutatedPercent: number;
  sourceArmyId?: number;
  sourceArmyName?: string;
};

const DIFFICULTY_RANGES: Record<
  MutationDifficulty,
  readonly [number, number]
> = {
  OH_MY_GOD: [20, 40],
  OH_HELL_NO: [60, 80],
  FUCK_MY_LIFE: [90, 100],
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);

    [copy[i], copy[j]] = [
      copy[j],
      copy[i],
    ];
  }

  return copy;
}

function clone<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value),
  ) as T;
}

function idOf(item: GameDataItem): string {
  return String(
    item.id ??
      item.name ??
      "",
  );
}

function nameOf(item: GameDataItem): string {
  return String(
    item.name ??
      item.id ??
      "Unknown",
  );
}

function numberValue(
  value: unknown,
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function housingSpace(
  item: GameDataItem,
): number {
  const direct = numberValue(
    item.housingSpace,
  );

  if (direct !== null) {
    return direct;
  }

  const levels = Array.isArray(
    item.levels,
  )
    ? (item.levels as GameDataItem[])
    : [];

  for (const level of levels) {
    const value = numberValue(
      level.housingSpace,
    );

    if (value !== null) {
      return value;
    }
  }

  return 1;
}

function quantityOf(
  item: GeneratedStackItem,
): number {
  return Math.max(
    1,
    Math.floor(
      numberValue(item.quantity) ?? 1,
    ),
  );
}

function stackCapacity(
  items: GeneratedStackItem[],
): number {
  return items.reduce(
    (total, item) =>
      total +
      housingSpaceFromGenerated(item) *
        quantityOf(item),
    0,
  );
}

function housingSpaceFromGenerated(
  item: GeneratedStackItem | GeneratedSpellItem,
): number {
  return numberValue(item.housingSpace) ?? 1;
}

function expandGenerated(
  items: GeneratedStackItem[],
): GeneratedStackItem[] {
  const result: GeneratedStackItem[] = [];

  for (const item of items) {
    for (
      let i = 0;
      i < quantityOf(item);
      i++
    ) {
      result.push({
        ...clone(item),
        quantity: 1,
      });
    }
  }

  return result;
}

function compressGenerated(
  items: GeneratedStackItem[],
): GeneratedStackItem[] {
  const result =
    new Map<
      string,
      GeneratedStackItem
    >();

  for (const item of items) {
    const key = item.id;

    const existing =
      result.get(key);

    if (existing) {
      existing.quantity +=
        quantityOf(item);
    } else {
      result.set(
        key,
        clone(item),
      );
    }
  }

  return [
    ...result.values(),
  ];
}

function chooseReplacementUnits(
  pool: GameDataItem[],
  targetCapacity: number,
  excluded: Set<string>,
): GeneratedStackItem[] {
  if (targetCapacity <= 0) {
    return [];
  }

  const candidates =
    shuffled(
      pool.filter(
        (item) =>
          !excluded.has(
            idOf(item),
          ) &&
          housingSpace(item) <=
            targetCapacity,
      ),
    );

  if (!candidates.length) {
    return [];
  }

  const result: GeneratedStackItem[] = [];
  let remaining =
    targetCapacity;

  /*
   * We vullen uitsluitend binnen de toegestane
   * ±5 buffer. Als exact vullen niet mogelijk is,
   * proberen we de dichtstbijzijnde geldige waarde.
   */
  while (remaining > 0) {
    const possible =
      candidates.filter(
        (item) =>
          housingSpace(item) <=
          remaining,
      );

    if (!possible.length) {
      break;
    }

    const chosen =
      possible[
        randomInt(
          0,
          possible.length - 1,
        )
      ];

    result.push({
      id: idOf(chosen),
      name: nameOf(chosen),
      quantity: 1,
      housingSpace:
        housingSpace(chosen),
    });

    remaining -=
      housingSpace(chosen);
  }

  return result;
}

function chooseRemovedUnits(
  source: GeneratedStackItem[],
  target: number,
): GeneratedStackItem[] {
  if (target <= 0) {
    return [];
  }

  const expanded =
    expandGenerated(source);

  const minimum =
    Math.max(
      0,
      target - 5,
    );

  const maximum =
    Math.min(
      stackCapacity(source),
      target + 5,
    );

  let best:
    GeneratedStackItem[] = [];

  let bestDifference =
    Number.POSITIVE_INFINITY;

  const states =
    new Map<
      number,
      GeneratedStackItem[]
    >();

  states.set(0, []);

  for (
    const item of shuffled(expanded)
  ) {
    const itemSpace =
      housingSpaceFromGenerated(
        item,
      );

    const snapshot =
      [...states.entries()];

    for (
      const [
        current,
        selected,
      ] of snapshot
    ) {
      const next =
        current + itemSpace;

      if (
        next > maximum
      ) {
        continue;
      }

      if (
        !states.has(next)
      ) {
        states.set(
          next,
          [
            ...selected,
            item,
          ],
        );
      }

      if (
        next >= minimum &&
        next <= maximum
      ) {
        const difference =
          Math.abs(
            next - target,
          );

        if (
          difference <
          bestDifference
        ) {
          best =
            states.get(next) ?? [];
          bestDifference =
            difference;
        }
      }

      if (
        next === target
      ) {
        return (
          states.get(next) ?? []
        );
      }
    }
  }

  return best;
}

function removeGenerated(
  source: GeneratedStackItem[],
  removed: GeneratedStackItem[],
): GeneratedStackItem[] {
  const remaining =
    expandGenerated(source);

  const counts =
    new Map<string, number>();

  for (
    const item of removed
  ) {
    counts.set(
      item.id,
      (counts.get(item.id) ?? 0) + 1,
    );
  }

  const kept: GeneratedStackItem[] =
    [];

  for (
    const item of remaining
  ) {
    const count =
      counts.get(item.id) ?? 0;

    if (count > 0) {
      counts.set(
        item.id,
        count - 1,
      );
      continue;
    }

    kept.push(item);
  }

  return compressGenerated(
    kept,
  );
}

function mutateStack(
  source: GeneratedStackItem[],
  pool: GameDataItem[],
  percentage: number,
): GeneratedStackItem[] {
  const originalCapacity =
    stackCapacity(source);

  if (
    originalCapacity <= 0
  ) {
    return [];
  }

  if (
    percentage >= 100
  ) {
    return compressGenerated(
      chooseReplacementUnits(
        pool,
        originalCapacity,
        new Set(),
      ),
    );
  }

  const target =
    Math.round(
      originalCapacity *
        (percentage / 100),
    );

  const removed =
    chooseRemovedUnits(
      source,
      target,
    );

  if (!removed.length) {
    return clone(source);
  }

  const removedCapacity =
    stackCapacity(removed);

  const remaining =
    removeGenerated(
      source,
      removed,
    );

  const replacements =
    chooseReplacementUnits(
      pool,
      removedCapacity,
      new Set(
        removed.map(
          (item) => item.id,
        ),
      ),
    );

  return compressGenerated([
    ...remaining,
    ...replacements,
  ]);
}

function compatibleEquipment(
  hero: GeneratedHero,
  equipmentPool: GameDataItem[],
): GameDataItem[] {
  const heroId =
    hero.id.toLowerCase();

  const heroName =
    hero.name.toLowerCase();

  const result =
    equipmentPool.filter(
      (equipment) => {
        const owner =
          typeof equipment.hero ===
          "string"
            ? equipment.hero.toLowerCase()
            : "";

        const ownerId =
          typeof equipment.heroId ===
          "string"
            ? equipment.heroId.toLowerCase()
            : "";

        const ownerName =
          typeof equipment.heroName ===
          "string"
            ? equipment.heroName.toLowerCase()
            : "";

        return (
          owner === heroId ||
          owner === heroName ||
          ownerId === heroId ||
          ownerName === heroName
        );
      },
    );

  return result;
}

function mutateHeroes(
  source: GeneratedHero[],
  heroPool: GameDataItem[],
  equipmentPool: GameDataItem[],
  difficulty: MutationDifficulty,
): GeneratedHero[] {
  const heroes =
    clone(source);

  if (
    !heroes.length ||
    !heroPool.length
  ) {
    return heroes;
  }

  /*
   * FUCK MY LIFE:
   * heroes mogen volledig veranderen.
   */
  if (
    difficulty ===
    "FUCK_MY_LIFE"
  ) {
    return shuffled(
      heroPool,
    )
      .slice(
        0,
        heroes.length,
      )
      .map(
        (hero) => ({
          id: idOf(hero),
          name: nameOf(hero),
          equipment:
            [],
        }),
      );
  }

  /*
   * OH MY GOD:
   * 1 hero wisselen.
   *
   * OH HELL NO:
   * 2 heroes wisselen.
   */
  const heroSwapCount =
    difficulty ===
    "OH_MY_GOD"
      ? 1
      : 2;

  const swapIndices =
    shuffled(
      heroes.map(
        (_, index) => index,
      ),
    ).slice(
      0,
      Math.min(
        heroSwapCount,
        heroes.length,
      ),
    );

  for (
    const index of swapIndices
  ) {
    const current =
      heroes[index];

    const alternatives =
      heroPool.filter(
        (hero) =>
          idOf(hero) !==
          current.id,
      );

    if (
      alternatives.length
    ) {
      const replacement =
        alternatives[
          randomInt(
            0,
            alternatives.length - 1,
          )
        ];

      heroes[index] = {
        id: idOf(replacement),
        name: nameOf(replacement),
        equipment:
          clone(
            current.equipment,
          ),
      };
    }
  }

  /*
   * Equipment:
   * OMG = 1 equipment swap
   * OH HELL NO = 2 equipment swaps
   *
   * Equipment blijft gekoppeld aan
   * de hero waarvoor het bedoeld is.
   */
  const equipmentChanges =
    difficulty ===
    "OH_MY_GOD"
      ? 1
      : 2;

  const equipmentIndices =
    shuffled(
      heroes.map(
        (_, index) => index,
      ),
    ).slice(
      0,
      Math.min(
        equipmentChanges,
        heroes.length,
      ),
    );

  for (
    const index of equipmentIndices
  ) {
    const hero =
      heroes[index];

    const pool =
      compatibleEquipment(
        hero,
        equipmentPool,
      );

    if (!pool.length) {
      continue;
    }

    const current =
      [...hero.equipment];

    if (!current.length) {
      continue;
    }

    const slot =
      randomInt(
        0,
        current.length - 1,
      );

    const replacement =
      pool[
        randomInt(
          0,
          pool.length - 1,
        )
      ];

    current[slot] = {
      id: idOf(replacement),
      name: nameOf(replacement),
    };

    heroes[index] = {
      ...hero,
      equipment: current,
    };
  }

  return heroes;
}

export function generateMutationPercentages(): MutationPercentage[] {
  return (
    Object.keys(
      DIFFICULTY_RANGES,
    ) as MutationDifficulty[]
  ).map(
    (difficulty) => {
      const [
        minimum,
        maximum,
      ] =
        DIFFICULTY_RANGES[
          difficulty
        ];

      return {
        difficulty,
        mutatedPercent:
          randomInt(
            minimum,
            maximum,
          ),
      };
    },
  );
}

export async function mutateGeneratedArmy(
  source: GeneratedArmy,
  difficulty: MutationDifficulty,
  mutatedPercent: number,
): Promise<GeneratedArmy> {
  const capabilities =
    await getTownHallCapabilities(
      source.townHall,
    );

  const troops =
    mutateStack(
      source.troops,
      capabilities.troops,
      mutatedPercent,
    );

  const spells =
    mutateStack(
      source.spells,
      capabilities.spells,
      mutatedPercent,
    );

  const heroes =
    mutateHeroes(
      source.heroes,
      capabilities.heroes,
      capabilities.heroEquipment,
      difficulty,
    );

  return {
    ...clone(source),
    difficulty,
    troops,
    troopCapacity:
      stackCapacity(troops),
    spells:
      spells as GeneratedSpellItem[],
    spellCapacity:
      stackCapacity(
        spells as GeneratedStackItem[],
      ),
    heroes,
    generatedAt:
      new Date().toISOString(),
  };
}
