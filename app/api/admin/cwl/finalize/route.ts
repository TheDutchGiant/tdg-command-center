import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCwlWorkingSeason } from "@/app/lib/getCwlWorkingSeason";
import { requireAdmin } from "@/app/lib/auth/session";
import { sendCwlFinalizedWebhook } from "@/app/lib/discord/cwlWebhook";

export async function POST() {
  try {
    const current = await requireAdmin();

    const season = new Date()
      .toISOString()
      .slice(0, 7);

    const plan = await prisma.cwlPlan.findUnique({
      where: {
        season,
      },
    });

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: "Geen CWL-concept gevonden.",
        },
        { status: 404 }
      );
    }

    if (plan.status !== "DRAFT") {
      return NextResponse.json(
        {
          success: false,
          error: "Deze CWL-indeling is al definitief.",
        },
        { status: 409 }
      );
    }

    const finalizedPlan = await prisma.cwlPlan.update({
      where: {
        id: plan.id,
      },
      data: {
        status: "FINAL",
        finalizedAt: new Date(),
        finalizedById: current.admin.id,
      },
    });

    let discordWebhookSent = false;

    try {
      const webhookResult =
        await sendCwlFinalizedWebhook();

      discordWebhookSent =
        webhookResult.sent === true;
    } catch (webhookError) {
      console.error(
        "CWL Discord webhook error:",
        webhookError
      );
    }

    return NextResponse.json({
      success: true,
      planId: finalizedPlan.id,
      season: finalizedPlan.season,
      status: finalizedPlan.status,
      version: finalizedPlan.version,
      finalizedAt: finalizedPlan.finalizedAt,
      discordWebhookSent,
    });
  } catch (error) {
    console.error("CWL finalize error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "CWL-indeling kon niet definitief worden gemaakt.",
      },
      { status: 500 }
    );
  }
}
