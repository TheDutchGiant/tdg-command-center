import { NextResponse } from "next/server";
import { PHOENIX } from "@/app/lib/config";
import { fetchClash } from "@/app/lib/clash";

export async function GET() {
  try {
    const clans = await Promise.all(
      PHOENIX.clans.map(async (clan) => {
        const data = await fetchClash(`/clans/%23${clan.tag}`);

        return {
          name: data.name,
          tag: data.tag,
          members: data.members,
          level: data.clanLevel,
          warLeague: data.warLeague?.name,
          warWinStreak: data.warWinStreak,
          badge: data.badgeUrls?.large,
        };
      })
    );

    return NextResponse.json(clans);
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}