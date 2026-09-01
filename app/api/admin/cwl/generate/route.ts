import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCwlWorkingSeason } from "@/app/lib/getCwlWorkingSeason";
import { requireAdmin } from "@/app/lib/auth/session";
import { PHOENIX } from "@/app/lib/config";
import { fetchClash } from "@/app/lib/clash";
import { getCwlPlayerScore } from "@/app/lib/cwlPlayerData";

type Mode = "ALL" | "APPLIED";

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

  defencePerformance: number;
  defenceAttackCount: number;
  defenceStarsConceded: number;
  goodDefences: number;

  starsPerAttack: number;
  difficultyBonus: number;

  lastCwlClan: string | null;

  currentClanName: string;
  currentClanTag: string;

  cwlScore: number;

  promotionEligible: boolean;
  promotionTargetClan: string | null;

  degradationEligible: boolean;
  degradationTargetClan: string | null;

  cwlStars: number;
  cwlAttacks: number;
  cwlEquivalentStars: number;
  regularWarScore: number;

  regularWarAttacks: {
    oneStar: number;
    twoStar: number;
    threeStar: number;
    zeroStar: number;
    total: number;
  };

  manualReview: boolean;
  manualReviewReasons: string[];
  cwlClanModifier: number;

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
| NIEUWE CWL DEFENCE PERFORMANCE
|--------------------------------------------------------------------------
|
| Defence wordt rechtstreeks berekend uit opponentAttacks.
|
| 0 sterren = 100 punten
| 1 ster    = 75 punten
| 2 sterren = 40 punten
| 3 sterren = 0 punten
|
| De score is het gemiddelde van alle daadwerkelijk
| uitgevoerde aanvallen op de speler.
|--------------------------------------------------------------------------
*/

function calculateDefencePerformance(
  opponentAttacks: unknown
): number {
  if (!Array.isArray(opponentAttacks)) {
    return 0;
  }

  const attacks = opponentAttacks.filter(
    (attack): attack is Record<string, unknown> =>
      Boolean(
        attack &&
        typeof attack === "object" &&
        !Array.isArray(attack)
      )
  );

  if (attacks.length === 0) {
    return 0;
  }

  const total = attacks.reduce(
    (sum, attack) => {
      const stars = Math.max(
        0,
        Math.min(
          3,
          Number(attack.stars ?? 0)
        )
      );

      if (stars === 0) {
        return sum + 100;
      }

      if (stars === 1) {
        return sum + 75;
      }

      if (stars === 2) {
        return sum + 40;
      }

      return sum;
    },
    0
  );

  return Number(
    (total / attacks.length).toFixed(2)
  );
}

function getDefenceAttackCount(
  opponentAttacks: unknown
): number {
  if (!Array.isArray(opponentAttacks)) {
    return 0;
  }

  return opponentAttacks.filter(
    (attack) =>
      attack &&
      typeof attack === "object" &&
      !Array.isArray(attack)
  ).length;
}

function getDefenceStarsConceded(
  opponentAttacks: unknown
): number {
  if (!Array.isArray(opponentAttacks)) {
    return 0;
  }

  return opponentAttacks.reduce(
    (total, attack) => {
      if (
        !attack ||
        typeof attack !== "object" ||
        Array.isArray(attack)
      ) {
        return total;
      }

      return (
        total +
        Math.max(
          0,
          Math.min(
            3,
            Number(
              (attack as Record<string, unknown>).stars ??
                0
            )
          )
        )
      );
    },
    0
  );
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
  /*
   * ---------------------------------------------------------
   * CWL PRESTATIESCORE
   * ---------------------------------------------------------
   *
   * CWL offence = 70%
   * CWL defence = 30%
   *
   * Defence telt alleen mee wanneer er daadwerkelijk
   * historische verdedigingen beschikbaar zijn.
   *
   * Zonder defence-data blijft de score volledig gebaseerd
   * op CWL offence.
   */

  const offenceScore =
    candidate.cwlScore;

  const hasDefenceData =
    candidate.defenceAttackCount > 0;

  const score = hasDefenceData
    ? offenceScore * 0.70 +
      candidate.defencePerformance * 3
    : offenceScore;

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
  /*
   * ---------------------------------------------------------
   * REGULAR CW = WAARSCHUWINGSFACTOR
   * ---------------------------------------------------------
   *
   * Regular CW bepaalt niet langer rechtstreeks de
   * plaatsingsscore.
   *
   * De historische aanvallen worden later in het
   * spelersdetail volledig zichtbaar gemaakt.
   */

  if (
    candidate.missedAttacks >= 5
  ) {
    return "ZWARE CONTROLE: meerdere gemiste gewone-CW aanvallen.";
  }

  if (
    candidate.missedAttacks >= 3
  ) {
    return "ZWARE CONTROLE: meerdere gemiste gewone-CW aanvallen.";
  }

  if (
    candidate.attacks >= 10 &&
    candidate.starsPerAttack < 1.75
  ) {
    return "ZWARE CONTROLE: zwakke gewone-CW aanvalsprestaties.";
  }

  if (
    candidate.attacks >= 10 &&
    candidate.starsPerAttack < 2
  ) {
    return "LICHTE CONTROLE: gewone-CW aanvalsprestaties verdienen aandacht.";
  }

  if (
    candidate.attacks > 0 &&
    candidate.stars === 0
  ) {
    return "ZWARE CONTROLE: geen sterren behaald in beschikbare CWL-historie.";
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
      await getCwlWorkingSeason();

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
     * LAATSTE CWL-CLAN PER SPELER
     * -----------------------------------------------------
     *
     * BELANGRIJK:
     *
     * currentClanName/currentClanTag mogen hier NIET
     * gebruikt worden voor de CWL-indeling.
     *
     * Na CWL verhuizen spelers regelmatig tijdelijk
     * naar een andere clan.
     *
     * Daarom bepalen we de CWL-clan uitsluitend uit
     * CwlHistoricalWar.clanTag.
     *
     * De meest recente historische CWL-war waarin
     * de speler voorkwam is leidend.
     */

    const lastCwlClanByPlayer =
      new Map<
        string,
        {
          clanTag: string;
          clanName: string;
          warDate: Date;
          round: number;
        }
      >();

    for (
      const war of
      historicalWars
    ) {
      const clanTag =
        normalizeTag(
          war.clanTag
        );

      const clanConfig =
        PHOENIX.clans.find(
          (clan) =>
            normalizeTag(
              clan.tag
            ) === clanTag
        );

      if (!clanConfig) {
        continue;
      }

      /*
       * Gebruik de opgeslagen war snapshot om
       * de spelers van deze historische CWL-war
       * te bepalen.
       */
      for (
        const player of
        war.players
      ) {
        const playerTag =
          normalizeTag(
            player.playerTag
          );

        if (!playerTag) {
          continue;
        }

        const existing =
          lastCwlClanByPlayer.get(
            playerTag
          );

        /*
         * historicalWars staat niet noodzakelijk
         * chronologisch op importedAt.
         *
         * round is binnen een season relevant;
         * warTag/updatedAt kunnen daarnaast verschillen.
         *
         * Voor dezelfde speler nemen we de meest
         * recent opgeslagen CWL-war.
         */
        const warDate =
          war.updatedAt ??
          war.importedAt;

        if (
          !existing ||
          warDate >
            existing.warDate
        ) {
          lastCwlClanByPlayer.set(
            playerTag,
            {
              clanTag,
              clanName:
                clanConfig.name,
              warDate,
              round:
                war.round,
            }
          );
        }
      }
    }

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
     * HISTORISCHE CWL DEFENCE
     * -----------------------------------------------------
     *
     * Defence wordt rechtstreeks uit de historische
     * war snapshots gehaald.
     *
     * We tellen niet langer een kunstmatige
     * "Defensive Strength" score.
     *
     * Per speler bewaren we:
     * - aantal ontvangen defence-aanvallen
     * - 0 sterren
     * - 1 ster
     * - 2 sterren
     * - 3 sterren
     * - aantal goede defences
     *
     * Een goede defence = maximaal 2 sterren tegen.
     */

    type CwlDefenceStats = {
      defenceReceived: number;
      defence0Star: number;
      defence1Star: number;
      defence2Star: number;
      defence3Star: number;
      goodDefences: number;
      rounds: Array<{
        round: number;
        stars: number;
        attackerName: string;
        destruction: number;
      }>;
    };

    const defenceByPlayer =
      new Map<
        string,
        CwlDefenceStats
      >();

    for (
      const war of
      historicalWars
    ) {
      const rawData =
        war.rawData as any;

      const opponentMembers =
        rawData?.opponent?.members ?? [];

      const clanMembers =
        rawData?.clan?.members ?? [];

      /*
       * De speler die verdedigt kan uit de eigen
       * war snapshot worden gehaald.
       *
       * De aanvallen van de opponent staan bij
       * opponent.members.
       */
      for (
        const member of
        clanMembers
      ) {
        const playerTag =
          normalizeTag(
            member?.tag ?? ""
          );

        if (!playerTag) {
          continue;
        }

        if (
          !defenceByPlayer.has(
            playerTag
          )
        ) {
          defenceByPlayer.set(
            playerTag,
            {
              defenceReceived: 0,
              defence0Star: 0,
              defence1Star: 0,
              defence2Star: 0,
              defence3Star: 0,
              goodDefences: 0,
              rounds: [],
            }
          );
        }

        const stats =
          defenceByPlayer.get(
            playerTag
          )!;

        /*
         * Clash bewaart bij de opponent de
         * aanvallen die zij op onze bases deden.
         */
        const attacks =
          Array.isArray(
            member?.opponentAttacks
          )
            ? member.opponentAttacks
            : [];

        for (
          const attack of
          attacks
        ) {
          if (
            !attack ||
            typeof attack !==
              "object"
          ) {
            continue;
          }

          const stars =
            Math.max(
              0,
              Math.min(
                3,
                Number(
                  attack.stars ?? 0
                )
              )
            );

          const attackerName =
            String(
              attack.attackerName ??
              attack.attacker?.name ??
              ""
            );

          const destruction =
            Number(
              attack.destructionPercentage ??
              attack.destruction ??
              0
            );

          stats.defenceReceived++;

          if (stars === 0) {
            stats.defence0Star++;
          } else if (
            stars === 1
          ) {
            stats.defence1Star++;
          } else if (
            stars === 2
          ) {
            stats.defence2Star++;
          } else {
            stats.defence3Star++;
          }

          if (stars <= 2) {
            stats.goodDefences++;
          }

          stats.rounds.push({
            round:
              war.round,
            stars,
            attackerName,
            destruction,
          });
        }
      }

      /*
       * Fallback voor snapshots waarin de
       * opponent-aanvallen niet onder
       * clan.members zitten.
       *
       * De daadwerkelijke structuur wordt later
       * gecontroleerd tegen de opgeslagen Neon-data.
       */
      for (
        const opponent of
        opponentMembers
      ) {
        const attacks =
          Array.isArray(
            opponent?.attacks
          )
            ? opponent.attacks
            : [];

        for (
          const attack of
          attacks
        ) {
          if (
            !attack ||
            typeof attack !==
              "object"
          ) {
            continue;
          }

          const defenderTag =
            normalizeTag(
              attack.defenderTag ?? ""
            );

          if (!defenderTag) {
            continue;
          }

          if (
            !defenceByPlayer.has(
              defenderTag
            )
          ) {
            defenceByPlayer.set(
              defenderTag,
              {
                defenceReceived: 0,
                defence0Star: 0,
                defence1Star: 0,
                defence2Star: 0,
                defence3Star: 0,
                goodDefences: 0,
                rounds: [],
              }
            );
          }

          const stats =
            defenceByPlayer.get(
              defenderTag
            )!;

          const stars =
            Math.max(
              0,
              Math.min(
                3,
                Number(
                  attack.stars ?? 0
                )
              )
            );

          /*
           * Voorkom dubbele telling wanneer
           * dezelfde aanval al via member.opponentAttacks
           * is verwerkt.
           */
          const alreadyRecorded =
            stats.rounds.some(
              (entry) =>
                entry.round ===
                  war.round &&
                entry.stars ===
                  stars &&
                entry.attackerName ===
                  String(
                    opponent?.name ??
                    ""
                  )
            );

          if (
            alreadyRecorded
          ) {
            continue;
          }

          const attackerName =
            String(
              opponent?.name ??
              attack.attackerName ??
              ""
            );

          const destruction =
            Number(
              attack.destructionPercentage ??
              attack.destruction ??
              0
            );

          stats.defenceReceived++;

          if (stars === 0) {
            stats.defence0Star++;
          } else if (
            stars === 1
          ) {
            stats.defence1Star++;
          } else if (
            stars === 2
          ) {
            stats.defence2Star++;
          } else {
            stats.defence3Star++;
          }

          if (stars <= 2) {
            stats.goodDefences++;
          }

          stats.rounds.push({
            round:
              war.round,
            stars,
            attackerName,
            destruction,
          });
        }
      }
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
     * HISTORISCHE CWL-HISTORIE
     * -----------------------------------------------------
     *
     * BELANGRIJK:
     *
     * Deze data komt UITSLUITEND uit:
     *
     *   CwlHistoricalPlayer
     *   + CwlHistoricalWar
     *
     * Dus NIET uit de gewone CW attack-tabel.
     *
     * De laatste CWL waarin een speler speelde bepaalt:
     * - zijn historische CWL-clan
     * - zijn CWL-prestaties
     *
     * De huidige clan van de speler wordt hier volledig
     * genegeerd voor promotie/degradatie.
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
      const war of
      historicalWars
    ) {
      const clanConfig =
        PHOENIX.clans.find(
          (clan) =>
            normalizeTag(
              clan.tag
            ) ===
            normalizeTag(
              war.clanTag
            )
        );

      if (!clanConfig) {
        continue;
      }

      const warDate =
        war.updatedAt ??
        war.importedAt;

      for (
        const player of
        war.players
      ) {
        const playerTag =
          normalizeTag(
            player.playerTag
          );

        if (!playerTag) {
          continue;
        }

        const rawAttacks =
          Array.isArray(
            player.attacks
          )
            ? player.attacks
            : [];

        const playerStars =
          rawAttacks.reduce<number>(
            (total: number, attack) => {
              if (
                !attack ||
                typeof attack !==
                  "object" ||
                Array.isArray(
                  attack
                )
              ) {
                return total;
              }

              return (
                total +
                Math.max(
                  0,
                  Math.min(
                    3,
                    Number(
                      attack.stars ??
                      0
                    )
                  )
                )
              );
            },
            0
          );

        const playerAttacks =
          rawAttacks.filter(
            (attack) =>
              attack &&
              typeof attack ===
                "object" &&
              !Array.isArray(
                attack
              )
          ).length;

        const existing =
          history.get(
            playerTag
          );

        /*
         * We bewaren alle CWL-aanvallen voor
         * prestaties, maar de clan-identiteit
         * komt uit de meest recente CWL-war.
         */
        const nextHistory = {
          stars:
            Number(
              existing?.stars ??
              0
            ) +
            Number(
              playerStars
            ),

          attacks:
            (existing?.attacks ??
              0) +
            playerAttacks,

          defenceStars:
            existing?.defenceStars ??
            0,

          lastCwlClan:
            !existing ||
            warDate >
              (existing.lastCwlDate ??
                new Date(0))
              ? clanConfig.name
              : existing.lastCwlClan,

          lastCwlDate:
            !existing ||
            warDate >
              (existing.lastCwlDate ??
                new Date(0))
              ? warDate
              : existing.lastCwlDate,
        };

        history.set(
          playerTag,
          nextHistory
        );
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
     *
     * ALL:
     *   alle actuele TDG-leden.
     *
     * APPLIED:
     *   uitsluitend geaccepteerde CWL-aanmeldingen:
     *
     *   AUTO_APPROVED
     *   APPROVED
     *
     *   Dit mogen ook spelers zijn die momenteel
     *   buiten de TDG-clans zitten.
     *
     *   PENDING en REJECTED worden uitgesloten.
     * -----------------------------------------------------
     */

    let selectedMembers =
      currentMembers;

    if (
      mode === "APPLIED"
    ) {
      const approvedApplications =
        applications.filter(
          (application) =>
            application.status ===
              "AUTO_APPROVED" ||
            application.status ===
              "APPROVED"
        );

      selectedMembers =
        await Promise.all(
          approvedApplications.map(
            async (application) => {
              const playerTag =
                normalizeTag(
                  application.playerTag
                );

              const currentMember =
                currentMembers.find(
                  (member) =>
                    normalizeTag(
                      member.tag
                    ) === playerTag
                );

              if (
                currentMember
              ) {
                return currentMember;
              }

              /*
               * Goedgekeurde externe speler.
               * Niet in een TDG-clan, maar wel
               * geaccepteerd voor CWL.
               */
              try {
                const data =
                  await fetchClash(
                    `/players/%23${playerTag}`
                  );

                return {
                  tag:
                    data.tag ||
                    application.playerTag,

                  name:
                    data.name ||
                    application.clashName,

                  townHallLevel:
                    Number(
                      data.townHallLevel ||
                      0
                    ),

                  currentClanName:
                    "Buiten TDG",

                  currentClanTag:
                    "",
                };
              } catch {
                return {
                  tag:
                    application.playerTag,

                  name:
                    application.clashName,

                  townHallLevel:
                    0,

                  currentClanName:
                    "Buiten TDG",

                  currentClanTag:
                    "",
                };
              }
            }
          )
        );
    }

    /*
     * -----------------------------------------------------
     * KANDIDATEN
     * -----------------------------------------------------
     */

    const candidates: Candidate[] =
      await Promise.all(
        selectedMembers.map(
          async (member) => {
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

          const lastCwlClanData =
            lastCwlClanByPlayer.get(
              playerTag
            );

          const lastCwlClanName =
            lastCwlClanData?.clanName ??
            null;

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

          const historicalPlayer =
            historicalWars
              .flatMap((war) => war.players)
              .find(
                (player) =>
                  normalizeTag(
                    player.playerTag
                  ) === playerTag
              );

          const opponentAttacks =
            historicalPlayer?.opponentAttacks ??
            [];

          const defencePerformance =
            calculateDefencePerformance(
              opponentAttacks
            );

          const defenceAttackCount =
            getDefenceAttackCount(
              opponentAttacks
            );

          const defenceStarsConceded =
            getDefenceStarsConceded(
              opponentAttacks
            );

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

          let defensiveStrength = 0;

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

          const cwlData =
            await getCwlPlayerScore(
              playerTag
            );

          const cwlClanName =
            previous?.lastCwlClan ||
            null;

          let cwlClanModifier = 0;

          if (
            cwlClanName
              ?.toLowerCase() ===
            "the dutch giant"
          ) {
            cwlClanModifier = 0.10;
          } else if (
            cwlClanName
              ?.toLowerCase() ===
            "tdg ii"
          ) {
            cwlClanModifier = 0.05;
          } else if (
            cwlClanName
              ?.toLowerCase() ===
            "tdg mini"
          ) {
            cwlClanModifier = 0.03;
          } else if (
            cwlClanName
              ?.toLowerCase() ===
            "tdg micro"
          ) {
            cwlClanModifier = 0.01;
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
            defencePerformance,
            defenceAttackCount,
            defenceStarsConceded,

            goodDefences:
              0,

            starsPerAttack,
            difficultyBonus:
              bonus,
            lastCwlClan:
              previous?.lastCwlClan ||
              null,

            currentClanName:
              member.currentClanName,

            currentClanTag:
              member.currentClanTag,

            cwlScore:
              cwlData.cwlScore,

            promotionEligible:
              cwlData.cwlScore >= 2100 &&
              defenceAttackCount > 0 &&
              defenceStarsConceded <= 2,

            promotionTargetClan:
              lastCwlClanName
                ?.toLowerCase() === "tdg ii"
                ? "The Dutch Giant"
                : lastCwlClanName
                    ?.toLowerCase() === "tdg mini"
                  ? "TDG II"
                  : lastCwlClanName
                      ?.toLowerCase() === "tdg micro"
                    ? "TDG Mini"
                    : null,

            degradationEligible:
              attacksCount >= 6 &&
              (
                stars /
                attacksCount *
                7
              ) <
                (
                  lastCwlClanName
                    ?.toLowerCase() === "the dutch giant"
                    ? 18
                    : lastCwlClanName
                        ?.toLowerCase() === "tdg ii"
                      ? 17
                      : lastCwlClanName
                          ?.toLowerCase() === "tdg mini"
                        ? 17
                        : 0
                ),

            degradationTargetClan:
              lastCwlClanName
                ?.toLowerCase() === "the dutch giant"
                ? "TDG II"
                : lastCwlClanName
                    ?.toLowerCase() === "tdg ii"
                  ? "TDG Mini"
                  : lastCwlClanName
                      ?.toLowerCase() === "tdg mini"
                    ? "TDG Micro"
                    : null,

            cwlStars:
              stars,

            cwlAttacks:
              attacksCount,

            cwlEquivalentStars:
              attacksCount > 0
                ? Number(
                    (
                      stars /
                      attacksCount *
                      7
                    ).toFixed(2)
                  )
                : 0,

            regularWarScore:
              cwlData.regularWarScore,

            regularWarAttacks: (() => {
              const attacks =
                cwlData.regularWar.attackScores;

              return {
                oneStar: attacks.filter(
                  (attack) => attack.stars === 1
                ).length,

                twoStar: attacks.filter(
                  (attack) => attack.stars === 2
                ).length,

                threeStar: attacks.filter(
                  (attack) => attack.stars >= 3
                ).length,

                zeroStar: attacks.filter(
                  (attack) => attack.stars === 0
                ).length,

                total: attacks.length,
              };
            })(),

            manualReview:
              cwlData.manualReview,

            manualReviewReasons:
              cwlData.manualReviewReasons,

            cwlClanModifier,
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
      )
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

    /*
     * -----------------------------------------------------
     * CWL FORMATREGELS
     * -----------------------------------------------------
     *
     * V15 heeft minimaal 17 beschikbare spelers nodig.
     * V30 heeft minimaal 34 beschikbare spelers nodig.
     *
     * Mini + Micro kunnen allebei V30 spelen.
     * Daarvoor zijn dus minimaal 68 spelers nodig:
     *
     *   Mini  = 34
     *   Micro = 34
     *
     * Met minder dan 68 spelers mag de generator
     * NOOIT een V30-opstelling voorstellen.
     */

    const V15_MIN_PLAYERS = 17;
    const V30_MIN_PLAYERS = 34;

    const canRunBothV30 =
      total >=
      V30_MIN_PLAYERS * 2;

    const miniFormat =
      canRunBothV30
        ? "V30"
        : "V15";

    const microFormat =
      canRunBothV30
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
        minReserves: 0,
        maxReserves: 0,
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
        minReserves: 0,
        maxReserves: 0,
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
        minReserves: 0,
        maxReserves: 0,
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
        minReserves: 0,
        maxReserves: 0,
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

    /*
     * -----------------------------------------------------
     * CWL INDELING
     * -----------------------------------------------------
     *
     * APPLIED gebruikt een volledig schone verdeling.
     *
     * ALL blijft de bestaande historische CWL-engine
     * gebruiken.
     *
     * APPLIED:
     *
     *   1. Main krijgt eerst 17 spelers.
     *
     *   2. TDG II krijgt daarna uitsluitend TH18.
     *
     *   3. TDG II wordt alleen gevuld wanneer er minimaal
     *      17 geschikte TH18-spelers beschikbaar zijn.
     *
     *   4. Mini wordt alleen geopend wanneer er daarna
     *      minimaal 17 spelers over zijn.
     *
     *   5. Micro wordt alleen geopend wanneer er daarna
     *      minimaal 17 spelers over zijn.
     *
     *   6. Alles wat nergens terechtkomt wordt automatisch
     *      zichtbaar onder NIET GEPLAATST.
     *
     * Er wordt dus bij APPLIED geen historische CWL-clan,
     * promotie of degradatie gebruikt om vooraf spelers
     * te claimen.
     */

    /*
     * -----------------------------------------------------
     * CWL INDELING
     * -----------------------------------------------------
     *
     * DE HISTORISCHE CWL-CLAN IS LEIDEND.
     *
     * currentClanName/currentClanTag worden hier
     * bewust NIET gebruikt.
     *
     * Na CWL kunnen spelers terug naar Main verhuizen.
     * Voor de volgende CWL-indeling blijven zij
     * gekoppeld aan de clan waarin zij hun laatste
     * CWL hebben gespeeld.
     *
     * V15:
     *   1-15  = starters
     *   16-17 = reserves
     *
     * V30:
     *   1-30  = starters
     *   31-34 = reserves
     *
     * Promotie:
     *   >= 21 CWL-equivalent
     *   <= 2 defence stars conceded
     *   alleen direct één clan omhoog
     *   maximaal reserve in hogere clan
     *
     * Degradatie:
     *   Main < 18 CWL-equivalent
     *   II/Mini < 17 CWL-equivalent
     *   alleen direct één clan omlaag
     *
     * Onvoldoende spelers:
     *   hogere clans krijgen eerst hun minimum.
     *
     * Voorbeeld 55 spelers:
     *   Main  = 17
     *   II    = 17
     *   Mini  = 21
     *   Micro = 0
     */

    const clanOrder = [
      "The Dutch Giant",
      "TDG II",
      "TDG Mini",
      "TDG Micro",
    ];

    const clanIndexByName =
      new Map(
        clanOrder.map(
          (name, index) => [
            name.toLowerCase(),
            index,
          ]
        )
      );

    const starterLimit = (
      clan: typeof assignments[number]
    ) =>
      clan.format === "V30"
        ? 30
        : 15;

    const reserveLimit = (
      clan: typeof assignments[number]
    ) =>
      clan.format === "V30"
        ? 4
        : 2;

    const maximumPlayers = (
      clan: typeof assignments[number]
    ) =>
      starterLimit(clan) +
      reserveLimit(clan);

    /*
     * Kandidaten groeperen op hun LAATSTE CWL-clan.
     *
     * Een speler zonder historische CWL-clan kan
     * niet automatisch promoveren/degraderen en
     * wordt later als vrije kandidaat behandeld.
     */

    const playersByCwlClan =
      new Map<
        string,
        Candidate[]
      >();

    for (
      const player of candidates
    ) {
      const key =
        player.lastCwlClan
          ?.toLowerCase() ||
        "";

      if (
        !playersByCwlClan.has(key)
      ) {
        playersByCwlClan.set(
          key,
          []
        );
      }

      playersByCwlClan
        .get(key)!
        .push(player);
    }

    /*
     * Sterktevolgorde binnen een historische clan.
     */

    for (
      const players of
      playersByCwlClan.values()
    ) {
      players.sort(
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
    }

    const assigned =
      new Set<string>();

    /*
     * Eerst degradatie verwerken.
     *
     * Een degradatiekandidaat verlaat zijn
     * historische clan en gaat één niveau omlaag.
     */

    for (
      let sourceIndex = 0;
      sourceIndex <
        clanOrder.length - 1;
      sourceIndex++
    ) {
      const sourceName =
        clanOrder[sourceIndex];

      const target =
        assignments[
          sourceIndex + 1
        ];

      const sourcePlayers =
        playersByCwlClan.get(
          sourceName.toLowerCase()
        ) || [];

      const degradations =
        sourcePlayers
          .filter(
            (player) =>
              player.degradationEligible &&
              player.degradationTargetClan
                ?.toLowerCase() ===
                target.name.toLowerCase()
          )
          .sort(
            (a, b) =>
              a.score - b.score
          );

      for (
        const player of
        degradations
      ) {
        if (
          target.players.length >=
          maximumPlayers(target)
        ) {
          break;
        }

        target.players.push(
          player
        );

        assigned.add(
          player.playerTag
        );
      }
    }

    /*
     * Daarna de normale spelers in hun
     * historische CWL-clan.
     *
     * Promotie- en degradatiekandidaten worden
     * hierbij overgeslagen.
     */

    for (
      let clanIndex = 0;
      clanIndex <
        clanOrder.length;
      clanIndex++
    ) {
      const clan =
        assignments[clanIndex];

      const players =
        playersByCwlClan.get(
          clan.name.toLowerCase()
        ) || [];

      for (
        const player of
        players
      ) {
        if (
          assigned.has(
            player.playerTag
          )
        ) {
          continue;
        }

        if (
          player.promotionEligible ||
          player.degradationEligible
        ) {
          continue;
        }

        if (
          clan.players.length >=
          maximumPlayers(clan)
        ) {
          break;
        }

        clan.players.push(
          player
        );

        assigned.add(
          player.playerTag
        );
      }
    }

    /*
     * Promotie.
     *
     * Alleen één niveau omhoog.
     *
     * Promotiekandidaten worden uitsluitend
     * als reserve toegevoegd.
     */

    for (
      let sourceIndex = 1;
      sourceIndex <
        clanOrder.length;
      sourceIndex++
    ) {
      const sourceName =
        clanOrder[sourceIndex];

      const target =
        assignments[
          sourceIndex - 1
        ];

      const sourcePlayers =
        playersByCwlClan.get(
          sourceName.toLowerCase()
        ) || [];

      const promotionCandidates =
        sourcePlayers
          .filter(
            (player) =>
              player.promotionEligible &&
              player.promotionTargetClan
                ?.toLowerCase() ===
                target.name.toLowerCase()
          )
          .filter(
            (player) =>
              !assigned.has(
                player.playerTag
              )
          )
          .sort(
            (a, b) =>
              b.score - a.score
          );

      const targetStarterLimit =
        starterLimit(target);

      const targetReserveLimit =
        reserveLimit(target);

      /*
       * Eerst zorgen dat promoties nooit
       * starters verdringen.
       *
       * Daarom mogen alleen plaatsen
       * na de startergrens worden gebruikt.
       */

      let reserveCount =
        Math.max(
          0,
          target.players.length -
            targetStarterLimit
        );

      for (
        const player of
        promotionCandidates
      ) {
        if (
          reserveCount >=
          targetReserveLimit
        ) {
          break;
        }

        target.players.push(
          player
        );

        assigned.add(
          player.playerTag
        );

        reserveCount++;
      }
    }

    /*
     * -----------------------------------------------------
     * MINIMUMBEZETTING + CLAN GATES
     * -----------------------------------------------------
     *
     * AUTOMATISCHE REGELS:
     *
     * 1. Main eerst minimaal 17.
     *
     * 2. Daarna TDG II.
     *
     * 3. TDG II automatisch uitsluitend TH18.
     *
     * 4. TDG II moet minimaal 17 geschikte TH18's hebben.
     *
     * 5. Pas daarna mag Mini automatisch worden gevuld.
     *
     * 6. Mini wordt alleen geopend wanneer er minimaal
     *    17 spelers voor Mini beschikbaar zijn.
     *
     * 7. Micro wordt alleen geopend wanneer er minimaal
     *    17 spelers voor Micro beschikbaar zijn.
     *
     * 8. Als een gate niet gehaald kan worden, blijven
     *    de lagere clans automatisch leeg.
     *
     * 9. Niet geplaatste spelers blijven beschikbaar
     *    voor een ADMIN MANUAL OVERRIDE.
     * -----------------------------------------------------
     */

    const minimumForV15 = 17;

    const isAutomaticEligible = (
      player: Candidate,
      clan: typeof assignments[number]
    ) => {
      if (
        clan.name.toLowerCase() ===
        "tdg ii"
      ) {
        return (
          player.townHall >= 18
        );
      }

      return true;
    };

    const removeFromClan = (
      clan: typeof assignments[number],
      playerTag: string
    ) => {
      const index =
        clan.players.findIndex(
          (player) =>
            player.playerTag ===
            playerTag
        );

      if (index === -1) {
        return null;
      }

      const [player] =
        clan.players.splice(
          index,
          1
        );

      assigned.delete(
        player.playerTag
      );

      return player;
    };

    const clearClan = (
      clan: typeof assignments[number]
    ) => {
      for (
        const player of
        clan.players
      ) {
        assigned.delete(
          player.playerTag
        );
      }

      clan.players = [];
    };

    const clearLowerClans = (
      firstIndex: number
    ) => {
      for (
        let index = firstIndex;
        index <
        assignments.length;
        index++
      ) {
        clearClan(
          assignments[index]
        );
      }
    };

    const lowerClanPlayers = (
      targetIndex: number
    ) =>
      assignments
        .slice(
          targetIndex + 1
        )
        .flatMap(
          (clan) =>
            clan.players
        );

    const unassignedPlayers = () =>
      candidates.filter(
        (player) =>
          !assigned.has(
            player.playerTag
          )
      );

    const availableForClan = (
      targetIndex: number
    ) => {
      const target =
        assignments[
          targetIndex
        ];

      return [
        ...lowerClanPlayers(
          targetIndex
        ),
        ...unassignedPlayers(),
      ]
        .filter(
          (player) =>
            isAutomaticEligible(
              player,
              target
            )
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        );
    };

    /*
     * -----------------------------------------------------
     * GATE 1 — MAIN
     * -----------------------------------------------------
     */

    const main =
      assignments[0];

    while (
      main.players.length <
        minimumForV15
    ) {
      const next =
        availableForClan(0)[0];

      if (!next) {
        break;
      }

      for (
        const clan of
        assignments.slice(1)
      ) {
        removeFromClan(
          clan,
          next.playerTag
        );
      }

      main.players.push(
        next
      );

      assigned.add(
        next.playerTag
      );
    }

    if (
      main.players.length <
      minimumForV15
    ) {
      clearLowerClans(1);
    } else {
      /*
       * ---------------------------------------------------
       * GATE 2 — TDG II
       * ---------------------------------------------------
       *
       * Eerst alle niet-TH18 spelers uit TDG II
       * verwijderen. Deze worden NIET automatisch
       * teruggeplaatst in TDG II.
       */

      const tdgII =
        assignments[1];

      const invalidTdgII =
        tdgII.players.filter(
          (player) =>
            !isAutomaticEligible(
              player,
              tdgII
            )
        );

      for (
        const player of
        invalidTdgII
      ) {
        removeFromClan(
          tdgII,
          player.playerTag
        );
      }

      while (
        tdgII.players.length <
          minimumForV15
      ) {
        const next =
          availableForClan(1)[0];

        if (!next) {
          break;
        }

        for (
          const clan of
          assignments.slice(2)
        ) {
          removeFromClan(
            clan,
            next.playerTag
          );
        }

        tdgII.players.push(
          next
        );

        assigned.add(
          next.playerTag
        );
      }

      if (
        tdgII.players.length <
        minimumForV15
      ) {
        /*
         * TDG II kan geen 17 geschikte TH18's halen.
         *
         * Mini + Micro blijven automatisch leeg.
         */
        clearLowerClans(2);
      } else {
        /*
         * -------------------------------------------------
         * GATE 3 — MINI
         * -------------------------------------------------
         *
         * We kijken eerst hoeveel spelers er
         * daadwerkelijk over zijn na Main + II.
         *
         * Minder dan 17?
         * Dan blijft Mini leeg.
         */

        const mini =
          assignments[2];

        const micro =
          assignments[3];

        const remainingCount =
          lowerClanPlayers(2).length +
          unassignedPlayers().length;

        if (
          remainingCount <
          minimumForV15
        ) {
          clearClan(mini);
          clearClan(micro);
        } else {
          /*
           * Mini mag nu automatisch gevuld worden.
           */
          const miniCandidates =
            availableForClan(2);

          for (
            const player of
            miniCandidates
          ) {
            if (
              mini.players.length >=
              maximumPlayers(mini)
            ) {
              break;
            }

            if (
              assigned.has(
                player.playerTag
              )
            ) {
              continue;
            }

            for (
              const clan of
              assignments.slice(3)
            ) {
              removeFromClan(
                clan,
                player.playerTag
              );
            }

            mini.players.push(
              player
            );

            assigned.add(
              player.playerTag
            );
          }

          /*
           * -------------------------------------------------
           * GATE 4 — MICRO
           * -------------------------------------------------
           */

          const microRemaining =
            unassignedPlayers().length;

          if (
            microRemaining <
            minimumForV15
          ) {
            clearClan(micro);
          } else {
            const microCandidates =
              availableForClan(3);

            for (
              const player of
              microCandidates
            ) {
              if (
                micro.players.length >=
                maximumPlayers(micro)
              ) {
                break;
              }

              if (
                assigned.has(
                  player.playerTag
                )
              ) {
                continue;
              }

              micro.players.push(
                player
              );

              assigned.add(
                player.playerTag
              );
            }
          }
        }
      }
    }



    /*
     * -----------------------------------------------------
     * POSITIE + ROL
     * -----------------------------------------------------
     */

    for (
      const clan of
      assignments
    ) {
      clan.players.forEach(
        (player, playerIndex) => {
          const position =
            playerIndex + 1;

          Object.assign(
            player,
            {
              position,
              role:
                position <=
                starterLimit(clan)
                  ? "STARTER"
                  : "RESERVE",
            }
          );
        }
      );
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