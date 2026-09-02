import { prisma } from "@/app/lib/prisma";
import {
  mutateGeneratedArmy,
  generateMutationPercentages,
  type MutationDifficulty,
} from "./mutationEngine";
import {
  getTownHallCapabilities,
  type GameDataItem,
} from "./gameData";
import { buildArmyLink as buildClashArmyLink } from "./armyLink";
import {
  generateRandomArmy,
  type GeneratedArmy,
  type GeneratedHero,
  type GeneratedStackItem,
  type GeneratedSpellItem,
} from "./randomArmy";

const CHALLENGE_DURATION_DAYS = 7;
const GENERATION_DELAY_HOURS = 24;

const DIFFICULTIES: MutationDifficulty[] = [
  "OH_MY_GOD",
  "OH_HELL_NO",
  "FUCK_MY_LIFE",
];

const TOWN_HALLS = [18];

function randomItem<T>(items: T[]): T {
  if (!items.length) {
    throw new Error("Kan geen random item kiezen uit een lege lijst.");
  }

  return items[
    Math.floor(Math.random() * items.length)
  ];
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string"
    ? value
    : null;
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function itemHousingSpace(
  item: GameDataItem,
): number {
  const direct =
    numberValue(item.housingSpace);

  if (direct !== null) {
    return direct;
  }

  const levels = Array.isArray(item.levels)
    ? (item.levels as GameDataItem[])
    : [];

  for (const level of levels) {
    const value =
      numberValue(level.housingSpace);

    if (value !== null) {
      return value;
    }
  }

  return 1;
}

function findGameItem(
  item: Record<string, unknown>,
  pool: GameDataItem[],
): GameDataItem | undefined {
  const matchesItem = (
    candidate: GameDataItem,
  ): boolean => {
    const keys = [
      item.id,
      item.name,
      item.code,
      item.catalogItemId,
    ]
      .filter(
        (value) =>
          value !== undefined &&
          value !== null,
      )
      .map(normalize)
      .filter(Boolean);

    const candidateKeys = [
      candidate.id,
      candidate.name,
      candidate.dataId,
    ]
      .filter(
        (value) =>
          value !== undefined &&
          value !== null,
      )
      .map(normalize);

    return keys.some((key) =>
      candidateKeys.includes(key),
    );
  };

  for (const candidate of pool) {
    /*
     * Eerst de normale troop zelf proberen.
     */
    if (matchesItem(candidate)) {
      return candidate;
    }

    /*
     * Super Troops zitten in onze game-data
     * onder de bijbehorende normale troop.
     *
     * Dit werkt automatisch voor ALLE Super Troops.
     */
    if (
      candidate.superTroop &&
      typeof candidate.superTroop === "object" &&
      !Array.isArray(candidate.superTroop)
    ) {
      const superTroop =
        candidate.superTroop as GameDataItem;

      if (matchesItem(superTroop)) {
        return superTroop;
      }
    }
  }

  return undefined;
}

function buildTroops(
  value: unknown,
  pool: GameDataItem[],
): GeneratedStackItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  /*
   * Discovery Army is de bron van waarheid.
   *
   * BELANGRIJK:
   * Regular Troops + Super Troops vormen samen de
   * volledige eigen army. Super Troops worden dus
   * NIET verwijderd omdat ze niet in een aparte
   * officiële troop-pool staan.
   *
   * Voor housing space gebruiken we:
   * 1. de gegevens die al in Discovery staan;
   * 2. daarna de gekoppelde game-data;
   * 3. nooit een aparte Super-Troop-generator.
   */

  return value
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item),
    )
    .map((raw) => {
      const item =
        raw as Record<string, unknown>;

      const source =
        findGameItem(item, pool);

      const directHousing =
        numberValue(
          item.housingSpace,
        );

      /*
       * Super Troops staan niet als normale troop
       * in de officiële game-data pool.
       *
       * DiscoveryArmy bevat ze echter al als echte
       * army-items. Daarom gebruiken we voor Super
       * Troops de eigen catalogus/database-koppeling
       * in plaats van de officiële troop-pool.
       */
      const sourceHousing =
        source
          ? itemHousingSpace(source)
          : null;

      const housingSpace =
        directHousing !== null
          ? directHousing
          : sourceHousing ?? 1;

      return {
        id: String(
          item.id ??
            item.name ??
            source?.id ??
            "unknown",
        ),

        name: String(
          item.name ??
            source?.name ??
            item.id ??
            "Unknown",
        ),

        quantity: Math.max(
          1,
          Math.floor(
            numberValue(
              item.quantity,
            ) ?? 1,
          ),
        ),

        housingSpace,
      };
    });
}

function buildSpells(
  value: unknown,
  pool: GameDataItem[],
): GeneratedSpellItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item),
    )
    .map((raw) => {
      const item =
        raw as Record<string, unknown>;

      const source =
        findGameItem(item, pool);

      return {
        id: String(
          item.id ??
            item.name ??
            source?.id ??
            "unknown",
        ),
        name: String(
          item.name ??
            source?.name ??
            item.id ??
            "Unknown",
        ),
        quantity: Math.max(
          1,
          Math.floor(
            numberValue(
              item.quantity,
            ) ?? 1,
          ),
        ),
        housingSpace:
          itemHousingSpace(
            source ?? item,
          ),
      };
    });
}

function buildHeroes(
  value: unknown,
): GeneratedHero[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item),
    )
    .map((raw) => {
      const item =
        raw as Record<string, unknown>;

      const equipment =
        Array.isArray(item.equipment)
          ? item.equipment
              .filter(
                (entry) =>
                  entry &&
                  typeof entry ===
                    "object" &&
                  !Array.isArray(entry),
              )
              .map((entry) => {
                const equipment =
                  entry as Record<
                    string,
                    unknown
                  >;

                return {
                  id: String(
                    equipment.id ??
                      equipment.name ??
                      "unknown",
                  ),
                  name: String(
                    equipment.name ??
                      equipment.id ??
                      "Unknown",
                  ),
                };
              })
          : [];

      return {
        id: String(
          item.id ??
            item.name ??
            "unknown",
        ),
        name: String(
          item.name ??
            item.id ??
            "Unknown",
        ),
        equipment,
        pet: null,
      };
    });
}

function buildPets(
  value: unknown,
): {
  id: string;
  name: string;
}[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item),
    )
    .map((raw) => {
      const item =
        raw as Record<string, unknown>;

      return {
        id: String(
          item.id ??
            item.name ??
            "unknown",
        ),
        name: String(
          item.name ??
            item.id ??
            "Unknown",
        ),
      };
    });
}

async function buildSourceArmy(
  discovery: {
    name: string;
    troops: unknown;
    spells: unknown;
    siegeMachine: unknown;
    heroes: unknown;
    pets: unknown;
  },
  townHall: number,
): Promise<GeneratedArmy> {
  /*
   * BELANGRIJK:
   * De Discovery Army is de daadwerkelijke originele/off-meta army.
   *
   * We genereren hier dus GEEN nieuwe random army.
   * De complete army uit Discovery wordt als basis gebruikt
   * en mutateGeneratedArmy() vervangt daarna alleen het
   * gevraagde percentage.
   */

  const capabilities =
    await getTownHallCapabilities(
      townHall,
    );

  const troops =
    buildTroops(
      discovery.troops,
      capabilities.troops,
    );

  const spells =
    buildSpells(
      discovery.spells,
      capabilities.spells,
    );

  const sourceHeroes =
    buildHeroes(
      discovery.heroes,
    );

  const sourcePets =
    buildPets(
      discovery.pets,
    );

  if (sourceHeroes.length !== 4) {
    throw new Error(
      `Discovery Army "${discovery.name}" moet exact 4 heroes bevatten, gevonden: ${sourceHeroes.length}.`,
    );
  }

  if (sourcePets.length !== 4) {
    throw new Error(
      `Discovery Army "${discovery.name}" moet exact 4 pets bevatten, gevonden: ${sourcePets.length}.`,
    );
  }

  /*
   * De Discovery Army bevat de pets in dezelfde volgorde
   * als de vier heroes. Koppel daarom iedere pet aan de
   * overeenkomstige hero.
   */
  const heroes =
    sourceHeroes.map(
      (hero, index) => ({
        ...hero,
        pet:
          sourcePets[index] ?? null,
      }),
    );

  const sourceSiege =
    discovery.siegeMachine;

  const siegeMachine =
    sourceSiege &&
    typeof sourceSiege === "object" &&
    !Array.isArray(sourceSiege)
      ? (() => {
          const siege =
            sourceSiege as Record<string, unknown>;

          return {
            id: String(
              siege.id ??
                siege.name ??
                "unknown",
            ),
            name: String(
              siege.name ??
                siege.id ??
                "Unknown",
            ),
          };
        })()
      : null;

  const troopCapacity =
    troops.reduce(
      (sum, item) =>
        sum +
        item.quantity *
          item.housingSpace,
      0,
    );

  const spellCapacity =
    spells.reduce(
      (sum, item) =>
        sum +
        item.quantity *
          item.housingSpace,
      0,
    );

  if (troopCapacity !== capabilities.troopCapacity) {
    throw new Error(
      `Discovery Army "${discovery.name}" heeft ${troopCapacity}/${capabilities.troopCapacity} troop housing space.`,
    );
  }

  if (spellCapacity !== capabilities.spellCapacity) {
    throw new Error(
      `Discovery Army "${discovery.name}" heeft ${spellCapacity}/${capabilities.spellCapacity} spell housing space.`,
    );
  }

  return {
    townHall,

    difficulty:
      "OH_MY_GOD",

    troops,
    troopCapacity,

    spells,
    spellCapacity,

    /*
     * Alleen de daadwerkelijk gebruikte siege machine
     * gaat mee. De twee andere mogelijke machines uit
     * een Clash-army zijn hier bewust niet opgenomen.
     */
    siegeMachine,

    heroes,

    pets: sourcePets,

    /*
     * DiscoveryArmy bevat momenteel geen Clan Castle
     * gegevens. Daarom wordt dit onderdeel hier niet
     * verzonnen of random gegenereerd.
     */
    clanCastle: {
      troops: [],
      troopCapacity:
        capabilities.clanCastle.troopCapacity,

      spells: [],
      spellCapacity:
        capabilities.clanCastle.spellCapacity,

      siegeMachine: null,
    },

    generatedAt:
      new Date().toISOString(),
  };
}

function nextThursdayAt19(
  now: Date,
): Date {
  const result =
    new Date(now);

  const currentDay =
    result.getDay();

  let daysUntilThursday =
    (4 - currentDay + 7) % 7;

  if (
    currentDay === 4 &&
    result.getHours() >= 19
  ) {
    daysUntilThursday = 7;
  }

  result.setDate(
    result.getDate() +
      daysUntilThursday,
  );

  result.setHours(
    19,
    0,
    0,
    0,
  );

  return result;
}

async function chooseSourceArmy() {
  const armies =
    await prisma.discoveryArmy.findMany({
      where: {
        armyShareCode: {
          not: null,
        },
        tier: "L1",
      },
      orderBy: [
        {
          usageCount:
            "desc",
        },
        {
          id: "asc",
        },
      ],
      take: 500,
    });

  if (!armies.length) {
    throw new Error(
      "Geen DiscoveryArmies beschikbaar voor de Random Army Challenge.",
    );
  }

  return randomItem(
    armies,
  );
}

async function chooseBase(
  townHall: number,
) {
  const now =
    new Date();

  return prisma.base.findFirst({
    where: {
      townHall,
      isActive: true,
      OR: [
        {
          expiresAt: null,
        },
        {
          expiresAt: {
            gt: now,
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

function buildVariantShareCode(
  army: GeneratedArmy,
): string | null {
  try {
    return buildClashArmyLink({
      troops:
        army.troops.map((item) => ({
          name: item.name,
          quantity: item.quantity,
        })),

      spells:
        army.spells.map((item) => ({
          name: item.name,
          quantity: item.quantity,
        })),

      siegeMachine:
        army.siegeMachine
          ? {
              name:
                army.siegeMachine.name,
              quantity: 1,
            }
          : null,

      heroes:
        army.heroes.map((hero) => ({
          name: hero.name,
          equipment: hero.equipment.map(
            (equipment) =>
              equipment.name,
          ),
        })),

      clanCastleTroops:
        army.clanCastle.troops.map(
          (item) => ({
            name: item.name,
            quantity:
              item.quantity,
          }),
        ),

      clanCastleSpells:
        army.clanCastle.spells.map(
          (item) => ({
            name: item.name,
            quantity:
              item.quantity,
          }),
        ),
    });
  } catch (error) {
    console.error(
      "Kon Clash army-link niet bouwen:",
      error,
    );

    return null;
  }
}

async function ensureVariants(
  challenge: {
    id: number;
    townHall: number;
    sourceArmyId: number | null;
  },
) {
  if (
    challenge.sourceArmyId ===
    null
  ) {
    throw new Error(
      "Challenge heeft geen sourceArmyId.",
    );
  }

  const source =
    await prisma.discoveryArmy.findUnique({
      where: {
        id:
          challenge.sourceArmyId,
      },
    });

  if (!source) {
    throw new Error(
      `DiscoveryArmy ${challenge.sourceArmyId} bestaat niet meer.`,
    );
  }

  const existing =
    await prisma.randomChallengeVariant.findMany({
      where: {
        challengeId:
          challenge.id,
      },
      select: {
        difficulty: true,
      },
    });

  const existingDifficulties =
    new Set(
      existing.map(
        (variant) =>
          variant.difficulty,
      ),
    );

  /*
   * Bestaande variants die al bestaan maar nog
   * geen Clash-link hebben, worden alleen aangevuld.
   *
   * De locked army zelf wordt NIET opnieuw gegenereerd.
   */
  const existingVariants =
    await prisma.randomChallengeVariant.findMany({
      where: {
        challengeId:
          challenge.id,
        armyShareCode:
          null,
      },
    });

  for (const variant of existingVariants) {
    const existingArmy =
      variant.army as unknown as GeneratedArmy;

    const armyShareCode =
      buildVariantShareCode(
        existingArmy,
      );

    if (armyShareCode) {
      await prisma.randomChallengeVariant.update({
        where: {
          id: variant.id,
        },
        data: {
          armyShareCode,
        },
      });
    }
  }

  const percentages =
    generateMutationPercentages();

  const baseArmy =
    await buildSourceArmy(
      source,
      challenge.townHall,
    );

  for (
    const percentage of percentages
  ) {
    if (
      existingDifficulties.has(
        percentage.difficulty,
      )
    ) {
      continue;
    }

    const mutated =
      await mutateGeneratedArmy(
        baseArmy,
        percentage.difficulty,
        percentage.mutatedPercent,
      );

    const armyShareCode =
      buildVariantShareCode(
        mutated,
      );

    await prisma.randomChallengeVariant.create({
      data: {
        challengeId:
          challenge.id,
        difficulty:
          percentage.difficulty,
        mutatedPercent:
          percentage.mutatedPercent,
        sourceArmyId:
          source.id,
        sourceArmyName:
          source.name,
        originalArmy:
          baseArmy as unknown as object,
        army:
          mutated as unknown as object,
        armyShareCode,
        generatedAt:
          new Date(),
        lockedAt:
          new Date(),
      },
    });
  }
}

export async function ensureActiveChallenge() {
  const now =
    new Date();

  let active =
    await prisma.randomChallenge.findFirst({
      where: {
        status: "ACTIVE",
        startsAt: {
          lte: now,
        },
        endsAt: {
          gt: now,
        },
      },
      orderBy: {
        startsAt: "desc",
      },
      include: {
        variants: true,
      },
    });

  /*
   * Ook een al aangemaakte toekomstige challenge
   * teruggeven. De pagina kan daarmee de countdown tonen.
   */
  if (!active) {
    active =
      await prisma.randomChallenge.findFirst({
        where: {
          status: "ACTIVE",
          startsAt: {
            gt: now,
          },
        },
        orderBy: {
          startsAt: "asc",
        },
        include: {
          variants: true,
        },
      });
  }

  /*
   * Geen challenge? Maak de volgende donderdag 19:00.
   */
  if (!active) {
    const latest =
      await prisma.randomChallenge.findFirst({
        orderBy: {
          id: "desc",
        },
      });

    const townHall =
      randomItem(
        TOWN_HALLS,
      );

    const source =
      await chooseSourceArmy();

    const base =
      await chooseBase(
        townHall,
      );

    const startsAt =
      nextThursdayAt19(
        now,
      );

    const generationAt =
      new Date(
        startsAt.getTime() +
          GENERATION_DELAY_HOURS *
            60 *
            60 *
            1000,
      );

    const endsAt =
      new Date(
        startsAt.getTime() +
          CHALLENGE_DURATION_DAYS *
            24 *
            60 *
            60 *
            1000,
      );

    active =
      await prisma.randomChallenge.create({
        data: {
          title:
            `TDG Random Army Challenge #${
              (latest?.id ?? 0) + 1
            }`,
          townHall,
          baseId:
            base?.id ?? null,
          startsAt,
          generationAt,
          endsAt,
          status:
            "ACTIVE",
          sourceArmyId:
            source.id,
          sourceArmyName:
            source.name,
        },
        include: {
          variants: true,
        },
      });
  }

  /*
   * Alleen na de 24 uur countdown genereren.
   * Daarna blijven de drie variants locked.
   */
  if (
    now >= active.generationAt &&
    active.variants.length < 3
  ) {
    await ensureVariants({
      id: active.id,
      townHall:
        active.townHall,
      sourceArmyId:
        active.sourceArmyId,
    });

    active =
      (await prisma.randomChallenge.findUnique({
        where: {
          id: active.id,
        },
        include: {
          variants: true,
        },
      }))!;
  }

  return active;
}
