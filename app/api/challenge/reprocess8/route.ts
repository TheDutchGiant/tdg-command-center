import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { POST as submitPOST } from "../submit/route";
import fs from "node:fs/promises";
import path from "node:path";

export const maxDuration = 300;

export async function GET() {
  const entryId = 8;

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
      { success: false, error: "Entry #8 bestaat niet." },
      { status: 404 },
    );
  }

  if (!existingEntry.screenshotPath) {
    return NextResponse.json(
      {
        success: false,
        error: "Entry #8 heeft geen screenshotPath.",
      },
      { status: 409 },
    );
  }

  if (existingEntry.result) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Entry #8 heeft al een resultaat. Niet overschrijven.",
        result: existingEntry.result,
      },
      { status: 409 },
    );
  }

  const relativePath =
    existingEntry.screenshotPath.replace(/^\/+/, "");

  const screenshotFile =
    path.join(
      process.cwd(),
      "public",
      relativePath,
    );

  const buffer =
    await fs.readFile(
      screenshotFile,
    );

  const extension =
    path.extname(
      screenshotFile,
    ).toLowerCase();

  const mimeType =
    extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : "image/jpeg";

  const file =
    new File(
      [buffer],
      path.basename(screenshotFile),
      { type: mimeType },
    );

  const formData =
    new FormData();

  formData.set(
    "challengeId",
    String(
      existingEntry.challengeId,
    ),
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
      create:
        (...args: any[]) =>
        Promise<any>;
    };

  const originalCreate =
    createDelegate.create.bind(
      prisma.randomChallengeEntry,
    );

  /*
   * Veiligheidsanker:
   * de bestaande submit-route mag geen nieuwe entry maken.
   * Hij krijgt het bestaande entry-ID #8 terug.
   */
  createDelegate.create =
    async () => ({
      id: entryId,
    });

  let submitResponse:
    | Response
    | null = null;

  try {
    const request =
      new Request(
        "http://127.0.0.1/api/challenge/submit",
        {
          method: "POST",
          body: formData,
        },
      );

    submitResponse =
      await submitPOST(
        request,
      );
  } finally {
    createDelegate.create =
      originalCreate;
  }

  /*
   * after() kan nog bezig zijn nadat POST terugkomt.
   * Wacht daarom op de bestaande entry.
   */
  let latest =
    await prisma.randomChallengeEntry.findUnique({
      where: {
        id: entryId,
      },
      include: {
        result: true,
      },
    });

  const deadline =
    Date.now() +
    240_000;

  while (
    latest?.status ===
      "PROCESSING" &&
    Date.now() <
      deadline
  ) {
    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          5000,
        ),
    );

    latest =
      await prisma.randomChallengeEntry.findUnique({
        where: {
          id: entryId,
        },
        include: {
          result: true,
        },
      });
  }

  return NextResponse.json({
    success: true,
    submitStatus:
      submitResponse?.status ??
      null,
    entry: latest,
  });
}
