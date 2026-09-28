import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

function auth(request: Request): boolean {
  const expectedKey = process.env.TDG_BOT_API_KEY;
  const providedKey = request.headers.get("x-tdg-bot-key");

  return Boolean(
    expectedKey &&
    providedKey === expectedKey,
  );
}

export async function GET(request: Request) {
  if (!auth(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);

    const discordUserId =
      (url.searchParams.get("discordUserId") ?? "").trim();

    const channelId =
      (url.searchParams.get("channelId") ?? "").trim();

    if (!discordUserId || !channelId) {
      return NextResponse.json(
        {
          success: false,
          error: "discordUserId en channelId zijn verplicht.",
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
        include: {
          showcase: {
            include: {
              results: {
                orderBy: { createdAt: "asc" },
                take: 25,
                select: {
                  id: true,
                  discordUserId: true,
                  discordDisplayName: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

    if (!pending) {
      return NextResponse.json({
        success: true,
        pending: null,
      });
    }

    if (pending.expiresAt < new Date()) {
      await prisma.showcasePendingUpload.delete({
        where: { id: pending.id },
      });

      return NextResponse.json({
        success: true,
        pending: null,
      });
    }

    return NextResponse.json({
      success: true,
      pending: {
        id: pending.id,
        showcaseId: pending.showcaseId,
        sourceMessageId: pending.sourceMessageId,
        expiresAt: pending.expiresAt,
        showcase: pending.showcase,
      },
    });
  } catch (error) {
    console.error(
      "❌ Showcase pending GET fout:",
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

export async function POST(request: Request) {
  if (!auth(request)) {
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

    const showcaseId =
      Number.isInteger(body.showcaseId)
        ? Number(body.showcaseId)
        : 0;

    const sourceMessageId =
      typeof body.sourceMessageId === "string"
        ? body.sourceMessageId.trim()
        : null;

    if (
      !discordUserId ||
      !discordDisplayName ||
      !channelId ||
      !showcaseId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Verplichte pending-gegevens ontbreken.",
        },
        { status: 400 },
      );
    }

    const showcase =
      await prisma.showcaseBase.findUnique({
        where: { id: showcaseId },
        select: { id: true },
      });

    if (!showcase) {
      return NextResponse.json(
        {
          success: false,
          error: "Showcase bestaat niet.",
        },
        { status: 404 },
      );
    }

    const expiresAt =
      new Date(
        Date.now() + 30 * 60 * 1000,
      );

    const pending =
      await prisma.showcasePendingUpload.upsert({
        where: {
          discordUserId_channelId: {
            discordUserId,
            channelId,
          },
        },
        create: {
          discordUserId,
          discordDisplayName,
          channelId,
          showcaseId,
          sourceMessageId,
          expiresAt,
        },
        update: {
          discordDisplayName,
          showcaseId,
          sourceMessageId,
          expiresAt,
        },
      });

    return NextResponse.json({
      success: true,
      pending: {
        id: pending.id,
        showcaseId: pending.showcaseId,
        expiresAt: pending.expiresAt,
      },
    });
  } catch (error) {
    console.error(
      "❌ Showcase pending POST fout:",
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
