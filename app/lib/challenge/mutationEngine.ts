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
        const type =
          normalize(
            nameOf(item),
          );

        const space =
          gameHousingSpace(item);

        return (
          !banned.has(type) &&
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

  /*
   * Spell capacity is maar 11.
   * Daarom gebruiken we hier een kleine tolerance:
   * maximaal 1 housing space afwijking van het percentage.
   */
  const minimum =
    Math.max(
      1,
      target - 1,
    );

  const maximum =
    Math.min(
      total,
      target + 1,
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
    normalize(hero.id);

  const heroName =
    normalize(hero.name);

  return equipmentPool.filter(
    (equipment) => {
      const owner =
        typeof equipment.hero ===
        "string"
          ? normalize(equipment.hero)
          : "";

      const ownerId =
        typeof equipment.heroId ===
        "string"
          ? normalize(equipment.heroId)
          : "";

      const ownerName =
        typeof equipment.heroName ===
        "string"
          ? normalize(equipment.heroName)
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
      Math.min(
        slots,
        pool.length,
      ),
    )
    .map(
      (item) => ({
        id:
          idOf(item),
        name:
          nameOf(item),
      }),
    );
}

function chooseUniquePets(
  petPool: GameDataItem[],
  count: number,
): GeneratedHero["pet"][] {
  return shuffled(
    petPool,
  )
    .slice(
      0,
      Math.min(
        count,
        petPool.length,
      ),
    )
    .map(
      (pet) => ({
        id:
          idOf(pet),
        name:
          nameOf(pet),
      }),
    );
}

function mutateHeroes(
  source: GeneratedHero[],
  heroPool: GameDataItem[],
  equipmentPool: GameDataItem[],
  petPool: GameDataItem[],
  difficulty: MutationDifficulty,
): GeneratedHero[] {
  const heroes =
    clone(source);

  if (
    heroes.length !== 4 ||
    heroPool.length < 4
  ) {
    return heroes;
  }

  const equipmentSlots =
    2;

  const uniqueHeroPool =
    shuffled(heroPool);

  const chooseDifferentHero =
    (
      currentId: string,
      usedIds: Set<string>,
    ): GameDataItem | null => {
      const alternatives =
        uniqueHeroPool.filter(
          (hero) => {
            const id =
              normalize(
                idOf(hero),
              );

            return (
              id !==
                normalize(
                  currentId,
                ) &&
              !usedIds.has(id)
            );
          },
        );

      if (!alternatives.length) {
        return null;
      }

      return alternatives[
        randomInt(
          0,
          alternatives.length - 1,
        )
      ];
    };

  /*
   * FUCK MY LIFE
   *
   * Alles opnieuw legaal randomiseren.
   */
  if (
    difficulty ===
    "FUCK_MY_LIFE"
  ) {
    const selectedHeroes =
      shuffled(
        uniqueHeroPool,
      ).slice(0, 4);

    const selectedPets =
      chooseUniquePets(
        petPool,
        4,
      );

    return selectedHeroes.map(
      (
        hero,
        index,
      ) => ({
        id:
          idOf(hero),
        name:
          nameOf(hero),
        equipment:
          chooseHeroEquipment(
            {
              id:
                idOf(hero),
              name:
                nameOf(hero),
              equipment: [],
              pet: null,
            },
            equipmentPool,
            equipmentSlots,
          ),
        pet:
          selectedPets[index] ??
          null,
      }),
    );
  }

  const heroSwapCount =
    difficulty ===
    "OH_MY_GOD"
      ? 1
      : 2;

  /*
   * Kies eerst welke hero-slots wisselen.
   */
  const swapIndices =
    shuffled(
      heroes.map(
        (_, index) =>
          index,
      ),
    ).slice(
      0,
      heroSwapCount,
    );

  const swapped =
    new Set(
      swapIndices,
    );

  /*
   * Houd bestaande heroes uniek.
   */
  const usedHeroIds =
    new Set<string>();

  for (const hero of heroes) {
    usedHeroIds.add(
      normalize(hero.id),
    );
  }

  /*
   * HERO SWAPS
   *
   * Een gewisselde hero krijgt automatisch
   * legale equipment van de nieuwe hero.
   * Dit is geen extra equipment-mutation,
   * maar noodzakelijk om de army legaal te houden.
   *
   * De pet blijft op deze hero-slot staan.
   */
  for (
    const index of swapIndices
  ) {
    const current =
      heroes[index];

    const replacement =
      chooseDifferentHero(
        current.id,
        usedHeroIds,
      );

    if (!replacement) {
      continue;
    }

    usedHeroIds.delete(
      normalize(
        current.id,
      ),
    );

    usedHeroIds.add(
      normalize(
        idOf(replacement),
      ),
    );

    const replacementHero: GeneratedHero = {
      id:
        idOf(replacement),
      name:
        nameOf(replacement),
      equipment: [],
      pet:
        current.pet ??
        null,
    };

    replacementHero.equipment =
      chooseHeroEquipment(
        replacementHero,
        equipmentPool,
        equipmentSlots,
      );

    heroes[index] =
      replacementHero;
  }

  /*
   * EQUIPMENT MUTATION
   *
   * Alleen NIET-gewisselde heroes.
   *
   * OH MY GOD:
   *   1 van de 3
   *
   * OH HELL NO:
   *   beide overige 2
   */
  const equipmentTargets =
    shuffled(
      heroes
        .map(
          (_, index) =>
            index,
        )
        .filter(
          (index) =>
            !swapped.has(index),
        ),
    ).slice(
      0,
      difficulty ===
        "OH_MY_GOD"
        ? 1
        : 2,
    );

  for (
    const index of
      equipmentTargets
  ) {
    const hero =
      heroes[index];

    const legal =
      compatibleEquipment(
        hero,
        equipmentPool,
      );

    if (
      legal.length <
      equipmentSlots
    ) {
      continue;
    }

    const currentIds =
      new Set(
        hero.equipment.map(
          (item) =>
            normalize(
              item.id,
            ),
        ),
      );

    const alternatives =
      legal.filter(
        (item) =>
          !currentIds.has(
            normalize(
              idOf(item),
            ),
          ),
      );

    if (!alternatives.length) {
      continue;
    }

    const slot =
      randomInt(
        0,
        equipmentSlots - 1,
      );

    const replacement =
      alternatives[
        randomInt(
          0,
          alternatives.length - 1,
        )
      ];

    hero.equipment[
      slot
    ] = {
      id:
        idOf(replacement),
      name:
        nameOf(replacement),
    };
  }

  /*
   * PET MUTATION
   *
   * Pets zijn onafhankelijk van heroes.
   * Iedere hero houdt exact één unieke pet.
   */
  const petTargets =
    shuffled(
      heroes.map(
        (_, index) =>
          index,
      ),
    ).slice(
      0,
      difficulty ===
        "OH_MY_GOD"
        ? 1
        : 2,
    );

  const usedPetIds =
    new Set<string>();

  for (const hero of heroes) {
    if (hero.pet) {
      usedPetIds.add(
        normalize(
          hero.pet.id,
        ),
      );
    }
  }

  for (
    const index of
      petTargets
  ) {
    const hero =
      heroes[index];

    const alternatives =
      shuffled(
        petPool.filter(
          (pet) =>
            !usedPetIds.has(
              normalize(
                idOf(pet),
              ),
            ),
        ),
      );

    if (!alternatives.length) {
      continue;
    }

    if (hero.pet) {
      usedPetIds.delete(
        normalize(
          hero.pet.id,
        ),
      );
    }

    const replacement =
      alternatives[0];

    hero.pet = {
      id:
        idOf(replacement),
      name:
        nameOf(replacement),
    };

    usedPetIds.add(
      normalize(
        idOf(replacement),
      ),
    );
  }

  /*
   * Definitieve legaliteitscontrole.
   */
  const heroIds =
    new Set<string>();

  const petIds =
    new Set<string>();

  for (
    const hero of
      heroes
  ) {
    if (
      heroIds.has(
        normalize(
          hero.id,
        ),
      )
    ) {
      throw new Error(
        `Ongeldige Challenge army: dubbele hero ${hero.name}.`,
      );
    }

    heroIds.add(
      normalize(
        hero.id,
      ),
    );

    if (
      hero.equipment.length !==
      equipmentSlots
    ) {
      throw new Error(
        `Ongeldige Challenge army: ${hero.name} heeft niet exact 2 equipment.`,
      );
    }

    const legal =
      compatibleEquipment(
        hero,
        equipmentPool,
      );

    for (
      const equipment of
        hero.equipment
    ) {
      const equipmentId =
        normalize(
          equipment.id,
        );

      const equipmentName =
        normalize(
          equipment.name,
        );

      const knownLegal =
        legal.some(
          (candidate) =>
            normalize(
              idOf(candidate),
            ) === equipmentId ||
            normalize(
              nameOf(candidate),
            ) === equipmentName,
        );

      /*
       * Equipment die niet in de huidige game-data staat
       * mag behouden blijven wanneer deze al onderdeel
       * was van de bron-army. Nieuwe equipment kan alleen
       * via compatibleEquipment() worden gekozen.
       */
      const sourceEquipment =
        source
          .find(
            (sourceHero) =>
              normalize(
                sourceHero.id,
              ) ===
              normalize(
                hero.id,
              ),
          )
          ?.equipment ?? [];

      const wasAlreadyEquipped =
        sourceEquipment.some(
          (candidate) =>
            normalize(
              candidate.id,
            ) === equipmentId ||
            normalize(
              candidate.name,
            ) === equipmentName,
        );

      if (
        !knownLegal &&
        !wasAlreadyEquipped
      ) {
        throw new Error(
          `Ongeldige Challenge army: ${equipment.name} hoort niet bij ${hero.name}.`,
        );
      }
    }

    if (hero.pet) {
      const petId =
        normalize(
          hero.pet.id,
        );

      if (
        petIds.has(
          petId,
        )
      ) {
        throw new Error(
          `Ongeldige Challenge army: dubbele pet ${hero.pet.name}.`,
        );
      }

      petIds.add(
        petId,
      );
    }
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


function mutateSiegeMachine(
  source: GeneratedArmy["siegeMachine"],
  pool: GameDataItem[],
): GeneratedArmy["siegeMachine"] {
  const alternatives =
    pool.filter(
      (item) =>
        normalize(
          idOf(item),
        ) !==
        normalize(
          source.id,
        ),
    );

  if (!alternatives.length) {
    return source;
  }

  const replacement =
    alternatives[
      randomInt(
        0,
        alternatives.length - 1,
      )
    ];

  return {
    id:
      idOf(replacement),
    name:
      nameOf(replacement),
  };
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
      capabilities.pets,
      difficulty,
    );

  const siegeMachine =
    mutateSiegeMachine(
      source.siegeMachine,
      capabilities.siegeMachines,
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

    siegeMachine,

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

    /*
     * Clan Castle blijft volledig onaangeraakt.
     */
    clanCastle:
      clone(
        source.clanCastle,
      ),

    generatedAt:
      new Date().toISOString(),
  };
}

