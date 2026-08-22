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

    if (
      current.admin.role !==
      "SUPERADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Alleen SUPERADMIN kan gemiste aanval logs herstellen.",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const auditId =
      Number(body.auditId);

    if (
      !Number.isInteger(auditId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ongeldig auditlog.",
        },
        { status: 400 }
      );
    }

    const audit =
      await prisma.auditLog.findUnique({
        where: {
          id: auditId,
        },
      });

    if (
      !audit ||
      audit.action !==
        "CW_MISSED_ATTACKS_DELETED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Herstelbare CW-verwijdering niet gevonden.",
        },
        { status: 404 }
      );
    }

    if (!audit.details) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geen herstelgegevens aanwezig.",
        },
        { status: 400 }
      );
    }

    const details =
      JSON.parse(
        audit.details
      );

    const records =
      Array.isArray(
        details.records
      )
        ? details.records
        : [];

    if (
      records.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geen oorspronkelijke records gevonden.",
        },
        { status: 400 }
      );
    }

    const playerTag =
      normalizeTag(
        String(
          details.playerTag ||
            records[0].playerTag ||
            ""
        )
      );

    const clanTag =
      normalizeTag(
        String(
          details.clanTag ||
            records[0].clanTag ||
            ""
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
            "Clan of speler ontbreekt in het auditlog.",
        },
        { status: 400 }
      );
    }

    const existing =
      await prisma.missedAttack.findMany({
        where: {
          playerTag,
          clanTag,
        },
      });

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deze gemiste-aanvallenlog bestaat alweer voor deze clan.",
        },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      ...records.map(
        (record: {
          clanTag: string;
          warTag: string;
          playerTag: string;
          playerName: string;
          missedAttacks: number;
          warEndTime: string;
        }) =>
          prisma.missedAttack.create({
            data: {
              clanTag:
                normalizeTag(
                  record.clanTag
                ),
              warTag:
                record.warTag,
              playerTag:
                normalizeTag(
                  record.playerTag
                ),
              playerName:
                record.playerName,
              missedAttacks:
                record.missedAttacks,
              warEndTime:
                new Date(
                  record.warEndTime
                ),
            },
          })
      ),

      prisma.auditLog.create({
        data: {
          adminId:
            current.admin.id,
          action:
            "CW_MISSED_ATTACKS_RESTORED",
          targetType:
            "MissedAttack",
          targetId:
            `${clanTag}:${playerTag}`,
          details:
            JSON.stringify({
              clanTag,
              playerTag,
              playerName:
                details.playerName,
              totalMissed:
                details.totalMissed,
              restoredFromAuditId:
                audit.id,
            }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      playerTag,
      clanTag,
      totalMissed:
        details.totalMissed || 0,
    });
  } catch (error) {
    console.error(
      "CW missed attacks restore error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Gemiste aanvallen herstellen is mislukt.",
      },
      { status: 500 }
    );
  }
}
