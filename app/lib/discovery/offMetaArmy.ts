import { prisma } from "@/app/lib/prisma";

export type DiscoveryTier =
  | "L1"
  | "L2"
  | "L3";

export type OffMetaArmy = {
  id: number;
  tier: DiscoveryTier;
  cycle: number;
  name: string;
  fingerprint: string;
  armyShareCode: string;
  armyLink: string;
  usageCount: number;
  usagePercentage: number;
  daysSeen: number;
  source: string;
  troops: unknown[];
  spells: unknown[];
  siegeMachine: unknown | null;
  heroes: unknown[];
  pets: unknown[];
};

const EXCLUDED_TOP_COUNT = 20;

function randomItem<T>(
  items: T[]
): T {
  return items[
    Math.floor(
      Math.random() *
        items.length
    )
  ];
}

function buildArmyLink(
  shareCode: string
): string {
  if (
    shareCode.startsWith(
      "http://"
    ) ||
    shareCode.startsWith(
      "https://"
    )
  ) {
    return shareCode;
  }

  return (
    "https://link.clashofclans.com/en?action=CopyArmy&army=" +
    encodeURIComponent(
      shareCode
    )
  );
}

export async function generateOffMetaArmy(
  tier: DiscoveryTier
): Promise<OffMetaArmy> {
  return prisma.$transaction(
    async (tx) => {
      let armies =
        await tx.discoveryArmy.findMany({
          where: {
            tier,
            armyShareCode: {
              not: null,
            },
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
        });

      if (
        armies.length <=
        EXCLUDED_TOP_COUNT
      ) {
        throw new Error(
          `Er zijn minimaal ${
            EXCLUDED_TOP_COUNT + 1
          } ${tier}-armies nodig. Nu beschikbaar: ${armies.length}.`
        );
      }

      let candidates =
        armies
          .slice(
            EXCLUDED_TOP_COUNT
          )
          .filter(
            (army) =>
              !army.isUsed
          );

      /*
       * Als de huidige cycle volledig
       * gebruikt is, resetten we uitsluitend
       * de Off-Meta kandidaten.
       *
       * De top 20 blijft altijd uitgesloten.
       */
      if (
        candidates.length === 0
      ) {
        const currentCycle =
          Math.max(
            ...armies.map(
              (army) =>
                army.cycle
            )
          );

        const nextCycle =
          currentCycle + 1;

        const candidateIds =
          armies
            .slice(
              EXCLUDED_TOP_COUNT
            )
            .map(
              (army) =>
                army.id
            );

        await tx.discoveryArmy.updateMany({
          where: {
            id: {
              in:
                candidateIds,
            },
            tier,
          },
          data: {
            cycle:
              nextCycle,
            isUsed:
              false,
            lastUsedAt:
              null,
          },
        });

        armies =
          await tx.discoveryArmy.findMany({
            where: {
              tier,
              armyShareCode: {
                not: null,
              },
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
          });

        candidates =
          armies
            .slice(
              EXCLUDED_TOP_COUNT
            )
            .filter(
              (army) =>
                !army.isUsed
            );
      }

      if (
        candidates.length === 0
      ) {
        throw new Error(
          `Geen Off-Meta army beschikbaar voor ${tier}.`
        );
      }

      const selected =
        randomItem(
          candidates
        );

      const updated =
        await tx.discoveryArmy.update({
          where: {
            id: selected.id,
          },
          data: {
            isUsed:
              true,
            lastUsedAt:
              new Date(),
          },
        });

      if (
        !updated.armyShareCode
      ) {
        throw new Error(
          "Geselecteerde Off-Meta army heeft geen armyShareCode."
        );
      }

      return {
        id: updated.id,
        tier:
          updated.tier,
        cycle:
          updated.cycle,
        name:
          updated.name,
        fingerprint:
          updated.fingerprint,
        armyShareCode:
          updated.armyShareCode,
        armyLink:
          buildArmyLink(
            updated.armyShareCode
          ),
        usageCount:
          updated.usageCount,
        usagePercentage:
          updated.usagePercentage,
        daysSeen:
          updated.daysSeen,
        source:
          updated.source,
        troops:
          Array.isArray(
            updated.troops
          )
            ? updated.troops
            : [],
        spells:
          Array.isArray(
            updated.spells
          )
            ? updated.spells
            : [],
        siegeMachine:
          updated.siegeMachine &&
          typeof updated.siegeMachine ===
            "object"
            ? updated.siegeMachine
            : null,
        heroes:
          Array.isArray(
            updated.heroes
          )
            ? updated.heroes
            : [],
        pets:
          Array.isArray(
            updated.pets
          )
            ? updated.pets
            : [],
      };
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

export async function getOffMetaPoolInfo(
  tier: DiscoveryTier
) {
  const armies =
    await prisma.discoveryArmy.findMany({
      where: {
        tier,
        armyShareCode: {
          not: null,
        },
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
      select: {
        id: true,
        tier: true,
        name: true,
        usageCount: true,
        usagePercentage:
          true,
        daysSeen: true,
        cycle: true,
        isUsed: true,
        lastUsedAt:
          true,
        source: true,
      },
    });

  const top20 =
    armies.slice(
      0,
      EXCLUDED_TOP_COUNT
    );

  const candidates =
    armies.slice(
      EXCLUDED_TOP_COUNT
    );

  return {
    tier,
    total:
      armies.length,
    excludedTopCount:
      top20.length,
    candidateCount:
      candidates.length,
    usedCount:
      candidates.filter(
        (army) =>
          army.isUsed
      ).length,
    remainingCount:
      candidates.filter(
        (army) =>
          !army.isUsed
      ).length,
    currentCycle:
      Math.max(
        ...armies.map(
          (army) =>
            army.cycle
        ),
        1
      ),
  };
}
