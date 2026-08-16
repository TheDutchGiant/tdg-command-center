import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

const TDG_CLAN_TAGS = new Set([
  // We vullen deze straks met de echte TDG-tags.
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const clashName =
      typeof body.clashName === "string"
        ? body.clashName.trim()
        : "";

    const playerTag =
      typeof body.playerTag === "string"
        ? body.playerTag.trim().toUpperCase()
        : "";

    const availability =
      body.availability === "LIMITED"
        ? "LIMITED"
        : body.availability === "FULL"
          ? "FULL"
          : "";

    if (!clashName || !playerTag || !availability) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Clash naam, player tag en beschikbaarheid zijn verplicht.",
        },
        { status: 400 }
      );
    }

    if (!playerTag.startsWith("#")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Een player tag moet beginnen met #.",
        },
        { status: 400 }
      );
    }

    /*
     * Voor nu gebruiken we de bestaande Player-tabel.
     *
     * Zodra we de bestaande Clash API/player-sync
     * koppelen, controleren we hier de actuele spelerdata.
     */
    const player =
      await prisma.player.findUnique({
        where: {
          playerTag,
        },
      });

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deze player tag is nog niet bekend bij Phoenix. Controleer de tag.",
        },
        { status: 404 }
      );
    }

    const season =
      new Date().toISOString().slice(0, 7);

    await prisma.cwlApplication.upsert({
      where: {
        season_playerTag: {
          season,
          playerTag,
        },
      },
      update: {
        clashName,
        availability,
      },
      create: {
        season,
        playerTag,
        clashName,
        availability,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Je CWL-aanmelding is opgeslagen.",
    });
  } catch (error) {
    console.error(
      "CWL application error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Er ging iets mis bij het aanmelden.",
      },
      { status: 500 }
    );
  }
}