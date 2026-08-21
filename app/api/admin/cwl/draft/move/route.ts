import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth/session";

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();

    const playerTag = String(body.playerTag || "").trim();
    const targetClanPlanId = Number(body.targetClanPlanId);
    const targetPosition = Number(body.targetPosition);

    if (
      !playerTag ||
      !Number.isInteger(targetClanPlanId) ||
      !Number.isInteger(targetPosition) ||
      targetPosition < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldige verplaatsing.",
        },
        { status: 400 }
      );
    }

    const season = new Date()
      .toISOString()
      .slice(0, 7);

    const plan = await prisma.cwlPlan.findUnique({
      where: { season },
      include: {
        clanPlans: {
          include: {
            assignments: {
              orderBy: {
                position: "asc",
              },
            },
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
          error: "De CWL-indeling is al definitief.",
        },
        { status: 409 }
      );
    }

    const sourceClan = plan.clanPlans.find(
      (clan) =>
        clan.assignments.some(
          (assignment) =>
            assignment.playerTag === playerTag
        )
    );

    const targetClan = plan.clanPlans.find(
      (clan) =>
        clan.id === targetClanPlanId
    );

    if (!sourceClan || !targetClan) {
      return NextResponse.json(
        {
          success: false,
          error: "Speler of doelclan niet gevonden.",
        },
        { status: 404 }
      );
    }

    const sourceAssignment =
      sourceClan.assignments.find(
        (assignment) =>
          assignment.playerTag === playerTag
      );

    if (!sourceAssignment) {
      return NextResponse.json(
        {
          success: false,
          error: "Speler niet gevonden in de huidige indeling.",
        },
        { status: 404 }
      );
    }

    const allAssignments =
      targetClan.assignments.filter(
        (assignment) =>
          assignment.playerTag !== playerTag
      );

    if (
      targetPosition >
      allAssignments.length + 1
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldige positie.",
        },
        { status: 400 }
      );
    }

    const newAssignments =
      [...allAssignments];

    newAssignments.splice(
      targetPosition - 1,
      0,
      sourceAssignment
    );

    await prisma.$transaction(async (tx) => {
      const affectedClanIds =
        sourceClan.id === targetClan.id
          ? [sourceClan.id]
          : [sourceClan.id, targetClan.id];

      for (const clanId of affectedClanIds) {
        const clan =
          plan.clanPlans.find(
            (item) =>
              item.id === clanId
          )!;

        const ordered =
          clan.id === targetClan.id
            ? newAssignments
            : clan.assignments.filter(
                (assignment) =>
                  assignment.playerTag !==
                  playerTag
              );

        for (
          let index = 0;
          index < ordered.length;
          index++
        ) {
          await tx.cwlAssignment.update({
            where: {
              id: ordered[index].id,
            },
            data: {
              position: index + 1,
              role:
                index < clan.starters
                  ? "STARTER"
                  : "RESERVE",
              source: "MANUAL",
            },
          });
        }
      }

      if (sourceClan.id !== targetClan.id) {
        await tx.cwlAssignment.update({
          where: {
            id: sourceAssignment.id,
          },
          data: {
            clanPlanId: targetClan.id,
            position: targetPosition,
            role:
              targetPosition <= targetClan.starters
                ? "STARTER"
                : "RESERVE",
            source: "MANUAL",
          },
        });

        const targetOrdered =
          newAssignments.filter(
            (assignment) =>
              assignment.id !== sourceAssignment.id
          );

        for (
          let index = 0;
          index < targetOrdered.length;
          index++
        ) {
          await tx.cwlAssignment.update({
            where: {
              id: targetOrdered[index].id,
            },
            data: {
              position:
                index >= targetPosition - 1
                  ? index + 2
                  : index + 1,
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "CWL draft move error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Speler kon niet worden verplaatst.",
      },
      { status: 500 }
    );
  }
}
