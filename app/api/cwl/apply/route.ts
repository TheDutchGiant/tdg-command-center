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

    const availability =
      body.availability === "LIMITED"
        ? "LIMITED"
        : body.availability === "FULL"
          ? "FULL"
          : "";

    if (
      !playerTag ||
      playerTag === "#" ||
      !availability
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Player ID en beschikbaarheid zijn verplicht.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * 1. EERST PHOENIX
     * =====================================================
     *
     * Phoenix is de eerste bron.
     *
     * Een speler die al in Phoenix staat is een bekende
     * TDG-speler en wordt automatisch goedgekeurd.
     */

    const knownInPhoenix =
      await prisma.player.findUnique({
        where: {
          playerTag,
        },
        select: {
          playerTag: true,
        },
      });

    /*
     * =====================================================
     * 2. ACTUELE CLASH DATA
     * =====================================================
     *
     * Voor de bevestiging en opgeslagen naam gebruiken
     * we altijd de actuele Clash API-data.
     *
     * Voor een onbekende Phoenix-speler is dit tevens de
     * controle of de Player ID daadwerkelijk bestaat.
     */

    const clashPlayer =
      await fetchClashPlayer(playerTag);

    const clashName =
      clashPlayer.name;

    const now = new Date();

    const season =
      `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;

    /*
     * =====================================================
     * 3. STATUS
     * =====================================================
     */

    const status =
      knownInPhoenix
        ? "AUTO_APPROVED"
        : "PENDING";

    /*
     * =====================================================
     * 4. BESTAANDE AANMELDING
     * =====================================================
     *
     * Een bestaande gast die al handmatig is goedgekeurd
     * blijft APPROVED wanneer hij zijn beschikbaarheid
     * opnieuw doorgeeft.
     *
     * Hetzelfde geldt voor REJECTED: we overschrijven een
     * admin-beslissing niet automatisch.
     */

    const existing =
      await prisma.cwlApplication.findUnique({
        where: {
          season_playerTag: {
            season,
            playerTag,
          },
        },
        select: {
          status: true,
        },
      });

    let finalStatus = status;

    if (
      !knownInPhoenix &&
      existing &&
      (
        existing.status === "APPROVED" ||
        existing.status === "REJECTED"
      )
    ) {
      finalStatus =
        existing.status;
    }

    /*
     * =====================================================
     * 5. OPSLAAN
     * =====================================================
     */

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
        status: finalStatus as "AUTO_APPROVED" | "PENDING" | "APPROVED" | "REJECTED",
      },

      create: {
        season,
        playerTag,
        clashName,
        availability,
        status: finalStatus as "AUTO_APPROVED" | "PENDING" | "APPROVED" | "REJECTED",
      },
    });

    return NextResponse.json({
      success: true,
      status: finalStatus as "AUTO_APPROVED" | "PENDING" | "APPROVED" | "REJECTED",
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
      message:
        finalStatus === "PENDING"
          ? "Je CWL-aanmelding is opgeslagen en wacht op goedkeuring van een admin."
          : "Je CWL-aanmelding is opgeslagen.",
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
          "Speler kon niet worden gecontroleerd. Controleer de Player ID.",
      },
      { status: 404 }
    );
  }
}
