import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { verifyPassword } from "@/app/lib/auth/password";
import { createAdminSession } from "@/app/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Gebruikersnaam en wachtwoord zijn verplicht.",
        },
        { status: 400 }
      );
    }

    const admin = await prisma.adminUser.findUnique({
      where: {
        username,
      },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldige inloggegevens.",
        },
        { status: 401 }
      );
    }

    const validPassword = verifyPassword(
      password,
      admin.passwordHash
    );

    if (!validPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldige inloggegevens.",
        },
        { status: 401 }
      );
    }

    const forwardedFor =
      request.headers.get("x-forwarded-for");

    const realIp =
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const userAgent =
      request.headers.get("user-agent") ||
      undefined;

    await createAdminSession(
      admin.id,
      userAgent,
      realIp
    );

    return NextResponse.json({
      success: true,
      admin: {
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Er ging iets mis tijdens het inloggen.",
      },
      { status: 500 }
    );
  }
}
