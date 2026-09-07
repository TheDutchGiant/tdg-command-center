from paddleocr import PaddleOCR
from pathlib import Path

image = str(
    Path(
        "public/uploads/random-challenge/10/"
        "bb4d651d-f771-43d5-b5c8-d95798c894e7.jpg"
    )
)

print("========================================")
print("PaddleOCR test - Entry #7")
print("Screenshot:", image)
print("========================================")

ocr = PaddleOCR(
    lang="en",
    device="cpu",
)

result = ocr.predict(image)

print("\n========== PADDLE OCR OUTPUT ==========\n")

for page in result:
    print(page)
