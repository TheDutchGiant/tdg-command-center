import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth/session";

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();

    const playerTag =
      String(body.playerTag || "").trim();

    const targetPlayerTag =
      String(body.targetPlayerTag || "").trim();

    const targetClanTag =
      String(body.targetClanTag || "")
        .trim()
        .replace(/^#/, "")
        .toUpperCase();

    const isDirectMove =
      Boolean(targetClanTag);

    if (
      !playerTag ||
      (!targetPlayerTag && !targetClanTag)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldige wissel.",
        },
        { status: 400 }
      );
    }

    if (
      !isDirectMove &&
      playerTag === targetPlayerTag
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Een speler kan niet met zichzelf wisselen.",
        },
        { status: 400 }
      );
    }

    const season = new Date()
      .toISOString()
      .slice(0, 7);

    const plan =
      await prisma.cwlPlan.findUnique({
        where: { season },
        include: {
          clanPlans: {
            include: {
              assignments: true,
            },
          },
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
          error:
            "De CWL-indeling is al definitief.",
        },
        { status: 409 }
      );
    }

    let sourceAssignment = null;
    let targetAssignment = null;
    let sourceClan = null;
    let targetClan = null;

    if (isDirectMove) {
      targetClan =
        plan.clanPlans.find(
          (clan) =>
            clan.clanTag
              .replace(/^#/, "")
              .toUpperCase() ===
            targetClanTag
        ) || null;
    }

    for (const clan of plan.clanPlans) {
      for (const assignment of clan.assignments) {
        if (assignment.playerTag === playerTag) {
          sourceAssignment = assignment;
          sourceClan = clan;
        }

        if (
          !isDirectMove &&
          assignment.playerTag ===
          targetPlayerTag
        ) {
          targetAssignment = assignment;
          targetClan = clan;
        }
      }
    }

    if (!sourceAssignment || !sourceClan) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De eerste speler staat niet in de CWL-indeling.",
        },
        { status: 404 }
      );
    }

    if (!targetClan) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De doelclan bestaat niet.",
        },
        { status: 404 }
      );
    }

    if (
      !isDirectMove &&
      !targetAssignment
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De tweede speler staat niet in de CWL-indeling.",
        },
        { status: 404 }
      );
    }

    if (sourceClan.id === targetClan.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Beide spelers zitten al in dezelfde clan.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * DIRECT VERPLAATSEN
     * ---------------------------------------------------------
     *
     * Eén speler verhuist naar een andere clan.
     * Er wordt niemand anders gewisseld.
     */

    if (isDirectMove) {
      if (
        targetClan.assignments.length >=
        34
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "De doelclan heeft al 34 spelers.",
          },
          { status: 409 }
        );
      }

      const newPosition =
        targetClan.assignments.reduce(
          (
            highest,
            assignment
          ) =>
            Math.max(
              highest,
              assignment.position
            ),
          0
        ) + 1;

      await prisma.cwlAssignment.update({
        where: {
          id:
            sourceAssignment.id,
        },
        data: {
          clanPlanId:
            targetClan.id,

          position:
            newPosition,

          role:
            newPosition <=
            targetClan.starters
              ? "STARTER"
              : "RESERVE",

          source:
            "MANUAL",
        },
      });

      return NextResponse.json({
        success: true,
        mode: "MOVE",
      });
    }

    /*
     * Vanaf hier is dit altijd de bestaande
     * WISSEL-functionaliteit.
     *
     * Bij een directe verplaatsing zijn we hierboven
     * al teruggekeerd.
     */
    if (
      !sourceAssignment ||
      !targetAssignment
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De spelers konden niet worden gevonden voor de wissel.",
        },
        { status: 404 }
      );
    }

    const sourcePosition =
      sourceAssignment.position;

    const targetPosition =
      targetAssignment.position;

    await prisma.$transaction(async (tx) => {
      /*
       * Eerst beide spelers volledig uit hun
       * bestaande slots halen.
       *
       * 1000000+ID ligt gegarandeerd buiten
       * de normale CWL-posities.
       */
      await tx.cwlAssignment.update({
        where: {
          id: sourceAssignment.id,
        },
        data: {
          position:
            1000000 + sourceAssignment.id,
        },
      });

      await tx.cwlAssignment.update({
        where: {
          id: targetAssignment.id,
        },
        data: {
          position:
            1000000 + targetAssignment.id,
        },
      });

      /*
       * Nu wisselen de spelers van clan én slot.
       */
      await tx.cwlAssignment.update({
        where: {
          id: sourceAssignment.id,
        },
        data: {
          clanPlanId: targetClan.id,
          position: targetPosition,
          role:
            targetPosition <=
            targetClan.starters
              ? "STARTER"
              : "RESERVE",
          source: "MANUAL",
        },
      });

      await tx.cwlAssignment.update({
        where: {
          id: targetAssignment.id,
        },
        data: {
          clanPlanId: sourceClan.id,
          position: sourcePosition,
          role:
            sourcePosition <=
            sourceClan.starters
              ? "STARTER"
              : "RESERVE",
          source: "MANUAL",
        },
      });
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "CWL draft swap error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Spelers konden niet worden gewisseld.",
      },
      { status: 500 }
    );
  }
}
