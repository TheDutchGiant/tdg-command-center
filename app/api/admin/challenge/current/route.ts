import { NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/auth/permissions";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    await requirePermission("CHALLENGE", "READ");

    const challenge = await prisma.randomChallenge.findFirst({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        startsAt: "desc",
      },
      include: {
        variants: {
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      challenge: challenge
        ? {
            id: challenge.id,
            title: challenge.title,
            startsAt: challenge.startsAt,
            endsAt: challenge.endsAt,
            baseId: challenge.baseId,
            sourceArmyName: challenge.sourceArmyName,
            variants: challenge.variants.map((variant) => ({
              difficulty: variant.difficulty,
              mutatedPercent: variant.mutatedPercent,
            })),
          }
        : null,
    });
  } catch (error) {
    console.error(
      "Current Challenge admin lookup failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Onbekende fout.";

    const status =
      message === "ADMIN_UNAUTHORIZED"
        ? 401
        : message === "ADMIN_PERMISSION_REQUIRED"
          ? 403
          : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
