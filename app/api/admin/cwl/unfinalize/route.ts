import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireSuperadmin } from "@/app/lib/auth/session";

export async function POST() {
  try {
    const current = await requireSuperadmin();

    const season = new Date()
      .toISOString()
      .slice(0, 7);

    const plan =
      await prisma.cwlPlan.findUnique({
        where: {
          season,
        },
      });

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: "Geen CWL-indeling gevonden.",
        },
        { status: 404 }
      );
    }

    if (plan.status !== "FINAL") {
      return NextResponse.json(
        {
          success: false,
          error: "Deze CWL-indeling is nog geen FINAL.",
        },
        { status: 409 }
      );
    }

    const draft =
      await prisma.cwlPlan.update({
        where: {
          id: plan.id,
        },
        data: {
          status: "DRAFT",
          finalizedAt: null,
          finalizedById: null,
        },
      });

    return NextResponse.json({
      success: true,
      planId: draft.id,
      season: draft.season,
      status: draft.status,
      version: draft.version,
      unlockedById: current.admin.id,
    });
  } catch (error) {
    console.error(
      "CWL unfinalize error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "CWL-indeling kon niet worden ontgrendeld.";

    const status =
      message === "ADMIN_UNAUTHORIZED"
        ? 401
        : message === "SUPERADMIN_REQUIRED"
          ? 403
          : 500;

    return NextResponse.json(
      {
        success: false,
        error:
          message === "SUPERADMIN_REQUIRED"
            ? "Alleen SUPERADMIN kan een definitieve CWL-indeling terugzetten."
            : message === "ADMIN_UNAUTHORIZED"
              ? "Niet ingelogd als admin."
              : message,
      },
      { status }
    );
  }
}
