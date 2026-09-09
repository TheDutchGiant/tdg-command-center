import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requirePermission } from "@/app/lib/auth/permissions";
import { chooseChallengeBase } from "@/app/lib/bases/basePool";

export async function POST(request: Request) {
  try {
    await requirePermission("CHALLENGE", "EDIT");

    const body = (await request.json()) as {
      challengeId?: number;
    };

    const challengeId = Number(body.challengeId);

    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CHALLENGE_ID",
        },
        { status: 400 },
      );
    }

    const challenge = await prisma.randomChallenge.findUnique({
      where: {
        id: challengeId,
      },
      select: {
        id: true,
        townHall: true,
        baseId: true,
        status: true,
      },
    });

    if (!challenge) {
      return NextResponse.json(
        {
          success: false,
          error: "CHALLENGE_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const newBase = await chooseChallengeBase(
      challenge.townHall,
      challenge.baseId ?? undefined,
    );

    if (!newBase) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_FRESH_BASE_AVAILABLE",
          message:
            "Er is geen andere recente base beschikbaar. De automatische pool bevat momenteel geen geschikte base van maximaal 7 dagen oud.",
        },
        { status: 409 },
      );
    }

    await prisma.randomChallenge.update({
      where: {
        id: challenge.id,
      },
      data: {
        baseId: newBase.id,
      },
    });

    return NextResponse.json({
      success: true,
      base: {
        id: newBase.id,
        name: newBase.name,
        townHall: newBase.townHall,
        imageUrl: newBase.imageUrl,
        baseLink: newBase.baseLink,
      },
    });
  } catch (error) {
    console.error("[CHALLENGE-SWAP-BASE]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
