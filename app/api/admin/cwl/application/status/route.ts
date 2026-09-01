import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCwlWorkingSeason } from "@/app/lib/getCwlWorkingSeason";
import { requireAdmin } from "@/app/lib/auth/session";

export async function POST(request: Request) {
  try {
    const current = await requireAdmin();

    const body = await request.json();

    const playerTag =
      typeof body.playerTag === "string"
        ? body.playerTag.trim().toUpperCase()
        : "";

    const status =
      body.status === "APPROVED"
        ? "APPROVED"
        : body.status === "REJECTED"
          ? "REJECTED"
          : "";

    if (!playerTag || !status) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Player ID en geldige status zijn verplicht.",
        },
        { status: 400 }
      );
    }

    const season =
      await getCwlWorkingSeason();

    const application =
      await prisma.cwlApplication.findUnique({
        where: {
          season_playerTag: {
            season,
            playerTag,
          },
        },
      });

    if (!application) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CWL-aanmelding niet gevonden.",
        },
        { status: 404 }
      );
    }

    if (
      application.status !== "PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deze aanmelding staat niet meer op wachten.",
        },
        { status: 409 }
      );
    }

    await prisma.cwlApplication.update({
      where: {
        id: application.id,
      },
      data: {
        status,
      },
    });

    return NextResponse.json({
      success: true,
      status,
      playerTag,
      message:
        status === "APPROVED"
          ? "CWL-aanmelding goedgekeurd."
          : "CWL-aanmelding afgewezen.",
    });
  } catch (error) {
    console.error(
      "CWL application status error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Er kon niets aan de CWL-aanmelding worden gewijzigd.",
      },
      { status: 500 }
    );
  }
}
