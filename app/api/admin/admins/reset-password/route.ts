import { NextResponse } from "next/server";
import { hashPassword } from "@/app/lib/auth/password";
import { requireSuperadmin } from "@/app/lib/auth/session";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    const current =
      await requireSuperadmin();

    const body = await request.json();

    const adminId =
      typeof body.adminId === "number"
        ? body.adminId
        : Number(body.adminId);

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";

    if (
      !Number.isInteger(adminId) ||
      adminId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldige admin.",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Het nieuwe wachtwoord moet minimaal 8 tekens bevatten.",
        },
        { status: 400 }
      );
    }

    if (adminId === current.admin.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Je kunt je eigen wachtwoord niet via reset wijzigen. Gebruik 'Mijn account'.",
        },
        { status: 400 }
      );
    }

    const targetAdmin =
      await prisma.adminUser.findUnique({
        where: {
          id: adminId,
        },
      });

    if (!targetAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin bestaat niet.",
        },
        { status: 404 }
      );
    }

    if (targetAdmin.role === "SUPERADMIN") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Het wachtwoord van een SUPERADMIN kan hier niet worden gereset.",
        },
        { status: 403 }
      );
    }

    const passwordHash =
      hashPassword(newPassword);

    await prisma.$transaction([
      prisma.adminUser.update({
        where: {
          id: targetAdmin.id,
        },
        data: {
          passwordHash,
        },
      }),

      prisma.adminSession.updateMany({
        where: {
          adminId: targetAdmin.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),

      prisma.auditLog.create({
        data: {
          adminId: current.admin.id,
          action: "ADMIN_PASSWORD_RESET",
          targetType: "AdminUser",
          targetId: String(targetAdmin.id),
          details: JSON.stringify({
            username: targetAdmin.username,
          }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message:
        "Het wachtwoord is succesvol gereset.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "ADMIN_UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Je bent niet ingelogd als admin.",
        },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "SUPERADMIN_REQUIRED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Alleen de SUPERADMIN mag wachtwoorden resetten.",
        },
        { status: 403 }
      );
    }

    console.error(
      "Superadmin password reset error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Wachtwoord resetten is mislukt.",
      },
      { status: 500 }
    );
  }
}