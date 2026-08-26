import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth/session";

const CLAN_ORDER = [
  {
    tag: "#2JLLPVGUU",
    name: "The Dutch Giant",
  },
  {
    tag: "#2CVVG00QQ",
    name: "TDG II",
  },
  {
    tag: "#2CQ2LGQJ2",
    name: "TDG Mini",
  },
  {
    tag: "#2CP8GPVG8",
    name: "TDG Micro",
  },
];

function normalizeTag(tag: string) {
  return tag
    .replace(/^#/, "")
    .toUpperCase();
}

export async function GET() {
  try {
    await requireAdmin();

    const season = new Date()
      .toISOString()
      .slice(0, 7);

    const plan =
      await prisma.cwlPlan.findUnique({
        where: {
          season,
        },
        include: {
          clanPlans: {
            include: {
              assignments: {
                orderBy: {
                  position: "asc",
                },
                include: {
                  player: true,
                },
              },
            },
          },
        },
      });

    if (!plan) {
      return NextResponse.json({
        success: true,
        plan: null,
      });
    }

    /*
     * ---------------------------------------------------------
     * REGULAR CW HISTORIE
     * ---------------------------------------------------------
     *
     * Belangrijk:
     * de historie wordt gekoppeld aan de clan waarin
     * de oorlog gespeeld werd.
     *
     * Daardoor blijft bijvoorbeeld:
     *
     * TDG II → Jan → 4 gemist
     *
     * bestaan wanneer Jan later naar TDG Mini gaat.
     */

    const [
      missedAttackRecords,
      regularWarAttacks,
      approvedApplications,
    ] = await Promise.all([
      prisma.missedAttack.findMany({
        orderBy: {
          warEndTime: "asc",
        },
      }),

      prisma.regularWarAttack.findMany({
        include: {
          war: {
            select: {
              warTag: true,
              clanTag: true,
              clanName: true,
              warEndTime: true,
            },
          },
        },
        orderBy: {
          war: {
            warEndTime: "asc",
          },
        },
      }),

      prisma.cwlApplication.findMany({
        where: {
          season: plan.season,
          status: {
            in: [
              "APPROVED",
              "AUTO_APPROVED",
            ],
          },
        },
        orderBy: {
          submittedAt: "asc",
        },
      }),
    ]);

    const missedByPlayerClan =
      new Map<string, number>();

    for (const record of missedAttackRecords) {
      const key =
        `${normalizeTag(record.playerTag)}|${normalizeTag(record.clanTag)}`;

      missedByPlayerClan.set(
        key,
        (missedByPlayerClan.get(key) || 0) +
          record.missedAttacks
      );
    }

    const attacksByPlayerClan =
      new Map<
        string,
        Array<{
          warTag: string;
          attackNumber: number;
          attackerTownHall: number;
          defenderName: string;
          defenderTownHall: number;
          stars: number;
          destruction: number;
          score: number;
          warEndTime: Date;
        }>
      >();

    for (const attack of regularWarAttacks) {
      const clanTag =
        normalizeTag(
          attack.war.clanTag
        );

      const key =
        `${normalizeTag(attack.playerTag)}|${clanTag}`;

      const existing =
        attacksByPlayerClan.get(key) || [];

      existing.push({
        warTag:
          attack.war.warTag,

        attackNumber:
          attack.attackNumber,

        attackerTownHall:
          attack.attackerTownHall,

        defenderName:
          attack.defenderName,

        defenderTownHall:
          attack.defenderTownHall,

        stars:
          attack.stars,

        destruction:
          attack.destruction,

        score:
          attack.stars * 100 +
          attack.destruction,

        warEndTime:
          attack.war.warEndTime,
      });

      attacksByPlayerClan.set(
        key,
        existing
      );
    }

    const clanOrder = new Map(
      CLAN_ORDER.map(
        (clan, index) => [
          clan.tag,
          {
            ...clan,
            index,
          },
        ]
      )
    );

    const clans =
      [...plan.clanPlans]
        .sort((a, b) => {
          const aMeta =
            clanOrder.get(
              a.clanTag
            );

          const bMeta =
            clanOrder.get(
              b.clanTag
            );

          return (
            (aMeta?.index ?? 999) -
            (bMeta?.index ?? 999)
          );
        })
        .map((clan) => {
          const meta =
            clanOrder.get(
              clan.clanTag
            );

          const clanTag =
            normalizeTag(
              clan.clanTag
            );

          return {
            id: clan.id,

            clanTag:
              clan.clanTag,

            clanName:
              meta?.name ||
              clan.clanTag,

            format:
              clan.format,

            players:
              clan.assignments.map(
                (assignment) => {
                  const playerTag =
                    normalizeTag(
                      assignment.playerTag
                    );

                  const historyKey =
                    `${playerTag}|${clanTag}`;

                  const regularAttacks =
                    attacksByPlayerClan.get(
                      historyKey
                    ) || [];

                  const missedAttacks =
                    missedByPlayerClan.get(
                      historyKey
                    ) || 0;

                  return {
                    id:
                      assignment.id,

                    playerTag:
                      assignment.playerTag,

                    name:
                      assignment.playerName ||
                      assignment.player
                        ?.currentName ||
                      assignment.playerTag,

                    position:
                      assignment.position,

                    role:
                      assignment.role,

                    source:
                      assignment.source,

                    score:
                      assignment.score,

                    townHall:
                      assignment.townHall,

                    availability:
                      assignment.availability,

                    /*
                     * CWL-HISTORIE
                     *
                     * Deze waarden worden door de generator
                     * opgeslagen in CwlAssignment en moeten
                     * hier expliciet naar de frontend.
                     */
                    cwlStars:
                      assignment.stars,

                    cwlAttacks:
                      assignment.attacks,

                    cwlStarsPerAttack:
                      assignment.attacks > 0
                        ? Number(
                            (
                              assignment.stars /
                              assignment.attacks
                            ).toFixed(2)
                          )
                        : 0,

                    difficultyBonus:
                      assignment.difficultyBonus,

                    defenceStars:
                      assignment.defenceStars,

                    missedAttacks,


                    regularWarAttacks:
                      regularAttacks.map(
                        (attack) => ({
                          warTag:
                            attack.warTag,

                          attackNumber:
                            attack.attackNumber,

                          attackerTownHall:
                            attack.attackerTownHall,

                          defenderName:
                            attack.defenderName,

                          defenderTownHall:
                            attack.defenderTownHall,

                          stars:
                            attack.stars,

                          destruction:
                            attack.destruction,

                          score:
                            attack.score,

                          warEndTime:
                            attack.warEndTime,
                        })
                      ),
                  };
                }
              ),
          };
        });

    /*
     * ---------------------------------------------------------
     * NIET INGEDEELD
     * ---------------------------------------------------------
     *
     * Alle goedgekeurde aanmeldingen minus spelers die
     * daadwerkelijk in de huidige draft staan.
     */

    const assignedTags =
      new Set(
        clans.flatMap(
          (clan) =>
            clan.players.map(
              (player) =>
                normalizeTag(
                  player.playerTag
                )
            )
        )
      );

    const unassigned =
      approvedApplications
        .filter(
          (application) =>
            !assignedTags.has(
              normalizeTag(
                application.playerTag
              )
            )
        )
        .map(
          (application, index) => ({
            id:
              -(index + 1),

            playerTag:
              application.playerTag,

            name:
              application.clashName ||
              application.playerTag,

            position: 0,

            score: 0,

            missedAttacks: 0,

            regularWarAttacks: [],

            townHall: null,
          })
        );

    return NextResponse.json({
      success: true,

      plan: {
        id:
          plan.id,

        season:
          plan.season,

        status:
          plan.status,

        version:
          plan.version,

        updatedAt:
          plan.updatedAt,

        clans,

        unassigned,
      },
    });
  } catch (error) {
    console.error(
      "CWL current draft error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "CWL-concept kon niet worden opgehaald.",
      },
      { status: 500 }
    );
  }
}
