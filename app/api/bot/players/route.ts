import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

function normalizeTag(tag: string) {
  return tag.replace(/^#/, "").toUpperCase();
}

export async function GET(request: Request) {
  const expectedKey = process.env.TDG_BOT_API_KEY;
  const providedKey = request.headers.get("x-tdg-bot-key");

  if (!expectedKey || providedKey !== expectedKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();

  try {
    const players = await prisma.player.findMany({
      where: query
        ? {
            OR: [
              {
                currentName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                playerTag: {
                  contains: normalizeTag(query),
                  mode: "insensitive",
                },
              },
            ],
          }
        : undefined,
      select: {
        playerTag: true,
        currentName: true,
      },
      orderBy: {
        currentName: "asc",
      },
      take: 25,
    });

    return NextResponse.json({
      success: true,
      players: players.map((player) => ({
        playerTag: normalizeTag(player.playerTag),
        currentName: player.currentName,
      })),
    });
  } catch (error) {
    console.error("❌ Bot players API fout:", error);

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
