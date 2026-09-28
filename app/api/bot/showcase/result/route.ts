import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  const expectedKey = process.env.TDG_BOT_API_KEY;
  const providedKey = request.headers.get("x-tdg-bot-key");

  if (!expectedKey || providedKey !== expectedKey) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

    const discordUserId =
      typeof body.discordUserId === "string"
        ? body.discordUserId.trim()
        : "";

    const discordDisplayName =
      typeof body.discordDisplayName === "string"
        ? body.discordDisplayName.trim()
        : "";

    const channelId =
      typeof body.channelId === "string"
        ? body.channelId.trim()
        : "";

    const screenshotUrl =
      typeof body.screenshotUrl === "string"
        ? body.screenshotUrl.trim()
        : "";

    const screenshotMessageId =
      typeof body.screenshotMessageId === "string"
        ? body.screenshotMessageId.trim()
        : "";

    if (
      !discordUserId ||
      !discordDisplayName ||
      !channelId ||
      !screenshotUrl ||
      !screenshotMessageId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Verplichte resultaatgegevens ontbreken.",
        },
        { status: 400 },
      );
    }

    const pending =
      await prisma.showcasePendingUpload.findUnique({
        where: {
          discordUserId_channelId: {
            discordUserId,
            channelId,
          },
        },
      });

    if (!pending) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Er staat geen actieve Showcase-upload voor deze gebruiker open.",
        },
        { status: 404 },
      );
    }

    if (pending.expiresAt < new Date()) {
      await prisma.showcasePendingUpload.delete({
        where: { id: pending.id },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "De screenshot-upload is verlopen. Plaats de base-link opnieuw.",
        },
        { status: 410 },
      );
    }

    const result =
      await prisma.showcaseLegendsResult.create({
        data: {
          showcaseId: pending.showcaseId,
          discordUserId,
          discordDisplayName,
          screenshotUrl,
          screenshotMessageId,
        },
        select: {
          id: true,
          showcaseId: true,
          discordUserId: true,
          discordDisplayName: true,
          screenshotUrl: true,
          screenshotMessageId: true,
          createdAt: true,
        },
      });

    await prisma.showcasePendingUpload.delete({
      where: { id: pending.id },
    });

    const showcase =
      await prisma.showcaseBase.findUnique({
        where: { id: pending.showcaseId },
        include: {
          results: {
            orderBy: { createdAt: "asc" },
            take: 25,
            select: {
              id: true,
              discordUserId: true,
              discordDisplayName: true,
              screenshotMessageId: true,
              createdAt: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      result,
      showcase,
    });
  } catch (error) {
    console.error(
      "❌ Showcase resultaat API fout:",
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
