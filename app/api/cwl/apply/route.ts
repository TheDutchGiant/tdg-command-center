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

    /*
     * CWL-aanmeldingen zijn ALTIJD voor de komende CWL.
     *
     * Voorbeeld:
     * 23 september 2026 -> CWL 2026-10
     * 5 oktober 2026    -> CWL 2026-11
     *
     * getCwlWorkingSeason() is hiervoor de centrale bron.
     */
    const { getCwlWorkingSeason } =
      await import("@/app/lib/getCwlWorkingSeason");

    const season =
      await getCwlWorkingSeason();

    /*
     * Nieuwe CWL-aanmeldingen zijn beschikbaar vanaf de 20e.
     *
     * Daarnaast sluiten we nieuwe aanmeldingen direct zodra
     * de selectie voor deze CWL definitief (FINAL) is.
     */
    const now = new Date();

    if (now.getDate() < 20) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De CWL-aanmeldingen zijn momenteel gesloten. Aanmelden voor de volgende CWL kan vanaf de 20e.",
        },
        { status: 409 }
      );
    }

    const plan =
      await prisma.cwlPlan.findUnique({
        where: { season },
        select: { status: true },
      });

    if (plan?.status === "FINAL") {
      return NextResponse.json(
        {
          success: false,
          error:
            "De indeling voor deze CWL is definitief. Nieuwe aanmeldingen zijn gesloten.",
        },
        { status: 409 }
      );
    }

    /*
     * =====================================================
     * 3. PLAYER RECORD VEILIGSTELLEN
     * =====================================================
     *
     * De CWL Application heeft een foreign key naar Player.
     *
     * Een geldige externe Clash-speler hoeft niet vooraf in
     * Phoenix te bestaan. Zodra de Clash API de speler heeft
     * gevalideerd, zorgen we er daarom voor dat het exacte
     * Player-record bestaat voordat de CWL-aanmelding wordt
     * opgeslagen.
     *
     * knownInPhoenix is hierboven al bepaald en blijft
     * leidend voor AUTO_APPROVED versus PENDING.
     */
    await prisma.player.upsert({
      where: {
        playerTag,
      },
      create: {
        playerTag,
        currentName: clashName,
      },
      update: {
        currentName: clashName,
      },
    });

    /*
     * =====================================================
     * 4. STATUS
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

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De speler is geldig, maar de CWL-aanmelding kon niet worden opgeslagen. Probeer het opnieuw.",
        },
        { status: 500 }
      );
    }

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
