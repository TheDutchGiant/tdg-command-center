import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { fetchClashPlayer } from "@/app/lib/clash";

function normalizeTag(tag: string): string {
  const value = tag.trim().toUpperCase();

  return value.startsWith("#")
    ? value
    : `#${value}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const rawTag =
      typeof body.playerTag === "string"
        ? body.playerTag
        : "";

    const playerTag =
      normalizeTag(rawTag);

    if (!playerTag || playerTag === "#") {
      return NextResponse.json(
        {
          success: false,
          error: "Player ID is verplicht.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * 1. EERST PHOENIX
     * =====================================================
     *
     * Phoenix is onze eerste bron.
     *
     * Als de speler hier bekend is, weten we dat Phoenix
     * deze speler al kent.
     */

    const knownInPhoenix =
      await prisma.player.findUnique({
        where: {
          playerTag,
        },
        select: {
          playerTag: true,
          currentName: true,
        },
      });

    /*
     * =====================================================
     * 2. ACTUELE GEGEVENS
     * =====================================================
     *
     * Ook voor bekende spelers halen we daarna de actuele
     * gegevens uit Clash. Zo tonen we altijd de actuele
     * naam, TH en clan.
     *
     * Voor een onbekende speler is dit onze fallback:
     * als Clash hem kent, kan hij zich als gast aanmelden.
     */

    const clashPlayer =
      await fetchClashPlayer(playerTag);

    /*
     * Bekend in Phoenix = TDG-speler voor de
     * aanmeldworkflow.
     *
     * Onbekend in Phoenix = gast.
     */

    const applicationType =
      knownInPhoenix
        ? "TDG"
        : "GUEST";

    return NextResponse.json({
      success: true,

      knownInPhoenix:
        Boolean(knownInPhoenix),

      applicationType,

      player: {
        tag: clashPlayer.tag,
        name: clashPlayer.name,
        townHallLevel:
          clashPlayer.townHallLevel,

        clan: clashPlayer.clan
          ? {
              tag: clashPlayer.clan.tag,
              name: clashPlayer.clan.name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error(
      "CWL player lookup error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Speler niet gevonden. Controleer de Player ID.",
      },
      { status: 404 }
    );
  }
}
