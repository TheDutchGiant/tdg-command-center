import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentAdmin } from "@/app/lib/auth/session";

export async function POST(request: Request) {
  try {
    const current = await getCurrentAdmin();

    if (!current) {
      return NextResponse.json(
        {
          success: false,
          error: "Niet ingelogd.",
        },
        { status: 401 }
      );
    }

    if (current.admin.role !== "SUPERADMIN") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Alleen SUPERADMIN kan admins verwijderen.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const adminId = Number(body.adminId);

    if (!Number.isInteger(adminId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldig admin-ID.",
        },
        { status: 400 }
      );
    }

    if (adminId === current.admin.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Je kunt je eigen SUPERADMIN-account niet verwijderen.",
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
            "Een SUPERADMIN-account kan niet worden verwijderd.",
        },
        { status: 403 }
      );
    }

    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          adminId: current.admin.id,
          action: "ADMIN_DELETED",
          targetType: "AdminUser",
          targetId: String(targetAdmin.id),
          details: JSON.stringify({
            username: targetAdmin.username,
            role: targetAdmin.role,
          }),
        },
      }),

      prisma.adminUser.delete({
        where: {
          id: targetAdmin.id,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Admin deletion error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Admin verwijderen is mislukt.",
      },
      { status: 500 }
    );
  }
}