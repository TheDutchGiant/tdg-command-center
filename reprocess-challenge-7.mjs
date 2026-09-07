import fs from "node:fs/promises";
import path from "node:path";
import { createWorker, PSM } from "tesseract.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]/gi, "")
    .toLowerCase();
}

function parseStars(text) {
  const starRuns = text.match(/[★⭐*☆]{1,3}/g) ?? [];
  let best = null;

  for (const run of starRuns) {
    const count = (run.match(/[★⭐*]/g) ?? []).length;
    if (count >= 1 && count <= 3 && (best === null || count > best)) {
      best = count;
    }
  }

  const matches = text.match(/(?:^|\s)([0-3])(?:\s|$)/g) ?? [];
  const values = matches
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v >= 0 && v <= 3);

  if (values.length) {
    const numeric = Math.max(...values);
    if (best === null || numeric > best) best = numeric;
  }

  return best;
}

function parseDestruction(text) {
  const matches = text.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*%/g) ?? [];

  const values = matches
    .map((v) => Number(v.replace("%", "").replace(",", ".")))
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= 100);

  return values.length ? Math.max(...values) : null;
}

function flattenLines(blocks, result = []) {
  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        result.push({
          text: line.text?.trim() ?? "",
          x0: line.bbox?.x0 ?? 0,
          y0: line.bbox?.y0 ?? 0,
          x1: line.bbox?.x1 ?? 0,
          y1: line.bbox?.y1 ?? 0,
        });
      }
    }
  }

  return result;
}

const entryId = 7;

const entry = await prisma.randomChallengeEntry.findUnique({
  where: { id: entryId },
});

if (!entry) {
  throw new Error(`Entry ${entryId} bestaat niet.`);
}

if (!entry.screenshotPath) {
  throw new Error(`Entry ${entryId} heeft geen screenshotPath.`);
}

const screenshotFile = path.join(
  process.cwd(),
  "public",
  entry.screenshotPath
);

console.log("========================================");
console.log(`Entry: ${entry.id}`);
console.log(`Speler: ${entry.playerName}`);
console.log(`Screenshot: ${screenshotFile}`);
console.log("========================================");

const imageBuffer = await fs.readFile(screenshotFile);

const worker = await createWorker("eng", 1, {
  workerPath: path.join(
    process.cwd(),
    "node_modules",
    "tesseract.js",
    "src",
    "worker-script",
    "node",
    "index.js",
  ),
});

try {
  const imageWidth = 2340;
  const imageHeight = 1080;

  /*
   * 1. CHAT OCR
   */
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
  });

  const chatZone = {
    left: 0,
    top: 0,
    width: Math.round(imageWidth * 0.35),
    height: imageHeight,
  };

  const chatOcr = await worker.recognize(
    imageBuffer,
    {
      rectangle: chatZone,
    },
    {
      blocks: true,
    },
  );

  const chatText = chatOcr.data.text ?? "";
  const chatLines = flattenLines(chatOcr.data.blocks);

  console.log("\n========== CHAT OCR ==========");
  console.log(chatText.trim());

  /*
   * 2. Zoek de bekende spelernaam in de chat.
   */
  const targetName = normalize(entry.playerName);

  let bestLine = null;
  let bestScore = 0;

  for (const line of chatLines) {
    const normalized = normalize(line.text);

    if (!normalized) continue;

    let score = 0;

    if (targetName && normalized.includes(targetName)) {
      score += 200 + targetName.length;
    }

    if (/(?:→|->|=>|>)/.test(line.text)) {
      score += 30;
    }

    if (/\d+(?:[.,]\d+)?\s*%/.test(line.text)) {
      score += 40;
    }

    if (score > bestScore) {
      bestScore = score;
      bestLine = line;
    }
  }

  console.log("\n========== GEVONDEN CHATREGEL ==========");
  console.log(bestLine);
  console.log(`Score: ${bestScore}`);

  /*
   * 3. RESULTAAT ZOEKEN OP BASIS VAN CONTEXT
   *
   * Niet meer uitgaan van één vaste positie.
   * We zoeken eerst alle OCR-regels met een percentage
   * vlak onder/rond de gevonden chatregel.
   */
  let resultFocusText = "";

  if (bestLine && bestScore >= 80) {
    const contextTop = Math.max(
      0,
      Math.round(bestLine.y0 - 20),
    );

    const contextBottom = Math.min(
      imageHeight,
      Math.round(bestLine.y1 + 170),
    );

    const contextZone = {
      left: 0,
      top: contextTop,
      width: Math.round(imageWidth * 0.45),
      height: Math.max(
        120,
        contextBottom - contextTop,
      ),
    };

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    });

    const contextOcr = await worker.recognize(
      imageBuffer,
      {
        rectangle: contextZone,
      },
      {
        blocks: true,
      },
    );

    const resultLines = [];

    for (const block of contextOcr.data.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        for (const line of paragraph.lines ?? []) {
          const text = line.text
            ?.replace(/\s+/g, " ")
            .trim();

          if (!text || !line.bbox) continue;

          resultLines.push({
            text,
            x0: line.bbox.x0,
            x1: line.bbox.x1,
            y0: line.bbox.y0,
            y1: line.bbox.y1,
          });
        }
      }
    }

    console.log("\n========== CONTEXT REGELS ==========");
    for (const line of resultLines) {
      console.log(
        `[x:${line.x0}-${line.x1}] ` +
        `[y:${line.y0}-${line.y1}] ` +
        `"${line.text}"`
      );
    }

    const percentageCandidates = resultLines
      .filter((line) => /%/.test(line.text))
      .filter(
        (line) =>
          line.y0 >= bestLine.y1 - 10 &&
          line.y0 <= bestLine.y1 + 160,
      )
      .sort((a, b) => {
        const da = Math.abs(a.y0 - bestLine.y1);
        const db = Math.abs(b.y0 - bestLine.y1);
        return da - db;
      });

    const percentageLine =
      percentageCandidates[0] ?? null;

    console.log("\n========== PERCENTAGE KANDIDAAT ==========");
    console.log(percentageLine);

    if (percentageLine) {
      const rowTop = Math.max(
        0,
        Math.round(percentageLine.y0 - 32),
      );

      /*
       * We nemen bewust de hele chatregel mee.
       * Daardoor vallen de sterren links van de %
       * ook binnen dezelfde OCR-context.
       */
      const rowZone = {
        left: Math.max(
          0,
          Math.round(percentageLine.x0 - 280),
        ),
        top: rowTop,
        width: Math.min(
          imageWidth -
            Math.max(
              0,
              Math.round(percentageLine.x0 - 280),
            ),
          600,
        ),
        height: Math.min(
          imageHeight - rowTop,
          100,
        ),
      };

      console.log("\n========== GERichte RESULTAATZONE ==========");
      console.log(rowZone);

      /*
       * Pass 1: normale OCR
       */
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        tessedit_char_whitelist:
          "0123456789%★⭐*OoDQ",
      });

      const pass1 = await worker.recognize(
        imageBuffer,
        {
          rectangle: rowZone,
        },
      );

      /*
       * Pass 2: sparse text.
       * Soms leest Tesseract de grote 100% beter
       * als losse tekstobjecten.
       */
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        tessedit_char_whitelist:
          "0123456789%★⭐*OoDQ",
      });

      const pass2 = await worker.recognize(
        imageBuffer,
        {
          rectangle: rowZone,
        },
      );

      resultFocusText = [
        "[PASS1]",
        pass1.data.text,
        "",
        "[PASS2]",
        pass2.data.text,
      ].join("\n");
    } else {
      resultFocusText =
        contextOcr.data.text;
    }
  }

  console.log("\n========== NIEUWE RESULTAAT OCR ==========");
  console.log(resultFocusText.trim() || "(geen tekst)");

  let stars = parseStars(resultFocusText);
  const destruction = parseDestruction(resultFocusText);

  if (destruction === 100) {
    stars = 3;
  }

  console.log("\n========== PARSE ==========");
  console.log(`Stars:        ${stars}`);
  console.log(`Destruction:  ${destruction}`);

  /*
   * Alleen de OCR-debuginformatie opslaan.
   * We veranderen NIET de status of ranking.
   */
  const currentOcr =
    entry.ocrResult && typeof entry.ocrResult === "object"
      ? entry.ocrResult
      : {};

  await prisma.randomChallengeEntry.update({
    where: { id: entry.id },
    data: {
      ocrResult: {
        ...currentOcr,
        reprocessTest: {
          resultZoneWidth: "50%",
          resultFocusText,
          stars,
          destruction,
          testedAt: new Date().toISOString(),
        },
      },
    },
  });

  console.log("\n✅ Entry #7 opnieuw getest zonder nieuwe upload.");
} finally {
  await worker.terminate();
  await prisma.$disconnect();
}
