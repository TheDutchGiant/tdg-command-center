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
): GeneratedStackItem[] | null {
  if (
    targetCapacity <= 0
  ) {
    return [];
  }

  /*
   * Alle normale troops + alle Super Troops.
   *
   * De identiteit wordt genormaliseerd.
   * Daardoor zijn bijvoorbeeld:
   *
   * Super Bowler
   * super-bowler
   *
   * nooit twee verschillende kandidaten.
   */
  const candidates =
    shuffled(
      flattenTroopPool(
        pool,
      ).filter(
        (item) => {
          const key =
            normalize(
              idOf(item),
            );

          const space =
            gameHousingSpace(
              item,
            );

          return (
            !bannedTypes.has(key) &&
            space > 0 &&
            space <=
              targetCapacity
          );
        },
      ),
    );

  if (
    !candidates.length
  ) {
    return null;
  }

  /*
   * Eerst vaststellen welke capacities exact
   * bereikbaar zijn.
   *
   * dp[0] = lege combinatie.
   *
   * Iedere volgende positie betekent:
   * "ik heb een COMPLETE combinatie voor
   * precies deze capacity."
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
    /*
     * Per capacity proberen we een willekeurige
     * kandidaatvolgorde.
     *
     * Hierdoor kunnen verschillende challenges
     * verschillende armies krijgen, terwijl de
     * rekenkundige uitkomst exact blijft.
     */
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

  if (
    result === null
  ) {
    return null;
  }

  const compressed =
    compressTroops(
      result,
    );

  /*
   * Harde controle:
   * replacement moet exact targetCapacity
   * zijn.
   */
  if (
    troopCapacity(
      compressed,
      pool,
    ) !==
    targetCapacity
  ) {
    return null;
  }

  /*
   * Harde controle:
   * géén verboden type mag in de replacement
   * staan.
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

  for (
    const banned of
      bannedTypes
  ) {
    if (
      replacementIds.has(
        banned,
      )
    ) {
      return null;
    }
  }

  return compressed;
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
          id:
            idOf(hero),
          name:
            nameOf(hero),
          equipment:
            [],
        }),
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

    if (
      alternatives.length
    ) {
      const replacement =
        alternatives[
          randomInt(
            0,
            alternatives.length -
              1,
          )
        ];

      heroes[index] = {
        id:
          idOf(
            replacement,
          ),
        name:
          nameOf(
            replacement,
          ),
        equipment:
          clone(
            current.equipment,
          ),
      };
    }
  }

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
    const index of
      equipmentIndices
  ) {
    const hero =
      heroes[index];

    const pool =
      compatibleEquipment(
        hero,
        equipmentPool,
      );

    if (
      !pool.length ||
      !hero.equipment.length
    ) {
      continue;
    }

    const current =
      [...hero.equipment];

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
      id:
        idOf(
          replacement,
        ),
      name:
        nameOf(
          replacement,
        ),
    };

    heroes[index] = {
      ...hero,
      equipment:
        current,
    };
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

    generatedAt:
      new Date().toISOString(),
  };
}
