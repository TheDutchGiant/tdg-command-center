"use server";

import { prisma } from "@/app/lib/prisma";
import { parseClashDate } from "@/app/lib/clash";

/*
 * Bepaalt hoeveel clans vanuit een CWL-league promoveren.
 *
 * Dit staat centraal zodat de promotiegrens niet
 * op meerdere plekken in Phoenix hoeft te worden
 * bijgehouden.
 */
function determineCwlWinner(
  clanAStars: number,
  clanADestruction: number,
  clanBStars: number,
  clanBDestruction: number,
  clanATag: string,
  clanBTag: string
): string | null {
  if (clanAStars > clanBStars) {
    return clanATag;
  }

  if (clanBStars > clanAStars) {
    return clanBTag;
  }

  if (clanADestruction > clanBDestruction) {
    return clanATag;
  }

  if (clanBDestruction > clanADestruction) {
    return clanBTag;
  }

  return null;
}

export async function getCwlPromotionSlots(
  leagueName: string
): Promise<number> {
  // Tijdelijk: alle CWL-groepen hebben 2 promotieplaatsen.
  return 2;
}

export async function saveSeason(
  clanTag: string,
  clanName: string,
  apiSeason: string
) {
  const season = apiSeason.substring(0, 7);

  const clan = await prisma.clan.upsert({
    where: {
      tag: clanTag,
    },

    update: {
      name: clanName,
    },

    create: {
      tag: clanTag,
      name: clanName,
    },
  });

  return prisma.season.upsert({
    where: {
      clanId_season: {
        clanId: clan.id,
        season,
      },
    },

    update: {},

    create: {
      clanId: clan.id,
      season,
    },
  });
}

/*
 * Sla een gewone CWL-war op.
 */
export async function saveWar(
  warTag: string,
  season: string,
  round: number,
  data: any,
  clanTag: string,
  clanName: string
) {
  const seasonRecord = await saveSeason(
    clanTag,
    clanName,
    season
  );

  const normalizedClanTag =
    clanTag.replace("#", "");

  const ourClan =
    data.clan.tag.replace("#", "") ===
    normalizedClanTag
      ? data.clan
      : data.opponent;

  const enemyClan =
    data.clan.tag.replace("#", "") ===
    normalizedClanTag
      ? data.opponent
      : data.clan;

  return prisma.war.upsert({
    where: {
      warTag,
    },

    update: {
      state: data.state,

      isFinalized:
        data.state === "warEnded",

      teamSize: data.teamSize,

      preparationStartTime:
        parseClashDate(
          data.preparationStartTime
        ),

      warStartTime:
        parseClashDate(
          data.startTime
        ),

      warEndTime:
        parseClashDate(
          data.endTime
        ),

      clanStars:
        ourClan.stars ?? 0,

      opponentStars:
        enemyClan.stars ?? 0,

      clanDestruction:
        ourClan.destructionPercentage ?? 0,

      opponentDestruction:
        enemyClan.destructionPercentage ?? 0,

      lastSyncedAt: new Date(),
    },

    create: {
      warTag,

      seasonId:
        seasonRecord.id,

      clanId:
        seasonRecord.clanId,

      round,

      state: data.state,

      isFinalized:
        data.state === "warEnded",

      teamSize:
        data.teamSize,

      preparationStartTime:
        parseClashDate(
          data.preparationStartTime
        ),

      warStartTime:
        parseClashDate(
          data.startTime
        ),

      warEndTime:
        parseClashDate(
          data.endTime
        ),

      clanStars:
        ourClan.stars ?? 0,

      opponentStars:
        enemyClan.stars ?? 0,

      clanDestruction:
        ourClan.destructionPercentage ?? 0,

      opponentDestruction:
        enemyClan.destructionPercentage ?? 0,

      lastSyncedAt: new Date(),
    },
  });
}

/*
 * Sla spelers uit BEIDE clans uit een war op.
 *
 * Voorheen werden alleen onze eigen spelers opgeslagen.
 * Voor defensive analysis hebben we ook de spelers van
 * de tegenstander nodig.
 */
export async function savePlayers(
  data: any,
  clanTag: string
) {
  const normalizedClanTag =
    clanTag.replace("#", "");

  const clans = [
    data.clan,
    data.opponent,
  ].filter(Boolean);

  const players =
    new Map<string, any>();

  /*
   * Verzamel spelers van beide clans.
   */
  for (const clan of clans) {
    for (
      const member of
      clan.members ?? []
    ) {
      players.set(
        member.tag,
        member
      );
    }
  }

  /*
   * Sla alle spelers op.
   *
   * Hierdoor kunnen aanvallen van
   * tegenstanders ook naar Player verwijzen.
   */
  for (
    const player of
    players.values()
  ) {
    await prisma.player.upsert({
      where: {
        playerTag:
          player.tag,
      },

      update: {
        currentName:
          player.name,
      },

      create: {
        playerTag:
          player.tag,

        currentName:
          player.name,
      },
    });
  }

  return players.size;
}

/*
 * Sla aanvallen uit een war op.
 *
 * BELANGRIJK:
 *
 * We slaan nu aanvallen op van:
 *
 * - onze eigen clan
 * - de tegenstander
 *
 * Daardoor krijgen we historische defensive data
 * zoals:
 *
 * - wie viel wie aan?
 * - met welke TH?
 * - hoeveel sterren?
 * - hoeveel destruction?
 * - hoeveel seconden?
 *
 * Dit wordt later gebruikt voor Defensive Performance.
 */
export async function saveAttacks(
  warTag: string,
  data: any,
  clanTag: string
) {
  /*
   * Bij iedere sync bouwen we de attack-data
   * voor deze war opnieuw op.
   */
  await prisma.attack.deleteMany({
    where: {
      warTag,
    },
  });

  const normalizedClanTag =
    clanTag.replace("#", "");

  const ourClan =
    data.clan.tag.replace("#", "") ===
    normalizedClanTag
      ? data.clan
      : data.opponent;

  const enemyClan =
    data.clan.tag.replace("#", "") ===
    normalizedClanTag
      ? data.opponent
      : data.clan;

  /*
   * Zorg dat zowel eigen spelers als
   * tegenstanders bestaan in Player.
   *
   * Dit is nodig omdat Attack.playerTag
   * een foreign key naar Player is.
   */
  const allMembers = [
    ...(ourClan.members ?? []),
    ...(enemyClan?.members ?? []),
  ];

  const uniquePlayers =
    new Map<string, any>();

  for (const member of allMembers) {
    uniquePlayers.set(
      member.tag,
      member
    );
  }

  for (
    const player of
    uniquePlayers.values()
  ) {
    await prisma.player.upsert({
      where: {
        playerTag:
          player.tag,
      },

      update: {
        currentName:
          player.name,
      },

      create: {
        playerTag:
          player.tag,

        currentName:
          player.name,
      },
    });
  }

  let imported = 0;

  /*
   * Functie om alle aanvallen van één clan
   * te importeren.
   */
  const importClanAttacks = async (
    clan: any
  ) => {
    if (!clan) {
      return;
    }

    for (
      const member of
      clan.members ?? []
    ) {
      for (
        const attack of
        member.attacks ?? []
      ) {
        /*
         * Zoek de verdediger in de andere clan.
         *
         * Hierdoor kunnen we ook de TH van de
         * verdediger opslaan.
         */
        const defender =
          enemyClan?.members?.find(
            (player: any) =>
              player.tag ===
              attack.defenderTag
          );

        /*
         * Zoek eventueel de verdediger
         * in onze eigen clan.
         *
         * Dit is nodig wanneer we juist
         * de tegenstander importeren.
         */
        const ownDefender =
          ourClan.members?.find(
            (player: any) =>
              player.tag ===
              attack.defenderTag
          );

        const defenderPlayer =
          defender ??
          ownDefender;

        /*
         * bestOpponentAttack bevat de beste
         * aanval die deze speler heeft ontvangen.
         *
         * Deze informatie bewaren we ook.
         */
        const bestDefense =
          member.bestOpponentAttack;

        await prisma.attack.create({
          data: {
            warTag,

            playerTag:
              member.tag,

            warDay: 1,

            attackNumber:
              attack.order,

            stars:
              attack.stars ?? 0,

            destruction:
              attack.destructionPercentage ?? 0,

            duration:
              attack.duration ?? 0,

            attackerTownHall:
              member.townhallLevel ?? 0,

            defenderTownHall:
              defenderPlayer?.townhallLevel ??
              0,

            defenseStars:
              bestDefense?.stars ?? 0,

            defenseDestruction:
              bestDefense?.destructionPercentage ??
              0,

            defenseAttackerTownHall:
              bestDefense
                ? (
                    defenderPlayer
                      ?.townhallLevel ?? 0
                  )
                : 0,

            defenderTag:
              attack.defenderTag ?? "",

            defenderName:
              defenderPlayer?.name ?? "",
          },
        });

        imported++;
      }
    }
  };

  /*
   * EIGEN AANVALLEN
   */
  await importClanAttacks(
    ourClan
  );

  /*
   * TEGENSTANDER-AANVALLEN
   */
  await importClanAttacks(
    enemyClan
  );

  return imported;
}

/*
 * Sla één CWL matchup op.
 */
export async function saveCwlMatchup(
  warTag: string,
  season: string,
  round: number,
  data: any,
  tdgTags: string[]
) {
  const clanA =
    data.clan;

  const clanB =
    data.opponent;

  const clanATag =
    clanA.tag.replace("#", "");

  const clanBTag =
    clanB.tag.replace("#", "");

  const clanAStars =
    clanA.stars ?? 0;

  const clanBStars =
    clanB.stars ?? 0;

  const clanADestruction =
    clanA.destructionPercentage ?? 0;

  const clanBDestruction =
    clanB.destructionPercentage ?? 0;

  const winnerTag =
    data.state === "warEnded"
      ? determineCwlWinner(
          clanAStars,
          clanADestruction,
          clanBStars,
          clanBDestruction,
          clanATag,
          clanBTag
        )
      : null;

  let clanAResult: string | null =
    null;

  let clanBResult: string | null =
    null;

  if (data.state === "warEnded") {
    if (winnerTag === clanATag) {
      clanAResult = "win";
      clanBResult = "loss";
    } else if (
      winnerTag === clanBTag
    ) {
      clanAResult = "loss";
      clanBResult = "win";
    } else {
      clanAResult = "draw";
      clanBResult = "draw";
    }
  }

  const clanABonusStars =
    data.state === "warEnded" &&
    clanAResult === "win"
      ? 10
      : 0;

  const clanBBonusStars =
    data.state === "warEnded" &&
    clanBResult === "win"
      ? 10
      : 0;

  const tdgTagSet =
    new Set(
      tdgTags.map((tag) =>
        tag.replace("#", "")
      )
    );

  return prisma.cwlMatchup.upsert({
    where: {
      warTag,
    },

    update: {
      season,

      round,

      warSize:
        data.teamSize ?? null,

      clanATag,

      clanAName:
        clanA.name,

      clanAStars,

      clanADestruction,

      clanABonusStars,

      clanAResult,

      clanAIsTDG:
        tdgTagSet.has(
          clanATag
        ),

      clanBTag,

      clanBName:
        clanB.name,

      clanBStars,

      clanBDestruction,

      clanBBonusStars,

      clanBResult,

      clanBIsTDG:
        tdgTagSet.has(
          clanBTag
        ),

      status:
        data.state ?? null,

      endTime:
        data.endTime
          ? parseClashDate(
              data.endTime
            )
          : null,
    },

    create: {
      warTag,

      season,

      round,

      warSize:
        data.teamSize ?? null,

      clanATag,

      clanAName:
        clanA.name,

      clanAStars,

      clanADestruction,

      clanABonusStars,

      clanAResult,

      clanAIsTDG:
        tdgTagSet.has(
          clanATag
        ),

      clanBTag,

      clanBName:
        clanB.name,

      clanBStars,

      clanBDestruction,

      clanBBonusStars,

      clanBResult,

      clanBIsTDG:
        tdgTagSet.has(
          clanBTag
        ),

      status:
        data.state ?? null,

      endTime:
        data.endTime
          ? parseClashDate(
              data.endTime
            )
          : null,
    },
  });
}

/*
 * Haal CWL-matchups van één clan op.
 */
export async function getCwlMatchups(
  season: string,
  clanTag: string
) {
  const rawTag =
    clanTag.replace("#", "");

  const tagVariants = [
    rawTag,
    `#${rawTag}`,
  ];

  return prisma.cwlMatchup.findMany({
    where: {
      season,

      OR: [
        {
          clanATag: {
            in: tagVariants,
          },
        },

        {
          clanBTag: {
            in: tagVariants,
          },
        },
      ],
    },

    orderBy: [
      {
        round: "asc",
      },

      {
        warTag: "asc",
      },
    ],
  });
}

/*
 * Bouw de officiële CWL-stand.
 *
 * Alleen afgesloten wars tellen mee in de
 * definitieve stand.
 */
export async function getCwlStand(
  season: string
) {
  const matchups =
    await prisma.cwlMatchup.findMany({
      where: {
        season,
      },

      orderBy: [
        {
          round: "asc",
        },

        {
          warTag: "asc",
        },
      ],
    });

  const clans =
    new Map<
      string,
      {
        tag: string;
        name: string;
        stars: number;
        bonusStars: number;
        destruction: number;
        wars: number;
        wins: number;
        draws: number;
        losses: number;
      }
    >();

  const remainingMatchups:
    typeof matchups = [];

  for (
    const matchup of matchups
  ) {
    const ended =
      matchup.status ===
      "warEnded";

    const entries = [
      {
        tag:
          matchup.clanATag,

        name:
          matchup.clanAName,

        stars:
          matchup.clanAStars,

        bonusStars:
          matchup.clanABonusStars,

        destruction:
          matchup.clanADestruction,
      },

      {
        tag:
          matchup.clanBTag,

        name:
          matchup.clanBName,

        stars:
          matchup.clanBStars,

        bonusStars:
          matchup.clanBBonusStars,

        destruction:
          matchup.clanBDestruction,
      },
    ];

    if (!ended) {
      remainingMatchups.push(
        matchup
      );

      continue;
    }

    const winnerTag =
      determineCwlWinner(
        matchup.clanAStars,
        Number(
          matchup.clanADestruction
        ),
        matchup.clanBStars,
        Number(
          matchup.clanBDestruction
        ),
        matchup.clanATag,
        matchup.clanBTag
      );

    for (
      const entry of entries
    ) {
      const existing =
        clans.get(
          entry.tag
        );

      const result =
        winnerTag === null
          ? "draw"
          : winnerTag ===
              entry.tag
            ? "win"
            : "loss";

      const bonusStars =
        result === "win"
          ? 10
          : 0;

      if (!existing) {
        clans.set(
          entry.tag,
          {
            tag:
              entry.tag,

            name:
              entry.name,

            stars:
              entry.stars,

            bonusStars,

            destruction:
              Number(
                entry.destruction
              ),

            wars: 1,

            wins:
              result === "win"
                ? 1
                : 0,

            draws:
              result === "draw"
                ? 1
                : 0,

            losses:
              result === "loss"
                ? 1
                : 0,
          }
        );
      } else {
        existing.stars +=
          entry.stars;

        existing.bonusStars +=
          bonusStars;

        existing.destruction +=
          Number(
            entry.destruction
          );

        existing.wars += 1;

        if (
          result === "win"
        ) {
          existing.wins++;
        }

        if (
          result === "draw"
        ) {
          existing.draws++;
        }

        if (
          result === "loss"
        ) {
          existing.losses++;
        }
      }
    }
  }

  const stand =
    Array.from(
      clans.values()
    )
      .map((clan) => ({
        ...clan,

        totalStars:
          clan.stars +
          clan.bonusStars,
      }))

      .sort((a, b) => {
        if (
          b.totalStars !==
          a.totalStars
        ) {
          return (
            b.totalStars -
            a.totalStars
          );
        }

        return (
          b.destruction -
          a.destruction
        );
      })

      .map(
        (clan, index) => ({
          ...clan,

          position:
            index + 1,
        })
      );

  return {
    stand,

    remainingMatchups:
      remainingMatchups.map(
        (war) => ({
          warTag:
            war.warTag,

          round:
            war.round,

          warSize:
            war.warSize,

          clanA: {
            tag:
              war.clanATag,

            name:
              war.clanAName,

            isTDG:
              war.clanAIsTDG,
          },

          clanB: {
            tag:
              war.clanBTag,

            name:
              war.clanBName,

            isTDG:
              war.clanBIsTDG,
          },

          status:
            war.status,
        })
      ),
  };
}

/*
 * Bereken de actuele en maximaal haalbare
 * promotiepositie.
 */
export async function getCwlPromotionPosition(
  season: string,
  clanTag: string,
  leagueName: string
) {
  const rawTag =
    clanTag.replace("#", "");

  const tagVariants = [
    rawTag,
    `#${rawTag}`,
  ];

  const promotionSlots =
    await getCwlPromotionSlots(
      leagueName
    );

  const ownMatchups =
    await prisma.cwlMatchup.findMany({
      where: {
        season,

        OR: [
          {
            clanATag: {
              in: tagVariants,
            },
          },

          {
            clanBTag: {
              in: tagVariants,
            },
          },
        ],
      },

      orderBy: [
        {
          round: "asc",
        },

        {
          warTag: "asc",
        },
      ],
    });

  if (
    ownMatchups.length === 0
  ) {
    return null;
  }

  const groupTags =
    new Set<string>();

  for (
    const matchup of
    ownMatchups
  ) {
    groupTags.add(
      matchup.clanATag
    );

    groupTags.add(
      matchup.clanBTag
    );
  }

  const groupMatchups =
    await prisma.cwlMatchup.findMany({
      where: {
        season,

        OR: [
          {
            clanATag: {
              in:
                Array.from(
                  groupTags
                ),
            },
          },

          {
            clanBTag: {
              in:
                Array.from(
                  groupTags
                ),
            },
          },
        ],
      },

      orderBy: [
        {
          round: "asc",
        },

        {
          warTag: "asc",
        },
      ],
    });

  const clanMap =
    new Map<
      string,
      {
        tag: string;
        name: string;
        warSize: number;
        stars: number;
        bonusStars: number;
        destruction: number;
        completedWars: number;
        currentWars: number;
        remainingWars: number;
      }
    >();

  for (
    const matchup of
    groupMatchups
  ) {
    const entries = [
      {
        tag:
          matchup.clanATag,

        name:
          matchup.clanAName,

        stars:
          matchup.clanAStars,

        destruction:
          Number(
            matchup.clanADestruction
          ),
      },

      {
        tag:
          matchup.clanBTag,

        name:
          matchup.clanBName,

        stars:
          matchup.clanBStars,

        destruction:
          Number(
            matchup.clanBDestruction
          ),
      },
    ];

    const winnerTag =
      matchup.status ===
      "warEnded"
        ? determineCwlWinner(
            matchup.clanAStars,
            Number(
              matchup.clanADestruction
            ),
            matchup.clanBStars,
            Number(
              matchup.clanBDestruction
            ),
            matchup.clanATag,
            matchup.clanBTag
          )
        : null;

    for (
      const entry of entries
    ) {
      const existing =
        clanMap.get(
          entry.tag
        );

      const warBonus =
        matchup.status ===
          "warEnded" &&
        winnerTag === entry.tag
          ? 10
          : 0;

      if (!existing) {
        clanMap.set(
          entry.tag,
          {
            tag:
              entry.tag,

            name:
              entry.name,

            warSize:
              matchup.warSize ?? 15,

            stars:
              matchup.status ===
              "preparation"
                ? 0
                : entry.stars,

            bonusStars:
              warBonus,

            destruction:
              matchup.status ===
              "preparation"
                ? 0
                : entry.destruction,

            completedWars:
              matchup.status ===
              "warEnded"
                ? 1
                : 0,

            currentWars:
              matchup.status ===
              "inWar"
                ? 1
                : 0,

            remainingWars:
              matchup.status ===
              "preparation"
                ? 1
                : 0,
          }
        );
      } else {
        if (
          matchup.status !==
          "preparation"
        ) {
          existing.stars +=
            entry.stars;

          existing.destruction +=
            entry.destruction;
        }

        existing.bonusStars +=
          warBonus;

        if (
          matchup.status ===
          "warEnded"
        ) {
          existing.completedWars++;
        }

        if (
          matchup.status ===
          "inWar"
        ) {
          existing.currentWars++;
        }

        if (
          matchup.status ===
          "preparation"
        ) {
          existing.remainingWars++;
        }
      }
    }
  }

  const stand =
    Array.from(
      clanMap.values()
    )
      .map((clan) => ({
        ...clan,

        totalStars:
          clan.stars +
          clan.bonusStars,
      }))

      .sort((a, b) => {
        if (
          b.totalStars !==
          a.totalStars
        ) {
          return (
            b.totalStars -
            a.totalStars
          );
        }

        return (
          b.destruction -
          a.destruction
        );
      })

      .map(
        (clan, index) => ({
          ...clan,

          position:
            index + 1,
        })
      );

  const ownClan =
    stand.find(
      (clan) =>
        tagVariants.includes(
          clan.tag
        )
    );

  if (!ownClan) {
    return null;
  }

  const maxStarsPerWar =
    ownClan.warSize === 30
      ? 90
      : 45;

  const maxScorePerWar =
    maxStarsPerWar + 10;

  const totalCwlWars =
    7;

  const maximumCwlScore =
    totalCwlWars *
    maxScorePerWar;

  const currentScore =
    ownClan.totalStars;

  const remainingWars =
    ownClan.currentWars +
    ownClan.remainingWars;

  const maximumFinalScore =
    currentScore +
    remainingWars *
      maxScorePerWar;

  const currentProgress =
    maximumCwlScore > 0
      ? (
          currentScore /
          maximumCwlScore
        ) * 100
      : 0;

  const maximumProgress =
    maximumCwlScore > 0
      ? (
          maximumFinalScore /
          maximumCwlScore
        ) * 100
      : 0;

  const isCurrentlyPromoting =
    promotionSlots > 0 &&
    ownClan.position <=
      promotionSlots;

  const promotionPositionFactor =
    promotionSlots > 0 &&
    stand.length >
      promotionSlots
      ? Math.max(
          0,
          Math.min(
            1,

            (
              stand.length -
              ownClan.position
            ) /
            (
              stand.length -
              promotionSlots
            )
          )
        )
      : 1;

  const scoreFactor =
    maximumCwlScore > 0
      ? Math.min(
          1,

          currentScore /
            maximumCwlScore
        )
      : 0;

  const promotionPosition =
    (
      scoreFactor * 0.75 +
      promotionPositionFactor *
        0.25
    ) * 100;

  const maximumScoreFactor =
    maximumCwlScore > 0
      ? Math.min(
          1,

          maximumFinalScore /
            maximumCwlScore
        )
      : 0;

  const maximumPromotionPosition =
    (
      maximumScoreFactor *
        0.75 +
      1 *
        0.25
    ) * 100;

  return {
    clan: {
      tag:
        ownClan.tag,

      name:
        ownClan.name,
    },

    position:
      ownClan.position,

    promotionSlots,

    isCurrentlyPromoting,

    warSize:
      ownClan.warSize,

    currentStars:
      ownClan.stars,

    bonusStars:
      ownClan.bonusStars,

    totalStars:
      ownClan.totalStars,

    destruction:
      ownClan.destruction,

    completedWars:
      ownClan.completedWars,

    currentWars:
      ownClan.currentWars,

    remainingWars:
      ownClan.remainingWars,

    maximumScore:
      maximumCwlScore,

    currentScore,

    maximumFinalScore,

    promotionPosition:
      Number(
        Math.min(
          100,
          Math.max(
            0,
            promotionPosition
          )
        ).toFixed(1)
      ),

    maximumPromotionPosition:
      Number(
        Math.min(
          100,
          Math.max(
            0,
            maximumPromotionPosition
          )
        ).toFixed(1)
      ),

    stand,
  };
}