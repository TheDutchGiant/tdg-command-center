import fs from "node:fs/promises";
import path from "node:path";
import { createWorker, PSM } from "tesseract.js";

const file = path.join(
  process.cwd(),
  "public/uploads/random-challenge/10/bb4d651d-f771-43d5-b5c8-d95798c894e7.jpg"
);

const imageBuffer = await fs.readFile(file);

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
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
  });

  const result = await worker.recognize(
    imageBuffer,
    {
      rectangle: {
        left: 0,
        top: 760,
        width: 1300,
        height: 320,
      },
    },
    {
      blocks: true,
    },
  );

  console.log("\n========== OCR REGELS MET POSITIE ==========\n");

  for (const block of result.data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const text = line.text?.replace(/\s+/g, " ").trim();

        if (!text) continue;

        console.log(
          `[x:${line.bbox.x0}-${line.bbox.x1}] ` +
          `[y:${line.bbox.y0}-${line.bbox.y1}] ` +
          `"${text}"`
        );
      }
    }
  }
} finally {
  await worker.terminate();
}
