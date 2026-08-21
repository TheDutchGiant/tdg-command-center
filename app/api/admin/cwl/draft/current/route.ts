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
            clanOrder.get(a.clanTag);

          const bMeta =
            clanOrder.get(b.clanTag);

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
                (assignment) => ({
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
                })
              ),
          };
        });

    return NextResponse.json({
      success: true,

      plan: {
        id: plan.id,
        season: plan.season,
        status: plan.status,
        version: plan.version,
        updatedAt:
          plan.updatedAt,

        clans,
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
