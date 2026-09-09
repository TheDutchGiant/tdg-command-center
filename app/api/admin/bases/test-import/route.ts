import { NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/auth/permissions";
import { refreshBasePool } from "@/app/lib/bases/basePool";

export async function POST() {
  try {
    await requirePermission("CHALLENGE", "EDIT");

    const result = await refreshBasePool(18, 10);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[BASE-TEST-IMPORT]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
