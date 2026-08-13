import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { requireSuperadmin } from "@/app/lib/auth/session";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    await requireSuperadmin();

    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const permissionKeys = Array.isArray(
      body.permissionKeys
    )
      ? body.permissionKeys.filter(
          (key: unknown): key is string =>
            typeof key === "string"
        )
      : [];

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Een gebruikersnaam is verplicht.",
        },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De gebruikersnaam moet minimaal 3 tekens bevatten.",
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Een wachtwoord is verplicht.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Het wachtwoord moet minimaal 8 tekens bevatten.",
        },
        { status: 400 }
      );
    }

    const existingAdmin =
      await prisma.adminUser.findUnique({
        where: {
          username,
        },
      });

    if (existingAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Deze gebruikersnaam bestaat al.",
        },
        { status: 409 }
      );
    }

    const permissions =
      await prisma.adminPermission.findMany({
        where: {
          key: {
            in: permissionKeys,
          },
        },
      });

    if (
      permissions.length !==
      new Set(permissionKeys).size
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Een of meer geselecteerde rechten bestaan niet.",
        },
        { status: 400 }
      );
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const admin =
      await prisma.adminUser.create({
        data: {
          username,
          passwordHash,
          role: "ADMIN",
          permissions: {
            create: permissions.map(
              (permission) => ({
                permissionId:
                  permission.id,
              })
            ),
          },
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        permissions:
          admin.permissions.map(
            (item) => item.permission.key
          ),
      },
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

    if (
      error instanceof Error &&
      error.message === "SUPERADMIN_REQUIRED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Alleen de SUPERADMIN mag admins aanmaken.",
        },
        { status: 403 }
      );
    }

    console.error(
      "Admin creation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Admin aanmaken is mislukt.",
      },
      { status: 500 }
    );
  }
}