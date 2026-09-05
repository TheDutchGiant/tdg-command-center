import { NextResponse } from "next/server";
import { getChallengeRanking } from "@/app/lib/challenge/ranking";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  request: Request,
) {
  try {
    const url = new URL(request.url);

    const challengeId = Number(
      url.searchParams.get("challengeId"),
    );

    const difficulty =
      url.searchParams.get("difficulty")?.trim() || "";

    if (
      !Number.isInteger(challengeId) ||
      challengeId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldige Challenge.",
        },
        { status: 400 },
      );
    }

    if (!difficulty) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldige moeilijkheid.",
        },
        { status: 400 },
      );
    }

    const challenge =
      await prisma.randomChallenge.findUnique({
        where: {
          id: challengeId,
        },
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
        },
      });

    if (!challenge) {
      return NextResponse.json(
        {
          success: false,
          error: "Challenge bestaat niet.",
        },
        { status: 404 },
      );
    }

    const ranking =
      await getChallengeRanking(
        challengeId,
        difficulty,
      );

    return NextResponse.json({
      success: true,
      challenge,
      difficulty,
      ranking,
    });
  } catch (error) {
    console.error(
      "Challenge leaderboard failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      { status: 500 },
    );
  }
}
