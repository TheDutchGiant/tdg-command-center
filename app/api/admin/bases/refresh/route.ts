import { NextResponse } from "next/server";
import { refreshBasePool } from "@/app/lib/bases/basePool";
import { requirePermission } from "@/app/lib/auth/permissions";

export async function POST() {
  try {
    await requirePermission("CHALLENGE", "EDIT");

    const result = await refreshBasePool(18);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[BASE-POOL] Handmatige refresh mislukt:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout bij Base Pool refresh.",
      },
      { status: 500 },
    );
  }
}
