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
    const current =
      await requireAdmin();

    const body =
      await request.json();

    const playerTag =
      normalizeTag(
        String(
          body.playerTag || ""
        )
      );

    const clanTag =
      normalizeTag(
        String(
          body.clanTag || ""
        )
      );

    if (
      !playerTag ||
      !clanTag
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Speler of clan ontbreekt.",
        },
        { status: 400 }
      );
    }

    const records =
      await prisma.missedAttack.findMany({
        where: {
          playerTag,
          clanTag,
        },
        orderBy: {
          warEndTime: "asc",
        },
      });

    if (records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geen gemiste-aanvallenlog voor deze speler in deze clan gevonden.",
        },
        { status: 404 }
      );
    }

    const totalMissed =
      records.reduce(
        (sum, record) =>
          sum +
          record.missedAttacks,
        0
      );

    const snapshot =
      records.map(
        (record) => ({
          id: record.id,
          clanTag:
            record.clanTag,
          warTag:
            record.warTag,
          playerTag:
            record.playerTag,
          playerName:
            record.playerName,
          missedAttacks:
            record.missedAttacks,
          warEndTime:
            record.warEndTime,
          createdAt:
            record.createdAt,
        })
      );

    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          adminId:
            current.admin.id,
          action:
            "CW_MISSED_ATTACKS_DELETED",
          targetType:
            "MissedAttack",
          targetId:
            `${clanTag}:${playerTag}`,
          details:
            JSON.stringify({
              clanTag,
              playerTag,
              playerName:
                records[0].playerName,
              totalMissed,
              records: snapshot,
            }),
        },
      }),

      prisma.missedAttack.deleteMany({
        where: {
          playerTag,
          clanTag,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      playerTag,
      clanTag,
      totalMissed,
    });
  } catch (error) {
    console.error(
      "CW missed attacks deletion error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Gemiste aanvallen verwijderen is mislukt.",
      },
      { status: 500 }
    );
  }
}
