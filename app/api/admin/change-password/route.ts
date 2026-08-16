import { NextResponse } from "next/server";
import {
  hashPassword,
  verifyPassword,
} from "@/app/lib/auth/password";
import { requireAdmin } from "@/app/lib/auth/session";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    const current = await requireAdmin();

    const body = await request.json();

    const currentPassword =
      typeof body.currentPassword === "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";

    const confirmPassword =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Alle wachtwoordvelden zijn verplicht.",
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De nieuwe wachtwoorden komen niet overeen.",
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

    const passwordCorrect = verifyPassword(
      currentPassword,
      current.admin.passwordHash
    );

    if (!passwordCorrect) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Het huidige wachtwoord is onjuist.",
        },
        { status: 401 }
      );
    }

    const newPasswordHash =
      hashPassword(newPassword);

    await prisma.adminUser.update({
      where: {
        id: current.admin.id,
      },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ADMIN_UNAUTHORIZED"
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

    console.error(
      "Admin password change error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Wachtwoord wijzigen is mislukt.",
      },
      { status: 500 }
    );
  }
}