import { NextResponse } from "next/server";
import { syncRegularWars } from "@/app/lib/regularWarSync";

export async function GET() {
  try {
    const result = await syncRegularWars();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("🔥 REGULAR CW SYNC ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ??
          "Onbekende fout tijdens gewone CW-sync.",
      },
      { status: 500 }
    );
  }
}
