import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
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

    const clanTag =
      normalizeTag(
        String(
          body.clanTag || ""
        )
      );

    const playerTag =
      normalizeTag(
        String(
          body.playerTag || ""
        )
      );

    const action =
      body.action ===
      "REMOVE"
        ? "REMOVE"
        : "MAX";

    if (
      !clanTag ||
      !playerTag
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ClanTag en playerTag zijn verplicht.",
        },
        { status: 400 }
      );
    }

    const player =
      await prisma.player.findUnique(
        {
          where: {
            playerTag,
          },
        }
      );

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Speler niet gevonden.",
        },
        { status: 404 }
      );
    }

    if (action === "REMOVE") {
      await prisma.cwlDefensiveStrengthOverride.deleteMany(
        {
          where: {
            clanTag,
            playerTag,
          },
        }
      );

      return NextResponse.json({
        success: true,
        override: false,
      });
    }

    await prisma.cwlDefensiveStrengthOverride.upsert(
      {
        where: {
          clanTag_playerTag: {
            clanTag,
            playerTag,
          },
        },
        create: {
          clanTag,
          playerTag,
          type: "MAX",
          reason:
            "Handmatige Defensive Strength MAX override",
        },
        update: {
          type: "MAX",
          reason:
            "Handmatige Defensive Strength MAX override",
        },
      }
    );

    return NextResponse.json({
      success: true,
      override: true,
    });
  } catch (error) {
    console.error(
      "Defensive Strength override error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Override kon niet worden aangepast.",
      },
      { status: 500 }
    );
  }
}