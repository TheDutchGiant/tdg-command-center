import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { POST as submitPOST } from "../submit/route";
import fs from "node:fs/promises";
import path from "node:path";

export const maxDuration = 300;

export async function GET() {
  const entryId = 7;

  const existingEntry =
    await prisma.randomChallengeEntry.findUnique({
      where: { id: entryId },
      include: {
        challenge: true,
        result: true,
      },
    });

  if (!existingEntry) {
    return NextResponse.json(
      { success: false, error: "Entry #7 bestaat niet." },
      { status: 404 },
    );
  }

  if (!existingEntry.screenshotPath) {
    return NextResponse.json(
      { success: false, error: "Entry #7 heeft geen screenshotPath." },
      { status: 409 },
    );
  }

  if (existingEntry.result) {
    return NextResponse.json(
      {
        success: false,
        error: "Entry #7 heeft al een RandomChallengeResult. Niet overschrijven.",
        result: existingEntry.result,
      },
      { status: 409 },
    );
  }

  const variant =
    await prisma.randomChallengeVariant.findUnique({
      where: {
        challengeId_difficulty: {
          challengeId: existingEntry.challengeId,
          difficulty: existingEntry.difficulty,
        },
      },
    });

  if (!variant) {
    return NextResponse.json(
      {
        success: false,
        error: "Geen bijbehorende challenge-variant gevonden.",
      },
      { status: 409 },
    );
  }

  const relativePath =
    existingEntry.screenshotPath.replace(/^\/+/, "");

  const screenshotFile =
    path.join(process.cwd(), "public", relativePath);

  const buffer = await fs.readFile(screenshotFile);

  const extension =
    path.extname(screenshotFile).toLowerCase();

  const mimeType =
    extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : "image/jpeg";

  const file = new File(
    [buffer],
    path.basename(screenshotFile),
    { type: mimeType },
  );

  const formData = new FormData();
  formData.set(
    "challengeId",
    String(existingEntry.challengeId),
  );
  formData.set(
    "difficulty",
    existingEntry.difficulty,
  );
  formData.set(
    "screenshot",
    file,
  );

  const createDelegate =
    prisma.randomChallengeEntry as unknown as {
      create: (...args: any[]) => Promise<any>;
    };

  const originalCreate =
    createDelegate.create.bind(
      prisma.randomChallengeEntry,
    );

  /*
   * Veiligheidsanker:
   * de bestaande POST mag NIET een nieuwe Entry maken.
   * Hij krijgt exact het bestaande ID #7 terug.
   */
  createDelegate.create = async () => ({
    id: entryId,
  });

  let submitResponse: Response;

  try {
    const request = new Request(
      "http://127.0.0.1/api/challenge/submit",
      {
        method: "POST",
        body: formData,
      },
    );

    submitResponse =
      await submitPOST(request);
  } finally {
    createDelegate.create =
      originalCreate;
  }

  /*
   * De echte verwerking gebeurt via after().
   * Wacht maximaal 180 seconden op COMPLETED.
   */
  let latest =
    await prisma.randomChallengeEntry.findUnique({
      where: { id: entryId },
      include: {
        result: true,
      },
    });

  const deadline =
    Date.now() + 180_000;

  while (
    latest?.status === "PROCESSING" &&
    Date.now() < deadline
  ) {
    await new Promise((resolve) =>
      setTimeout(resolve, 5000),
    );

    latest =
      await prisma.randomChallengeEntry.findUnique({
        where: { id: entryId },
        include: {
          result: true,
        },
      });
  }

  return NextResponse.json({
    success: true,
    submitStatus: submitResponse.status,
    entry: latest,
    variant: {
      id: variant.id,
      difficulty: variant.difficulty,
    },
  });
}
