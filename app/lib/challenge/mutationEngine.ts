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

export type MutationDifficulty =
  Difficulty;

export type MutationPercentage = {
  difficulty: MutationDifficulty;
  mutatedPercent: number;
};

export type MutatedArmy =
  GeneratedArmy & {
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

const REMOVAL_OPTIONS_PER_CAPACITY = 150;
const MAX_REMOVAL_CANDIDATES = 2000;

/* ============================================================
   GENERIEKE HELPERS
   ============================================================ */

function randomInt(
  min: number,
  max: number,
): number {
  return (
    Math.floor(
      Math.random() *
        (max - min + 1),
    ) + min
  );
}

function shuffled<T>(
  items: T[],
): T[] {
  const result = [...items];

  for (
    let index = result.length - 1;
    index > 0;
    index--
  ) {
    const swap =
      randomInt(0, index);

    [
      result[index],
      result[swap],
    ] = [
      result[swap],
      result[index],
    ];
  }

  return result;
}

function clone<T>(
  value: T,
): T {
  return JSON.parse(
    JSON.stringify(value),
  ) as T;
}

function numberValue(
  value: unknown,
): number | null {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : null;
}

function normalize(
  value: unknown,
): string {
  return String(value ?? "")
    .replace(
      /[^a-z0-9]/gi,
      "",
    )
    .toLowerCase();
}

function idOf(
  item: GameDataItem,
): string {
  return String(
    item.id ??
      item.name ??
      "",
  );
}

function nameOf(
  item: GameDataItem,
): string {
  return String(
    item.name ??
      item.id ??
      "Unknown",
  );
}

function quantityOf(
  item:
    | GeneratedStackItem
    | GeneratedSpellItem,
): number {
  return Math.max(
    1,
    Math.floor(
      numberValue(
        item.quantity,
      ) ?? 1,
    ),
  );
}

/* ============================================================
   GAME DATA POOLS
   ============================================================ */

type TroopDataItem =
  GameDataItem & {
    __isSuperTroop: boolean;
  };

function flattenTroopPool(
  pool: GameDataItem[],
): TroopDataItem[] {
  const result:
    TroopDataItem[] =
    [];

  for (
    const item of pool
  ) {
    result.push({
      ...item,
      __isSuperTroop: false,
    });

    if (
      item.superTroop &&
      typeof item.superTroop ===
        "object" &&
      !Array.isArray(
        item.superTroop,
      )
    ) {
      result.push({
        ...(
          item.superTroop as GameDataItem
        ),
        __isSuperTroop: true,
      });
    }
  }

  return result;
}

function gameHousingSpace(
  item: GameDataItem,
): number {
  return (
    numberValue(
      item.housingSpace,
    ) ?? 1
  );
}

function findTroopData(
  item: GeneratedStackItem,
  pool: GameDataItem[],
): TroopDataItem | undefined {
  const wantedId =
    normalize(item.id);

  const wantedName =
    normalize(item.name);

  return flattenTroopPool(
    pool,
  ).find(
    (candidate) =>
      normalize(
        candidate.id,
      ) === wantedId ||
      normalize(
        candidate.name,
      ) === wantedName,
  );
}

function troopSpace(
  item: GeneratedStackItem,
  pool: GameDataItem[],
): number {
  const gameItem =
    findTroopData(
      item,
      pool,
    );

  if (gameItem) {
    return gameHousingSpace(
      gameItem,
    );
  }

  /*
   * Alleen als absoluut laatste fallback
   * gebruiken we de GeneratedArmy-value.
   */
  return (
    numberValue(
      item.housingSpace,
    ) ?? 1
  );
}

function spellSpace(
  item: GeneratedSpellItem,
  pool: GameDataItem[],
): number {
  const wantedId =
    normalize(item.id);

  const wantedName =
    normalize(item.name);

  const gameItem =
    pool.find(
      (candidate) =>
        normalize(
          candidate.id,
        ) === wantedId ||
        normalize(
          candidate.name,
        ) === wantedName,
    );

  if (gameItem) {
    return gameHousingSpace(
      gameItem,
    );
  }

  return (
    numberValue(
      item.housingSpace,
    ) ?? 1
  );
}

function troopCapacity(
  items: GeneratedStackItem[],
  pool: GameDataItem[],
): number {
  return items.reduce(
    (
      total,
      item,
    ) =>
      total +
      troopSpace(
        item,
        pool,
      ) *
        quantityOf(item),
    0,
  );
}

function spellCapacity(
  items: GeneratedSpellItem[],
  pool: GameDataItem[],
): number {
  return items.reduce(
    (
      total,
      item,
    ) =>
      total +
      spellSpace(
        item,
        pool,
      ) *
        quantityOf(item),
    0,
  );
}

/* ============================================================
   EXPAND / COMPRESS
   ============================================================ */

function expandTroops(
  items: GeneratedStackItem[],
): GeneratedStackItem[] {
  const result:
    GeneratedStackItem[] =
    [];

  for (
    const item of items
  ) {
    const quantity =
      quantityOf(item);

    for (
      let index = 0;
      index < quantity;
      index++
    ) {
      result.push({
        ...clone(item),
        quantity: 1,
      });
    }
  }

  return result;
}

function expandSpells(
  items: GeneratedSpellItem[],
): GeneratedSpellItem[] {
  const result:
    GeneratedSpellItem[] =
    [];

  for (
    const item of items
  ) {
    const quantity =
      quantityOf(item);

    for (
      let index = 0;
      index < quantity;
      index++
    ) {
      result.push({
        ...clone(item),
        quantity: 1,
      });
    }
  }

  return result;
}

function compressTroops(
  items: GeneratedStackItem[],
): GeneratedStackItem[] {
  const result =
    new Map<
      string,
      GeneratedStackItem
    >();

  for (
    const item of items
  ) {
    const key =
      normalize(item.id);

    const existing =
      result.get(key);

    if (existing) {
      existing.quantity +=
        quantityOf(item);
    } else {
      result.set(
        key,
        {
          ...clone(item),
          quantity:
            quantityOf(item),
        },
      );
    }
  }

  return [
    ...result.values(),
  ];
}

function compressSpells(
  items: GeneratedSpellItem[],
): GeneratedSpellItem[] {
  const result =
    new Map<
      string,
      GeneratedSpellItem
    >();

  for (
    const item of items
  ) {
    const key =
      normalize(item.id);

    const existing =
      result.get(key);

    if (existing) {
      existing.quantity +=
        quantityOf(item);
    } else {
      result.set(
        key,
        {
          ...clone(item),
          quantity:
            quantityOf(item),
        },
      );
    }
  }

  return [
    ...result.values(),
  ];
}

/* ============================================================
   REMOVAL PUZZLE
   ============================================================ */

type RemovalOption = {
  units: GeneratedStackItem[];
  capacity: number;
  bannedTypes: Set<string>;
};

function removalSignature(
  units: GeneratedStackItem[],
): string {
  return units
    .map(
      (item) =>
        normalize(
          item.id,
        ),
    )
    .sort()
    .join("|");
}

/*
 * Bouw veel mogelijke manieren om een bepaalde
 * hoeveelheid capacity uit de bestaande army
 * te verwijderen.
 *
 * BELANGRIJK:
 * We bewaren meerdere combinaties per capacity,
 * omdat dezelfde capacity verschillende banned
 * trooptypes kan opleveren.
 */
function buildRemovalOptions(
  source: GeneratedStackItem[],
  target: number,
  pool: GameDataItem[],
): RemovalOption[] {
  const totalCapacity =
    troopCapacity(
      source,
      pool,
    );

  if (
    totalCapacity <= 0 ||
    target <= 0
  ) {
    return [];
  }

  /*
   * DIT IS DE HARDE MUTATION-BAND.
   *
   * Bijvoorbeeld:
   *
   * 352 × 33% = 116
   *
   * Alleen 111 t/m 121 is toegestaan.
   */
  const minimum =
    Math.max(
      0,
      target - 5,
    );

  const maximum =
    Math.min(
      totalCapacity,
      target + 5,
    );

  /*
   * We werken met de daadwerkelijke losse
   * units uit de basisarmy.
   */
  const units =
    shuffled(
      expandTroops(source),
    );

  /*
   * Voor iedere bereikbare capacity bewaren we
   * meerdere verschillende combinaties.
   *
   * Dit is belangrijk:
   *
   * 120 capacity met Super Bowler + Healer
   *
   * is voor replacement iets heel anders dan
   *
   * 120 capacity met Ice Golem + Valkyrie + ...
   */
  const states =
    new Map<
      number,
      GeneratedStackItem[][]
    >();

  states.set(
    0,
    [[]],
  );

  for (
    const unit of units
  ) {
    const space =
      troopSpace(
        unit,
        pool,
      );

    const snapshot =
      [...states.entries()];

    for (
      const [
        current,
        combinations,
      ] of snapshot
    ) {
      const next =
        current + space;

      /*
       * Alles boven de harde maximum-band
       * bestaat niet meer voor deze mutation.
       */
      if (
        next > maximum
      ) {
        continue;
      }

      const bucket =
        states.get(
          next,
        ) ?? [];

      for (
        const combination of
          combinations
      ) {
        const candidate = [
          ...combination,
          unit,
        ];

        const signature =
          candidate
            .map(
              (item) =>
                normalize(
                  item.id,
                ),
            )
            .sort()
            .join("|");

        const duplicate =
          bucket.some(
            (existing) =>
              existing
                .map(
                  (item) =>
                    normalize(
                      item.id,
                    ),
                )
                .sort()
                .join("|") ===
              signature,
          );

        if (
          duplicate
        ) {
          continue;
        }

        bucket.push(
          candidate,
        );

        /*
         * We hebben geen duizenden bijna
         * identieke oplossingen nodig.
         */
        if (
          bucket.length >=
          REMOVAL_OPTIONS_PER_CAPACITY
        ) {
          break;
        }
      }

      states.set(
        next,
        bucket,
      );
    }
  }

  const result:
    RemovalOption[] =
    [];

  /*
   * Alleen de capacities binnen de
   * target ±5-band komen hier terecht.
   */
  for (
    let capacity =
      minimum;
    capacity <= maximum;
    capacity++
  ) {
    const combinations =
      states.get(
        capacity,
      ) ?? [];

    for (
      const units of
        combinations
    ) {
      const bannedTypes =
        new Set(
          units.map(
            (item) =>
              normalize(
                item.id,
              ),
          ),
        );

      result.push({
        units,
        capacity,
        bannedTypes,
      });
    }
  }

  /*
   * Beste target eerst.
   *
   * Dus bij target 116:
   *
   * 116
   * daarna 115/117
   * daarna 114/118
   * enz.
   */
  result.sort(
    (a, b) =>
      Math.abs(
        a.capacity - target,
      ) -
      Math.abs(
        b.capacity - target,
      ),
  );

  /*
   * Laat de random generator nog steeds
   * variatie houden tussen oplossingen met
   * dezelfde afstand tot target.
   */
  const grouped =
    new Map<
      number,
      RemovalOption[]
    >();

  for (
    const option of result
  ) {
    const distance =
      Math.abs(
        option.capacity -
          target,
      );

    const bucket =
      grouped.get(
        distance,
      ) ?? [];

    bucket.push(
      option,
    );

    grouped.set(
      distance,
      bucket,
    );
  }

  const randomized:
    RemovalOption[] =
    [];

  for (
    const bucket of grouped.values()
  ) {
    randomized.push(
      ...shuffled(bucket),
    );
  }

  return randomized.slice(
    0,
    MAX_REMOVAL_CANDIDATES,
  );
}

function removeTroops(
  source: GeneratedStackItem[],
  removed: GeneratedStackItem[],
): GeneratedStackItem[] {
  const counts =
    new Map<
      string,
      number
    >();

  for (
    const item of removed
  ) {
    const key =
      normalize(item.id);

    counts.set(
      key,
      (counts.get(key) ?? 0) +
        1,
    );
  }

  const remaining:
    GeneratedStackItem[] =
    [];

  for (
    const item of
      expandTroops(source)
  ) {
    const key =
      normalize(item.id);

    const count =
      counts.get(key) ?? 0;

    if (
      count > 0
    ) {
      counts.set(
        key,
        count - 1,
      );
      continue;
    }

    remaining.push(item);
  }

  return compressTroops(
    remaining,
  );
}

/* ============================================================
   EXACT REPLACEMENT PUZZLE
   ============================================================ */

function exactTroopReplacement(
  pool: GameDataItem[],
  targetCapacity: number,
  bannedTypes: Set<string>,
  remainingTroops: GeneratedStackItem[] = [],
): GeneratedStackItem[] | null {
  if (
    targetCapacity <= 0
  ) {
    return [];
  }

  /*
   * ==========================================================
   * BESTAANDE SUPER TROOPS IN DE OVERGEBLEVEN ARMY
   * ==========================================================
   */
  const existingSuperTypes =
    new Set<string>();

  for (
    const troop of remainingTroops
  ) {
    const gameItem =
      findTroopData(
        troop,
        pool,
      );

    if (
      gameItem?.__isSuperTroop
    ) {
      existingSuperTypes.add(
        normalize(
          idOf(gameItem),
        ),
      );
    }
  }

  /*
   * TH18:
   * maximaal 2 verschillende Super Troop-types
   * in de VOLLEDIGE eigen army.
   */
  if (
    existingSuperTypes.size > 2
  ) {
    return null;
  }

  const banned =
    new Set(
      [...bannedTypes].map(
        (value) =>
          normalize(value),
      ),
    );

  const allTroops =
    flattenTroopPool(
      pool,
    ).filter(
      (item) => {
        const id =
          normalize(
            idOf(item),
          );

        const space =
          gameHousingSpace(item);

        return (
          !banned.has(id) &&
          space > 0 &&
          space <=
            targetCapacity
        );
      },
    );

  if (
    !allTroops.length
  ) {
    return null;
  }

  /*
   * Normale troops mogen altijd.
   */
  const normalTroops =
    allTroops.filter(
      (item) =>
        !(
          item as TroopDataItem
        ).__isSuperTroop,
    );

  /*
   * Nieuwe Super Troops die nog kunnen worden
   * toegevoegd.
   */
  const newSuperTroops =
    allTroops.filter(
      (item) =>
        (
          item as TroopDataItem
        ).__isSuperTroop,
    );

  /*
   * Maximaal aantal nieuwe Super Troop-types.
   */
  const maxNewSuperTypes =
    2 -
    existingSuperTypes.size;

  /*
   * Maak mogelijke sets van Super Troops:
   *
   * 0 nieuwe
   * 1 nieuwe
   * 2 nieuwe
   *
   * We hoeven niet alle combinaties van
   * aantallen te bewaren; alleen de types.
   */
  const superPools:
    GameDataItem[][] =
    [[]];

  if (
    maxNewSuperTypes >= 1
  ) {
    for (
      const troop of
        shuffled(
          newSuperTroops,
        )
    ) {
      superPools.push([
        troop,
      ]);
    }
  }

  if (
    maxNewSuperTypes >= 2
  ) {
    const supers =
      shuffled(
        newSuperTroops,
      );

    for (
      let i = 0;
      i < supers.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < supers.length;
        j++
      ) {
        superPools.push([
          supers[i],
          supers[j],
        ]);
      }
    }
  }

  /*
   * Probeer voor iedere toegestane Super-Troop-set
   * exact de benodigde capacity te vullen.
   */
  for (
    const selectedSupers of
      shuffled(
        superPools,
      )
  ) {
    const allowedSuperIds =
      new Set(
        selectedSupers.map(
          (item) =>
            normalize(
              idOf(item),
            ),
        ),
      );

    const candidates = [
      ...normalTroops,
      ...newSuperTroops.filter(
        (item) =>
          allowedSuperIds.has(
            normalize(
              idOf(item),
            ),
          ),
      ),
    ];

    /*
     * Exacte unlimited knapsack.
     *
     * dp[x] = complete combinatie voor x.
     */
    const dp:
      Array<
        GeneratedStackItem[] | null
      > =
      new Array(
        targetCapacity + 1,
      ).fill(null);

    dp[0] = [];

    for (
      let capacity = 1;
      capacity <=
        targetCapacity;
      capacity++
    ) {
      const possible =
        shuffled(
          candidates.filter(
            (candidate) =>
              gameHousingSpace(
                candidate,
              ) <=
              capacity,
          ),
        );

      for (
        const candidate of
          possible
      ) {
        const space =
          gameHousingSpace(
            candidate,
          );

        const previous =
          dp[
            capacity - space
          ];

        if (
          previous === null
        ) {
          continue;
        }

        dp[capacity] = [
          ...previous,
          {
            id:
              idOf(candidate),
            name:
              nameOf(candidate),
            quantity: 1,
            housingSpace:
              space,
          },
        ];

        break;
      }
    }

    const solution =
      dp[targetCapacity];

    if (
      solution === null
    ) {
      continue;
    }

    const compressed =
      compressTroops(
        solution,
      );

    /*
     * Exact replacement capacity.
     */
    if (
      troopCapacity(
        compressed,
        pool,
      ) !==
      targetCapacity
    ) {
      continue;
    }

    /*
     * Verwijderde types mogen niet terugkomen.
     */
    const replacementIds =
      new Set(
        compressed.map(
          (item) =>
            normalize(
              item.id,
            ),
        ),
      );

    let bannedReturned =
      false;

    for (
      const bannedType of
        banned
    ) {
      if (
        replacementIds.has(
          bannedType,
        )
      ) {
        bannedReturned = true;
        break;
      }
    }

    if (
      bannedReturned
    ) {
      continue;
    }

    /*
     * Definitieve controle op het COMPLETE
     * eigen leger.
     */
    const finalArmy = [
      ...remainingTroops,
      ...compressed,
    ];

    const finalSuperTypes =
      new Set<string>();

    for (
      const troop of
        finalArmy
    ) {
      const gameItem =
        findTroopData(
          troop,
          pool,
        );

      if (
        gameItem?.__isSuperTroop
      ) {
        finalSuperTypes.add(
          normalize(
            idOf(gameItem),
          ),
        );
      }
    }

    if (
      finalSuperTypes.size >
      2
    ) {
      continue;
    }

    return compressed;
  }

  return null;
}

/* ============================================================
   TROOP MUTATION
   ============================================================ */

function mutateTroops(
  source: GeneratedStackItem[],
  pool: GameDataItem[],
  percentage: number,
): GeneratedStackItem[] {
  const originalCapacity =
    troopCapacity(
      source,
      pool,
    );

  if (
    originalCapacity <= 0
  ) {
    return [];
  }

  /*
   * ==========================================================
   * 100%
   * ==========================================================
   *
   * Alles uit de originele army verwijderen.
   *
   * Daarom worden ALLE oorspronkelijke trooptypes
   * verboden voor de replacement.
   */
  if (
    percentage >= 100
  ) {
    const removed =
      expandTroops(
        source,
      );

    const banned =
      new Set(
        removed.map(
          (item) =>
            normalize(
              item.id,
            ),
        ),
      );

    const replacement =
      exactTroopReplacement(
        pool,
        originalCapacity,
        banned,
        [],
      );

    if (
      replacement === null
    ) {
      /*
       * Geen geldige volledige puzzle.
       * Nooit een halfvolle army teruggeven.
       */
      return clone(source);
    }

    if (
      troopCapacity(
        replacement,
        pool,
      ) !==
      originalCapacity
    ) {
      return clone(source);
    }

    return replacement;
  }

  /*
   * ==========================================================
   * NORMALE MUTATION
   * ==========================================================
   */

  const target =
    Math.round(
      originalCapacity *
        (
          percentage /
          100
        ),
    );

  /*
   * De removal solver krijgt expliciet de
   * echte GameData mee.
   */
  const options =
    buildRemovalOptions(
      source,
      target,
      pool,
    );

  /*
   * Hier komt de kern van jouw idee:
   *
   * We gaan NIET één troop verwijderen en
   * daarna beginnen met vullen.
   *
   * We hebben eerst een volledige removal-
   * combinatie berekend.
   *
   * Daarna zoeken we een volledige replacement
   * voor exact die capaciteit.
   */
  for (
    const option of options
  ) {
    /*
     * Extra harde bandcheck.
     *
     * Dit maakt een fout zoals:
     *
     * target 116
     * removal 162
     *
     * onmogelijk.
     */
    if (
      option.capacity <
        target - 5 ||
      option.capacity >
        target + 5
    ) {
      continue;
    }

    /*
     * Alles wat uit de basis wordt gehaald
     * verdwijnt als eerste.
     */
    const remaining =
      removeTroops(
        source,
        option.units,
      );

    /*
     * Nu exact dezelfde capaciteit terugzoeken,
     * zonder één verwijderd trooptype.
     */
    const replacement =
      exactTroopReplacement(
        pool,
        option.capacity,
        option.bannedTypes,
        remaining,
      );

    if (
      replacement === null
    ) {
      /*
       * Deze removal kan niet compleet
       * opnieuw gevuld worden.
       *
       * Dan gewoon de volgende puzzle proberen.
       */
      continue;
    }

    /*
     * Exact hetzelfde aantal housing spaces.
     */
    const removedCapacity =
      troopCapacity(
        option.units,
        pool,
      );

    const replacementCapacity =
      troopCapacity(
        replacement,
        pool,
      );

    if (
      removedCapacity !==
      replacementCapacity
    ) {
      continue;
    }

    /*
     * Complete nieuwe army.
     */
    const result =
      compressTroops([
        ...remaining,
        ...replacement,
      ]);

    /*
     * Totale capacity MOET exact gelijk
     * blijven aan de oorspronkelijke army.
     */
    if (
      troopCapacity(
        result,
        pool,
      ) !==
      originalCapacity
    ) {
      continue;
    }

    /*
     * Definitieve controle:
     * een verwijderd trooptype mag nergens
     * als NIEUWE replacement terugkomen.
     */
    const replacementIds =
      new Set(
        replacement.map(
          (item) =>
            normalize(
              item.id,
            ),
        ),
      );

    let bannedReturned =
      false;

    for (
      const bannedType of
        option.bannedTypes
    ) {
      if (
        replacementIds.has(
          bannedType,
        )
      ) {
        bannedReturned = true;
        break;
      }
    }

    if (
      bannedReturned
    ) {
      continue;
    }

    /*
     * Dit is nu een COMPLETE, geldige mutation.
     */
    return result;
  }

  /*
   * Geen geldige oplossing gevonden.
   *
   * Belangrijk:
   * nooit een halfgevulde of verkeerd gevulde
   * army opslaan.
   */
  return clone(source);
}

/* ============================================================
   SPELLS
   ============================================================ */

function spellRemoval(
  source: GeneratedSpellItem[],
  target: number,
  pool: GameDataItem[],
): GeneratedSpellItem[] {
  if (
    target <= 0
  ) {
    return [];
  }

  const expanded =
    shuffled(
      expandSpells(source),
    );

  const total =
    spellCapacity(
      source,
      pool,
    );

  const minimum =
    Math.max(
      0,
      target - 5,
    );

  const maximum =
    Math.min(
      total,
      target + 5,
    );

  const states =
    new Map<
      number,
      GeneratedSpellItem[]
    >();

  states.set(
    0,
    [],
  );

  for (
    const item of expanded
  ) {
    const space =
      spellSpace(
        item,
        pool,
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
        current + space;

      if (
        next >
        maximum
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
        return (
          states.get(
            next,
          ) ?? []
        );
      }
    }
  }

  return [];
}

function spellReplacement(
  pool: GameDataItem[],
  targetCapacity: number,
  banned: Set<string>,
): GeneratedSpellItem[] | null {
  if (
    targetCapacity <= 0
  ) {
    return [];
  }

  const candidates =
    shuffled(
      pool.filter(
        (item) =>
          !banned.has(
            normalize(
              item.id,
            ),
          ) &&
          gameHousingSpace(
            item,
          ) > 0 &&
          gameHousingSpace(
            item,
          ) <=
            targetCapacity,
      ),
    );

  const dp:
    Array<
      GeneratedSpellItem[] | null
    > =
    new Array(
      targetCapacity + 1,
    ).fill(null);

  dp[0] = [];

  for (
    let capacity = 1;
    capacity <=
      targetCapacity;
    capacity++
  ) {
    for (
      const candidate of
        shuffled(
          candidates,
        )
    ) {
      const space =
        gameHousingSpace(
          candidate,
        );

      if (
        space >
        capacity
      ) {
        continue;
      }

      const previous =
        dp[
          capacity - space
        ];

      if (
        previous === null
      ) {
        continue;
      }

      dp[capacity] = [
        ...previous,
        {
          id:
            idOf(
              candidate,
            ),
          name:
            nameOf(
              candidate,
            ),
          quantity: 1,
          housingSpace:
            space,
        },
      ];

      break;
    }
  }

  const result =
    dp[targetCapacity];

  return result === null
    ? null
    : compressSpells(
        result,
      );
}

function removeSpells(
  source: GeneratedSpellItem[],
  removed: GeneratedSpellItem[],
): GeneratedSpellItem[] {
  const counts =
    new Map<
      string,
      number
    >();

  for (
    const item of removed
  ) {
    const key =
      normalize(item.id);

    counts.set(
      key,
      (counts.get(key) ?? 0) +
        1,
    );
  }

  const remaining:
    GeneratedSpellItem[] =
    [];

  for (
    const item of
      expandSpells(source)
  ) {
    const key =
      normalize(item.id);

    const count =
      counts.get(key) ?? 0;

    if (
      count > 0
    ) {
      counts.set(
        key,
        count - 1,
      );
      continue;
    }

    remaining.push(item);
  }

  return compressSpells(
    remaining,
  );
}

function mutateSpells(
  source: GeneratedSpellItem[],
  pool: GameDataItem[],
  percentage: number,
): GeneratedSpellItem[] {
  const original =
    spellCapacity(
      source,
      pool,
    );

  if (
    original <= 0
  ) {
    return [];
  }

  const target =
    percentage >= 100
      ? original
      : Math.round(
          original *
            (
              percentage /
              100
            ),
        );

  const removed =
    spellRemoval(
      source,
      target,
      pool,
    );

  if (
    !removed.length
  ) {
    return clone(source);
  }

  const removedCapacity =
    spellCapacity(
      removed,
      pool,
    );

  const remaining =
    removeSpells(
      source,
      removed,
    );

  const banned =
    new Set(
      removed.map(
        (item) =>
          normalize(
            item.id,
          ),
      ),
    );

  const replacement =
    spellReplacement(
      pool,
      removedCapacity,
      banned,
    );

  if (
    replacement === null
  ) {
    return clone(source);
  }

  const result =
    compressSpells([
      ...remaining,
      ...replacement,
    ]);

  if (
    spellCapacity(
      result,
      pool,
    ) !==
    original
  ) {
    return clone(source);
  }

  return result;
}

/* ============================================================
   HEROES / EQUIPMENT
   ============================================================ */

function compatibleEquipment(
  hero: GeneratedHero,
  equipmentPool: GameDataItem[],
): GameDataItem[] {
  const heroId =
    hero.id.toLowerCase();

  const heroName =
    hero.name.toLowerCase();

  return equipmentPool.filter(
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
}

function chooseHeroEquipment(
  hero: GeneratedHero,
  equipmentPool: GameDataItem[],
  slots: number,
): GeneratedHero["equipment"] {
  const pool =
    compatibleEquipment(
      hero,
      equipmentPool,
    );

  if (!pool.length) {
    return [];
  }

  return shuffled(
    pool,
  )
    .slice(
      0,
      slots,
    )
    .map((item) => ({
      id:
        idOf(item),
      name:
        nameOf(item),
    }));
}

function chooseRandomPetForHero(
  pets: GeneratedHero["pet"][],
  current: GeneratedHero["pet"],
): GeneratedHero["pet"] {
  const available =
    pets.filter(
      (pet) =>
        pet !== null &&
        pet.id !== current?.id,
    );

  if (!available.length) {
    return current;
  }

  return available[
    randomInt(
      0,
      available.length - 1,
    )
  ];
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

  const equipmentSlots =
    source[0]?.equipment.length ??
    0;

  /*
   * Een wijziging mag nooit leiden tot hero-equipment
   * die niet bij die hero hoort.
   */
  const replaceEquipmentSlot = (
    hero: GeneratedHero,
  ): GeneratedHero => {
    const legal =
      chooseHeroEquipment(
        hero,
        equipmentPool,
        equipmentSlots,
      );

    if (!legal.length) {
      return hero;
    }

    const current =
      [...hero.equipment];

    if (!current.length) {
      return {
        ...hero,
        equipment:
          legal,
      };
    }

    const slot =
      randomInt(
        0,
        current.length - 1,
      );

    const replacement =
      legal.find(
        (item) =>
          item.id !==
          current[slot].id,
      ) ??
      legal[0];

    current[slot] =
      replacement;

    return {
      ...hero,
      equipment:
        current,
    };
  };

  if (
    difficulty ===
    "FUCK_MY_LIFE"
  ) {
    const shuffledHeroes =
      shuffled(
        heroPool,
      ).slice(
        0,
        heroes.length,
      );

    return shuffledHeroes.map(
      (hero, index) => {
        const mutatedHero: GeneratedHero = {
          id:
            idOf(hero),
          name:
            nameOf(hero),
          equipment: [],
          pet:
            heroes[index]?.pet ??
            null,
        };

        return {
          ...mutatedHero,
          equipment:
            chooseHeroEquipment(
              mutatedHero,
              equipmentPool,
              equipmentSlots,
            ),
          pet:
            chooseRandomPetForHero(
              heroes.map(
                (item) =>
                  item.pet,
              ),
              mutatedHero.pet,
            ),
        };
      },
    );
  }

  const heroSwapCount =
    difficulty ===
    "OH_MY_GOD"
      ? 1
      : 2;

  const swapIndices =
    shuffled(
      heroes.map(
        (_, index) =>
          index,
      ),
    ).slice(
      0,
      Math.min(
        heroSwapCount,
        heroes.length,
      ),
    );

  for (
    const index of
      swapIndices
  ) {
    const current =
      heroes[index];

    const alternatives =
      heroPool.filter(
        (hero) =>
          idOf(hero) !==
          current.id,
      );

    if (!alternatives.length) {
      continue;
    }

    const replacement =
      alternatives[
        randomInt(
          0,
          alternatives.length -
            1,
        )
      ];

    const changed: GeneratedHero = {
      id:
        idOf(replacement),
      name:
        nameOf(replacement),
      equipment: [],
      pet:
        current.pet ??
        null,
    };

    /*
     * Nieuwe hero krijgt alleen equipment die daadwerkelijk
     * bij die hero hoort.
     */
    const legal =
      chooseHeroEquipment(
        changed,
        equipmentPool,
        equipmentSlots,
      );

    /*
     * Probeer bestaande equipment te behouden als die toevallig
     * ook voor de nieuwe hero geldig is.
     */
    const compatibleCurrent =
      current.equipment.filter(
        (item) =>
          legal.some(
            (candidate) =>
              candidate.id ===
              item.id,
          ),
      );

    changed.equipment =
      compatibleCurrent.length
        ? [
            ...compatibleCurrent,
            ...legal.filter(
              (item) =>
                !compatibleCurrent.some(
                  (currentItem) =>
                    currentItem.id ===
                    item.id,
                ),
            ),
          ].slice(
            0,
            equipmentSlots,
          )
        : legal;

    heroes[index] =
      changed;
  }

  /*
   * Easy = 1 equipment-mutatie.
   * Medium = 2 equipment-mutaties.
   * Pets blijven daarbij gekoppeld aan hun hero.
   */
  const equipmentChanges =
    difficulty ===
    "OH_MY_GOD"
      ? 1
      : 2;

  const equipmentIndices =
    shuffled(
      heroes.map(
        (_, index) =>
          index,
      ),
    ).slice(
      0,
      Math.min(
        equipmentChanges,
        heroes.length,
      ),
    );

  for (
    const index of
      equipmentIndices
  ) {
    heroes[index] =
      replaceEquipmentSlot(
        heroes[index],
      );
  }

  return heroes;
}

/* ============================================================
   PERCENTAGES
   ============================================================ */

export function generateMutationPercentages():
  MutationPercentage[] {
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

/* ============================================================
   PUBLIC API
   ============================================================ */

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
    mutateTroops(
      source.troops,
      capabilities.troops,
      mutatedPercent,
    );

  const spells =
    mutateSpells(
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
      troopCapacity(
        troops,
        capabilities.troops,
      ),

    spells,

    spellCapacity:
      spellCapacity(
        spells,
        capabilities.spells,
      ),

    heroes,

    pets:
      heroes
        .map(
          (hero) =>
            hero.pet,
        )
        .filter(
          (
            pet,
          ): pet is {
            id: string;
            name: string;
          } =>
            pet !== null,
        ),

    generatedAt:
      new Date().toISOString(),
  };
}
