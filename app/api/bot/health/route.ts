import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { PHOENIX } from "@/app/lib/config";

export async function GET(request: Request) {
  const expectedKey = process.env.TDG_BOT_API_KEY;
  const providedKey = request.headers.get("x-tdg-bot-key");

  if (!expectedKey || providedKey !== expectedKey) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const clanCount = await prisma.clan.count();

    return NextResponse.json({
      success: true,
      service: "phoenix",
      status: "online",
      timestamp: new Date().toISOString(),
      configuredClans: PHOENIX.clans.length,
      databaseClans: clanCount,
    });
  } catch (error) {
    console.error("TDG Bot health API error:", error);

    return NextResponse.json(
      {
        success: false,
        service: "phoenix",
        status: "database-error",
      },
      {
        status: 500,
      }
    );
  }
}
