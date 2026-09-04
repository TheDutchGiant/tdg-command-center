import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/session";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();

    const challenge = await prisma.randomChallenge.findFirst({
      where: {
        status: "ACTIVE",
        startsAt: {
          lte: now,
        },
        endsAt: {
          gt: now,
        },
      },
      orderBy: {
        startsAt: "desc",
      },
      include: {
        variants: true,
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
    console.error("Admin Challenge lookup failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Onbekende fout.";

    const status =
      message === "ADMIN_UNAUTHORIZED"
        ? 401
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
