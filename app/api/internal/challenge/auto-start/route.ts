import { NextResponse } from "next/server";
import { ensureActiveChallenge } from "@/app/lib/challenge/ensureActiveChallenge";

export async function GET(request: Request) {
  const internalKey =
    request.headers.get("x-phoenix-internal");

  if (
    !process.env.PHOENIX_INTERNAL_KEY ||
    internalKey !== process.env.PHOENIX_INTERNAL_KEY
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    const challenge = await ensureActiveChallenge();

    return NextResponse.json({
      success: true,
      challenge: {
        id: challenge.id,
        title: challenge.title,
        startsAt: challenge.startsAt,
        endsAt: challenge.endsAt,
        variants: challenge.variants.length,
      },
    });
  } catch (error) {
    console.error(
      "Automatic Challenge start failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      { status: 500 }
    );
  }
}
