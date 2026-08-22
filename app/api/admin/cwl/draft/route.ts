import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth/session";

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();

    if (!body?.season || !Array.isArray(body?.clans)) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldig CWL-voorstel.",
        },
        { status: 400 }
      );
    }

    const season = String(body.season);

    const draft = await prisma.$transaction(async (tx) => {
      const existingPlan = await tx.cwlPlan.findUnique({
        where: { season },
      });

      if (existingPlan?.status === "FINAL") {
        throw new Error(
          "Deze CWL-indeling is definitief en kan niet opnieuw als concept worden opgeslagen."
        );
      }

      const plan = await tx.cwlPlan.upsert({
        where: { season },
        update: {
          status: "DRAFT",
          finalizedAt: null,
          finalizedById: null,
          version: {
            increment: 1,
          },
        },
        create: {
          season,
          status: "DRAFT",
          version: 1,
        },
      });

      await tx.cwlAssignment.deleteMany({
        where: {
          clanPlan: {
            planId: plan.id,
          },
        },
      });

      await tx.cwlClanPlan.deleteMany({
        where: {
          planId: plan.id,
        },
      });

      const clanTags: Record<string, string> = {
        "The Dutch Giant": "#2JLLPVGUU",
        "TDG II": "#2CVVG00QQ",
        "TDG Mini": "#2CQ2LGQJ2",
        "TDG Micro": "#2CP8GPVG8",
      };

      for (const clan of body.clans) {
        const clanTag =
          String(clan.tag || "").trim() ||
          clanTags[String(clan.name || "").trim()] ||
          "";

        if (!clanTag) {
          throw new Error(
            `Geen clan tag gevonden voor ${clan.name || "onbekende clan"}.`
          );
        }

        const clanPlan = await tx.cwlClanPlan.create({
          data: {
            planId: plan.id,
            clanTag,
            format: clan.format === "V30" ? "V30" : "V15",
            starters: Number(clan.starters) || 0,
            minReserves: Number(clan.minReserves) || 0,
            maxReserves: Number(clan.maxReserves) || 0,
          },
        });

        for (
          const [index, player] of clan.players.entries()
        ) {
          await tx.cwlAssignment.create({
            data: {
              clanPlanId: clanPlan.id,
              playerTag: String(player.playerTag),
              playerName:
                typeof player.name === "string" &&
                player.name.trim()
                  ? player.name.trim()
                  : String(player.playerTag),
              role:
                player.role === "RESERVE"
                  ? "RESERVE"
                  : "STARTER",
              source: "ENGINE",
              position: index + 1,
              score: Number(player.score) || 0,
              townHall:
                player.townHall == null
                  ? null
                  : Number(player.townHall),
              stars: Number(player.stars) || 0,
              attacks: Number(player.attacks) || 0,
              missedAttacks:
                Number(player.missedAttacks) || 0,
              difficultyBonus:
                Number(player.difficultyBonus) || 0,
              defenceStars:
                Number(player.defenceStars) || 0,
              availability:
                player.availability === "LIMITED"
                  ? "LIMITED"
                  : player.availability === "FULL"
                    ? "FULL"
                    : null,
            },
          });
        }
      }

      return plan;
    });

    return NextResponse.json({
      success: true,
      planId: draft.id,
      season: draft.season,
      status: draft.status,
      version: draft.version,
    });
  } catch (error) {
    console.error(
      "CWL draft save error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "CWL-voorstel kon niet worden opgeslagen.",
      },
      { status: 500 }
    );
  }
}
