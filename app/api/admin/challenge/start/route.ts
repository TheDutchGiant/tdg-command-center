import { NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/auth/permissions";
import { startNewChallenge } from "@/app/lib/challenge/ensureActiveChallenge";

export async function POST() {
  try {
    await requirePermission("CHALLENGE", "EDIT");

    const challenge = await startNewChallenge({
      manual: true,
    });

    return NextResponse.json({
      success: true,
      challenge: {
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
      },
    });
  } catch (error) {
    console.error("Manual Challenge start failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Onbekende fout bij starten van Challenge.";

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
