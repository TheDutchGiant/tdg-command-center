import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth/session";
import { PHOENIX } from "@/app/lib/config";
import { fetchClash } from "@/app/lib/clash";

type Mode = "ALL" | "APPLIED";

type PlayerDay = {
  round: number;
  mapPosition: number;
};

type DefensivePlayer = {
  tag: string;
  days: PlayerDay[];
};

type Candidate = {
  playerTag: string;
  name: string;
  townHall: number;
  availability: "FULL" | "LIMITED" | null;
  applied: boolean;

  stars: number;
  attacks: number;
  missedAttacks: number;
  defenceStars: number;

  defensiveStrength: number;
  defensiveStrengthOverride: boolean;

  starsPerAttack: number;
  difficultyBonus: number;

  lastCwlClan: string | null;

  score: number;
  warning: string | null;
};

type ClanInfo = {
  name: string;
  tag: string;
  members: Array<{
    tag: string;
    name: string;
    townHallLevel: number;
  }>;
};

function normalizeTag(
  tag: string
): string {
  return tag
    .replace(/^#/, "")
    .toUpperCase();
}

function difficultyBonus(
  clanName: string | null
) {
  if (!clanName) {
    return 0;
  }

  const name =
    clanName.toLowerCase();

  if (
    name === "the dutch giant"
  ) {
    return 10;
  }

  if (name === "tdg ii") {
    return 5;
  }

  if (name === "tdg mini") {
    return 3;
  }

  if (name === "tdg micro") {
    return 1;
  }

  return 0;
}

/*
|--------------------------------------------------------------------------
| HISTORISCHE DEFENSIVE STRENGTH
|--------------------------------------------------------------------------
|
| Basis:
| - mappositie bepaalt de rangorde
| - stabiele posities geven meer onderscheid
| - positiewisselingen drukken scores naar elkaar toe
|
| Dit is een relatieve sterktescore binnen de
| historische CWL van de betreffende clan.
|--------------------------------------------------------------------------
*/

function calculateDefensiveStrength(
  players: DefensivePlayer[]
): Map<string, number> {
  const result =
    new Map<string, number>();

  if (
    players.length === 0
  ) {
    return result;
  }

  const data =
    players
      .map((player) => {
        const positions =
          player.days
            .map(
              (day) =>
                day.mapPosition
            )
            .filter(
              (position) =>
                position > 0
            );

        if (
          positions.length === 0
        ) {
          return null;
        }

        const averagePosition =
          positions.reduce(
            (
              sum,
              position
            ) =>
              sum + position,
            0
          ) /
          positions.length;

        let changes = 0;

        for (
          let i = 1;
          i < positions.length;
          i++
        ) {
          if (
            positions[i] !==
            positions[i - 1]
          ) {
            changes++;
          }
        }

        const stability =
          positions.length > 1
            ? 1 -
              changes /
                (positions.length - 1)
            : 1;

        return {
          player,
          averagePosition,
          stability,
        };
      })
      .filter(
        (
          value
        ): value is {
          player: DefensivePlayer;
          averagePosition: number;
          stability: number;
        } =>
          value !== null
      );

  data.sort((a, b) => {
    if (
      a.averagePosition !==
      b.averagePosition
    ) {
      return (
        a.averagePosition -
        b.averagePosition
      );
    }

    return (
      b.stability -
      a.stability
    );
  });

  if (
    data.length === 0
  ) {
    return result;
  }

  let previousScore = 100;

  let previousAverage =
    data[0].averagePosition;

  let previousStability =
    data[0].stability;

  result.set(
    data[0].player.tag,
    100
  );

  for (
    let i = 1;
    i < data.length;
    i++
  ) {
    const current =
      data[i];

    const positionGap =
      Math.max(
        0,
        current.averagePosition -
          previousAverage
      );

    const averageStability =
      (current.stability +
        previousStability) /
      2;

    const baseGap =
      Math.max(
        1,
        positionGap * 4
      );

    const stabilityFactor =
      0.45 +
      averageStability * 0.55;

    const scoreGap =
      baseGap *
      stabilityFactor;

    const score =
      Math.max(
        0,
        Math.min(
          100,
          previousScore -
            scoreGap
        )
      );

    result.set(
      current.player.tag,
      Math.round(score)
    );

    previousScore =
      score;

    previousAverage =
      current.averagePosition;

    previousStability =
      current.stability;
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| SCORE
|--------------------------------------------------------------------------
*/

function calculateScore(
  candidate: Omit<
    Candidate,
    "score" | "warning"
  >
) {
  let score = 0;

  /*
   * TH blijft de belangrijkste basis.
   */
  score +=
    candidate.townHall * 20;

  /*
   * Offensieve prestaties.
   */
  score +=
    candidate.stars * 4;

  score +=
    candidate.starsPerAttack * 12;

  /*
   * Ervaring op hoger niveau.
   */
  score +=
    candidate.difficultyBonus * 5;

  /*
   * Historische Defensive Strength.
   *
   * Dit vervangt de oude losse
   * defenceStars-bijdrage.
   */
  score +=
    candidate.defensiveStrength * 2;

  /*
   * Gemiste aanvallen zijn een duidelijke min.
   */
  score -=
    candidate.missedAttacks * 15;

  if (
    candidate.availability ===
    "FULL"
  ) {
    score += 5;
  }

  if (
    candidate.availability ===
    "LIMITED"
  ) {
    score += 1;
  }

  return Number(
    score.toFixed(2)
  );
}

function getWarning(
  candidate: Omit<
    Candidate,
    "score" | "warning"
  >
) {
  if (
    candidate.attacks >= 3 &&
    candidate.starsPerAttack < 2
  ) {
    return "Let op: mindere aanvaller — zie CWL-geschiedenis.";
  }

  if (
    candidate.missedAttacks >= 2
  ) {
    return "Let op: meerdere gemiste aanvallen — zie CWL-geschiedenis.";
  }

  if (
    candidate.attacks > 0 &&
    candidate.stars === 0
  ) {
    return "Let op: geen sterren behaald in beschikbare geschiedenis.";
  }

  return null;
}

async function getCurrentClans(): Promise<
  ClanInfo[]
> {
  return Promise.all(
    PHOENIX.clans.map(
      async (clan) => {
        const data =
          await fetchClash(
            `/clans/%23${clan.tag}`
          );

        return {
          name: data.name,
          tag: data.tag,
          members: (
            data.memberList || []
          ).map(
            (member: any) => ({
              tag: member.tag,
              name: member.name,
              townHallLevel:
                member.townHallLevel,
            })
          ),
        };
      }
    )
  );
}

export async function POST(
  request: Request
) {
  try {
    await requireAdmin();

    const body =
      await request.json();

    const mode: Mode =
      body.mode === "APPLIED"
        ? "APPLIED"
        : "ALL";

    const season =
      new Date()
        .toISOString()
        .slice(0, 7);

    /*
     * -----------------------------------------------------
     * ACTUELE CLANS
     * -----------------------------------------------------
     */

    const clans =
      await getCurrentClans();

    const currentMembers =
      clans.flatMap(
        (clan) =>
          clan.members.map(
            (member) => ({
              ...member,
              currentClanName:
                clan.name,
              currentClanTag:
                clan.tag,
            })
          )
      );

    /*
     * -----------------------------------------------------
     * HISTORISCHE DATA
     * -----------------------------------------------------
     */

    const [
      applications,
      attacks,
      missedAttacks,
      historicalWars,
    ] =
      await Promise.all([
        prisma.cwlApplication.findMany(
          {
            where: {
              season,
            },
          }
        ),

        prisma.attack.findMany({
          include: {
            war: {
              include: {
                clan: true,
              },
            },
          },
          orderBy: {
            war: {
              warStartTime:
                "desc",
            },
          },
        }),

        prisma.missedAttack.findMany({
          orderBy: {
            warEndTime:
              "desc",
          },
        }),

        prisma.cwlHistoricalWar.findMany(
          {
            include: {
              players: true,
            },
            orderBy: [
              {
                round: "asc",
              },
              {
                warTag: "asc",
              },
            ],
          }
        ),
      ]);

    /*
     * -----------------------------------------------------
     * OVERRIDES
     * -----------------------------------------------------
     *
     * Zodra een speler TH19 bereikt,
     * wordt de override automatisch verwijderd.
     */

    const currentMemberByTag =
      new Map(
        currentMembers.map(
          (member) => [
            normalizeTag(
              member.tag
            ),
            member,
          ]
        )
      );

    const overrides =
      await prisma.cwlDefensiveStrengthOverride.findMany();

    for (
      const override of
      overrides
    ) {
      const player =
        currentMemberByTag.get(
          normalizeTag(
            override.playerTag
          )
        );

      if (
        player &&
        player.townHallLevel >=
          19
      ) {
        await prisma.cwlDefensiveStrengthOverride.delete(
          {
            where: {
              id: override.id,
            },
          }
        );
      }
    }

    const activeOverrides =
      await prisma.cwlDefensiveStrengthOverride.findMany();

    const overrideMap =
      new Map(
        activeOverrides.map(
          (override) => [
            `${normalizeTag(
              override.clanTag
            )}:${normalizeTag(
              override.playerTag
            )}`,
            override,
          ]
        )
      );

    /*
     * -----------------------------------------------------
     * HISTORISCHE DEFENSIVE STRENGTH
     * -----------------------------------------------------
     */

    const defensivePlayersByClan =
      new Map<
        string,
        Map<string, DefensivePlayer>
      >();

    for (
      const war of
      historicalWars
    ) {
      const clanTag =
        normalizeTag(
          war.clanTag
        );

      if (
        !defensivePlayersByClan.has(
          clanTag
        )
      ) {
        defensivePlayersByClan.set(
          clanTag,
          new Map()
        );
      }

      const clanPlayers =
        defensivePlayersByClan.get(
          clanTag
        )!;

      for (
        const player of
        war.players
      ) {
        const playerTag =
          normalizeTag(
            player.playerTag
          );

        if (
          !clanPlayers.has(
            playerTag
          )
        ) {
          clanPlayers.set(
            playerTag,
            {
              tag: playerTag,
              days: [],
            }
          );
        }

        clanPlayers
          .get(playerTag)!
          .days.push({
            round:
              war.round,
            mapPosition:
              player.mapPosition,
          });
      }
    }

    const defensiveStrengthByClan =
      new Map<
        string,
        Map<string, number>
      >();

    for (
      const [
        clanTag,
        players,
      ] of defensivePlayersByClan
    ) {
      defensiveStrengthByClan.set(
        clanTag,
        calculateDefensiveStrength(
          [...players.values()]
        )
      );
    }

    /*
     * -----------------------------------------------------
     * APPLICATIONS
     * -----------------------------------------------------
     */

    const applicationMap =
      new Map(
        applications.map(
          (application) => [
            normalizeTag(
              application.playerTag
            ),
            application,
          ]
        )
      );

    const currentMemberTags =
      new Set(
        currentMembers.map(
          (member) =>
            normalizeTag(
              member.tag
            )
        )
      );

    /*
     * -----------------------------------------------------
     * OFFENSIEVE / DEFENSIEVE HISTORIE
     * -----------------------------------------------------
     */

    const history =
      new Map<
        string,
        {
          stars: number;
          attacks: number;
          defenceStars: number;
          lastCwlClan:
            | string
            | null;
          lastCwlDate:
            | Date
            | null;
        }
      >();

    for (
      const attack of
      attacks
    ) {
      const playerTag =
        normalizeTag(
          attack.playerTag
        );

      if (
        !history.has(
          playerTag
        )
      ) {
        history.set(
          playerTag,
          {
            stars: 0,
            attacks: 0,
            defenceStars: 0,
            lastCwlClan:
              null,
            lastCwlDate:
              null,
          }
        );
      }

      const stats =
        history.get(
          playerTag
        )!;

      stats.stars +=
        attack.stars;

      stats.attacks += 1;

      stats.defenceStars +=
        attack.defenseStars;

      const warDate =
        attack.war
          .warStartTime;

      if (
        !stats.lastCwlDate ||
        warDate >
          stats.lastCwlDate
      ) {
        stats.lastCwlDate =
          warDate;

        stats.lastCwlClan =
          attack.war.clan.name;
      }
    }

    const missedMap =
      new Map<string, number>();

    for (
      const missed of
      missedAttacks
    ) {
      const playerTag =
        normalizeTag(
          missed.playerTag
        );

      missedMap.set(
        playerTag,
        (missedMap.get(
          playerTag
        ) || 0) +
          missed.missedAttacks
      );
    }

    /*
     * -----------------------------------------------------
     * SELECTIEPOOL
     * -----------------------------------------------------
     */

    let selectedMembers =
      currentMembers;

    if (
      mode === "APPLIED"
    ) {
      selectedMembers =
        currentMembers.filter(
          (member) =>
            applicationMap.has(
              normalizeTag(
                member.tag
              )
            )
        );
    }

    /*
     * -----------------------------------------------------
     * KANDIDATEN
     * -----------------------------------------------------
     */

    const candidates: Candidate[] =
      selectedMembers.map(
        (member) => {
          const playerTag =
            normalizeTag(
              member.tag
            );

          const application =
            applicationMap.get(
              playerTag
            );

          const previous =
            history.get(
              playerTag
            );

          const stars =
            previous?.stars ||
            0;

          const attacksCount =
            previous?.attacks ||
            0;

          const missed =
            missedMap.get(
              playerTag
            ) || 0;

          const defenceStars =
            previous?.defenceStars ||
            0;

          const bonus =
            difficultyBonus(
              previous?.lastCwlClan ||
                null
            );

          const starsPerAttack =
            attacksCount > 0
              ? Number(
                  (
                    stars /
                    attacksCount
                  ).toFixed(2)
                )
              : 0;

          /*
           * -------------------------------------------------
           * DEFENSIVE STRENGTH
           * -------------------------------------------------
           *
           * Eerst de historische DS van de huidige clan.
           *
           * Als de speler daar nog geen historische data
           * heeft, gebruiken we de laatste historische
           * TDG-clan van de speler.
           */

          let defensiveStrength =
            0;

          const historicalClan =
            previous?.lastCwlClan ??
            null;

          const currentClanScores =
            defensiveStrengthByClan.get(
              normalizeTag(
                member.currentClanTag
              )
            );

          defensiveStrength =
            currentClanScores?.get(
              playerTag
            ) || 0;

          if (
            defensiveStrength ===
              0 &&
            historicalClan
          ) {
            const historicalClanConfig =
              PHOENIX.clans.find(
                (clan) =>
                  clan.name.toLowerCase() ===
                  historicalClan.toLowerCase()
              );

            if (
              historicalClanConfig
            ) {
              const clanScores =
                defensiveStrengthByClan.get(
                  normalizeTag(
                    historicalClanConfig.tag
                  )
                );

              defensiveStrength =
                clanScores?.get(
                  playerTag
                ) || 0;
            }
          }

          /*
           * -------------------------------------------------
           * HANDMATIGE OVERRIDE
           * -------------------------------------------------
           */

          const currentClanTag =
            normalizeTag(
              member.currentClanTag
            );

          const currentOverride =
            overrideMap.get(
              `${currentClanTag}:${playerTag}`
            );

          const defensiveStrengthOverride =
            currentOverride?.type ===
            "MAX";

          if (
            defensiveStrengthOverride
          ) {
            defensiveStrength = 100;
          }

          const base = {
            playerTag,
            name:
              application?.clashName ||
              member.name,
            townHall:
              member.townHallLevel,
            availability:
              application?.availability ||
              null,
            applied:
              Boolean(application),
            stars,
            attacks:
              attacksCount,
            missedAttacks:
              missed,
            defenceStars,
            defensiveStrength,
            defensiveStrengthOverride,
            starsPerAttack,
            difficultyBonus:
              bonus,
            lastCwlClan:
              previous?.lastCwlClan ||
              null,
          };

          const score =
            calculateScore(base);

          const warning =
            getWarning(base);

          return {
            ...base,
            score,
            warning,
          };
        }
      );

    /*
     * -----------------------------------------------------
     * SORTERING
     * -----------------------------------------------------
     *
     * Eerst TH.
     * Daarna score.
     * Daarna FULL beschikbaarheid.
     */

    candidates.sort(
      (a, b) => {
        if (
          b.townHall !==
          a.townHall
        ) {
          return (
            b.townHall -
            a.townHall
          );
        }

        if (
          b.score !==
          a.score
        ) {
          return (
            b.score -
            a.score
          );
        }

        if (
          a.availability ===
            "FULL" &&
          b.availability !==
            "FULL"
        ) {
          return -1;
        }

        if (
          b.availability ===
            "FULL" &&
          a.availability !==
            "FULL"
        ) {
          return 1;
        }

        return a.name.localeCompare(
          b.name
        );
      }
    );

    /*
     * -----------------------------------------------------
     * CLANFORMATEN
     * -----------------------------------------------------
     */

    const total =
      candidates.length;

    const miniFormat =
      total >= 66
        ? "V30"
        : "V15";

    const microFormat =
      total >= 66
        ? "V30"
        : "V15";

    const clanDefinitions = [
      {
        name:
          "The Dutch Giant",
        tag:
          clans.find(
            (clan) =>
              clan.name.toLowerCase() ===
              "the dutch giant"
          )?.tag || "",
        format: "V15",
        starters: 15,
        minReserves: 2,
        maxReserves: 2,
      },

      {
        name:
          "TDG II",
        tag:
          clans.find(
            (clan) =>
              clan.name.toLowerCase() ===
              "tdg ii"
          )?.tag || "",
        format: "V15",
        starters: 15,
        minReserves: 1,
        maxReserves: 2,
      },

      {
        name:
          "TDG Mini",
        tag:
          clans.find(
            (clan) =>
              clan.name.toLowerCase() ===
              "tdg mini"
          )?.tag || "",
        format: miniFormat,
        starters:
          miniFormat === "V30"
            ? 30
            : 15,
        minReserves:
          miniFormat === "V30"
            ? 3
            : 1,
        maxReserves:
          miniFormat === "V30"
            ? 4
            : 2,
      },

      {
        name:
          "TDG Micro",
        tag:
          clans.find(
            (clan) =>
              clan.name.toLowerCase() ===
              "tdg micro"
          )?.tag || "",
        format: microFormat,
        starters:
          microFormat === "V30"
            ? 30
            : 15,
        minReserves:
          microFormat === "V30"
            ? 3
            : 1,
        maxReserves:
          microFormat === "V30"
            ? 4
            : 2,
      },
    ];

    /*
     * -----------------------------------------------------
     * VERDELING
     * -----------------------------------------------------
     */

    const assignments =
      clanDefinitions.map(
        (clan) => ({
          ...clan,
          players:
            [] as Candidate[],
          overflow: false,
        })
      );

    const priorityOrder = [
      0,
      1,
      2,
      3,
    ];

    let index = 0;

    for (
      const clanIndex of
      priorityOrder
    ) {
      const clan =
        assignments[
          clanIndex
        ];

      const normalCapacity =
        clan.starters +
        clan.maxReserves;

      while (
        index <
          candidates.length &&
        clan.players.length <
          normalCapacity
      ) {
        clan.players.push(
          candidates[index]
        );

        index++;
      }
    }

    /*
     * -----------------------------------------------------
     * APPLIED OVERFLOW
     * -----------------------------------------------------
     */

    if (
      mode === "APPLIED" &&
      index <
        candidates.length
    ) {
      let clanIndex = 0;

      while (
        index <
        candidates.length
      ) {
        const clan =
          assignments[
            clanIndex %
              assignments.length
          ];

        clan.players.push(
          candidates[index]
        );

        clan.overflow =
          true;

        index++;
        clanIndex++;
      }
    }

    /*
     * -----------------------------------------------------
     * NIET GEPLAATST
     * -----------------------------------------------------
     */

    const assignedTags =
      new Set(
        assignments.flatMap(
          (clan) =>
            clan.players.map(
              (player) =>
                player.playerTag
            )
        )
      );

    const unassigned =
      candidates.filter(
        (candidate) =>
          !assignedTags.has(
            candidate.playerTag
          )
      );

    /*
     * -----------------------------------------------------
     * RESPONSE
     * -----------------------------------------------------
     */

    return NextResponse.json({
      success: true,
      season,
      mode,
      totalCandidates:
        candidates.length,
      currentTdgMembers:
        currentMemberTags.size,

      clans:
        assignments.map(
          (clan) => ({
            name: clan.name,
            tag: clan.tag,
            format:
              clan.format,
            starters:
              clan.starters,
            minReserves:
              clan.minReserves,
            maxReserves:
              clan.maxReserves,
            overflow:
              clan.overflow,

            players:
              clan.players.map(
                (
                  player,
                  position
                ) => ({
                  ...player,
                  position:
                    position + 1,
                  role:
                    position <
                    clan.starters
                      ? "STARTER"
                      : "RESERVE",
                })
              ),
          })
        ),

      unassigned,
    });
  } catch (error) {
    console.error(
      "CWL proposal generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Voorstel genereren is mislukt.",
      },
      {
        status: 500,
      }
    );
  }
}