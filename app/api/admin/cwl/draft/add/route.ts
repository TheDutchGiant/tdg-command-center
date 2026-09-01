import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCwlWorkingSeason } from "@/app/lib/getCwlWorkingSeason";
import { requireAdmin } from "@/app/lib/auth/session";

function normalizeTag(
  tag: string
) {
  return tag
    .replace(/^#/, "")
    .toUpperCase();
}

export async function POST(
  request: Request
) {
  try {
    await requireAdmin();

    const body =
      await request.json();

    const season =
      await getCwlWorkingSeason();

    const playerTag =
      normalizeTag(
        String(
          body.playerTag ||
            ""
        )
      );

    const targetClanTag =
      normalizeTag(
        String(
          body.targetClanTag ||
            ""
        )
      );

    if (
      !playerTag ||
      !targetClanTag
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Speler of doelclan ontbreekt.",
        },
        {
          status: 400,
        }
      );
    }

    const plan =
      await prisma.cwlPlan.findUnique(
        {
          where: {
            season,
          },
          include: {
            clanPlans: {
              include: {
                assignments: true,
              },
            },
          },
        }
      );

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geen CWL-concept gevonden.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      plan.status !==
      "DRAFT"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De CWL-indeling is al definitief.",
        },
        {
          status: 409,
        }
      );
    }

    const targetClan =
      plan.clanPlans.find(
        (clan) =>
          normalizeTag(
            clan.clanTag
          ) ===
          targetClanTag
      );

    if (!targetClan) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Doelclan bestaat niet.",
        },
        {
          status: 404,
        }
      );
    }

    const existing =
      plan.clanPlans
        .flatMap(
          (clan) =>
            clan.assignments
        )
        .find(
          (assignment) =>
            normalizeTag(
              assignment.playerTag
            ) ===
            playerTag
        );

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deze speler staat al in de indeling.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * HANDMATIGE CWL-PLAATSEN
     * ---------------------------------------------------------
     *
     * Een admin mag bewust een volledige V30-indeling
     * handmatig opbouwen.
     *
     * De automatische generator blijft zijn eigen
     * voorwaarden gebruiken. Deze route is juist bedoeld
     * voor handmatige overrules.
     *
     * Maximaal 34 spelers per clan.
     */

    const MANUAL_MAX_PLAYERS = 34;

    if (
      targetClan.assignments.length >=
      MANUAL_MAX_PLAYERS
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deze clan heeft al 34 spelers. Er kunnen geen extra spelers meer worden toegevoegd.",
        },
        {
          status: 409,
        }
      );
    }

    const position =
      targetClan.assignments.reduce(
        (
          highest,
          assignment
        ) =>
          Math.max(
            highest,
            assignment.position
          ),
        0
      ) + 1;

    const role =
      position <=
      targetClan.starters
        ? "STARTER"
        : "RESERVE";

    const assignment =
      await prisma.cwlAssignment.create(
        {
          data: {
            clanPlanId:
              targetClan.id,

            playerTag,

            playerName:
              String(
                body.name ||
                  playerTag
              ),

            role,

            source:
              "MANUAL",

            position,

            score:
              Number(
                body.score || 0
              ),

            townHall:
              body.townHall == null
                ? null
                : Number(
                    body.townHall
                  ),

            stars:
              Number(
                body.stars || 0
              ),

            attacks:
              Number(
                body.attacks || 0
              ),

            missedAttacks:
              Number(
                body.missedAttacks ||
                  0
              ),

            difficultyBonus:
              Number(
                body.difficultyBonus ||
                  0
              ),

            defenceStars:
              Number(
                body.defenceStars ||
                  0
              ),

            availability:
              body.availability ===
              "FULL"
                ? "FULL"
                : body.availability ===
                    "LIMITED"
                  ? "LIMITED"
                  : null,

            notes:
              "Handmatige admin override",
          },
        }
      );

    return NextResponse.json({
      success: true,
      assignment: {
        id:
          assignment.id,
        playerTag:
          assignment.playerTag,
        playerName:
          assignment.playerName,
        position:
          assignment.position,
        role:
          assignment.role,
        source:
          assignment.source,
      },
    });
  } catch (error) {
    console.error(
      "CWL manual add error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Handmatige toevoeging mislukt.",
      },
      {
        status: 500,
      }
    );
  }
}
