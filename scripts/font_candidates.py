"""Rank locally installed fonts against one OCR text crop. Requires Pillow."""

import argparse
import json
import math
import os
import statistics
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:
    raise SystemExit("Pillow is needed for visual font ranking: python3 -m pip install Pillow") from exc


def installed_font_files(extra_dirs):
    roots = [
        Path("/System/Library/Fonts"), Path("/Library/Fonts"),
        Path.home() / "Library/Fonts", Path("/usr/share/fonts"),
        Path.home() / ".local/share/fonts",
        Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft/Windows/Fonts",
    ] + [Path(p) for p in extra_dirs]
    seen = set()
    for root in roots:
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if path.suffix.lower() not in (".ttf", ".otf", ".ttc", ".otc"):
                continue
            key = str(path.resolve())
            if key not in seen:
                seen.add(key)
                yield path



def font_face_indices(path):
    """Read the TTC/OTC header so every declared face is considered."""
    if path.suffix.lower() not in (".ttc", ".otc"):
        return range(1)
    with path.open("rb") as stream:
        header = stream.read(12)
    if len(header) != 12 or header[:4] != b"ttcf":
        raise ValueError("Invalid font collection header")
    count = int.from_bytes(header[8:12], "big")
    if count < 1 or 12 + 4 * count > path.stat().st_size:
        raise ValueError("Invalid font collection face count")
    return range(count)


def source_mask(image, rect):
    x, y, w, h = rect
    crop = image.crop((x, y, x + w, y + h)).convert("RGB")
    pixels = crop.load()
    corners = [pixels[0, 0], pixels[w - 1, 0], pixels[0, h - 1], pixels[w - 1, h - 1]]
    bg = tuple(int(statistics.median(c[i] for c in corners)) for i in range(3))
    raw = crop.tobytes()
    distances = [max(abs(raw[j + i] - bg[i]) for i in range(3)) for j in range(0, len(raw), 3)]
    peak = max(distances, default=0)
    cutoff = max(25, int(peak * 0.22))
    mask = Image.new("L", crop.size)
    mask.putdata([255 if d >= cutoff else 0 for d in distances])
    return mask


def tight(mask):
    box = mask.getbbox()
    return mask.crop(box) if box else mask


def render(text, path, target_height, index):
    font = ImageFont.truetype(str(path), max(8, int(target_height * 1.5)), index=index)
    for _ in range(3):
        bb = font.getbbox(text)
        height = max(1, bb[3] - bb[1])
        size = max(8, int(font.size * target_height / height))
        font = ImageFont.truetype(str(path), size, index=index)
    bb = font.getbbox(text)
    width, height = max(1, bb[2] - bb[0]), max(1, bb[3] - bb[1])
    image = Image.new("L", (width, height), 0)
    ImageDraw.Draw(image).text((-bb[0], -bb[1]), text, fill=255, font=font)
    return tight(image), font.getname()


def score(source, candidate):
    sw, sh = source.size
    cw, ch = candidate.size
    if not min(sw, sh, cw, ch):
        return -1.0
    size = (192, 64)
    a = source.resize(size, Image.Resampling.BILINEAR).point(lambda n: 255 if n > 96 else 0)
    b = candidate.resize(size, Image.Resampling.BILINEAR).point(lambda n: 255 if n > 96 else 0)
    ap = a.tobytes(); bp = b.tobytes()
    intersection = sum(x > 0 and y > 0 for x, y in zip(ap, bp))
    union = sum(x > 0 or y > 0 for x, y in zip(ap, bp))
    overlap = intersection / union if union else 0
    width_penalty = min(0.5, abs(math.log((cw / ch) / (sw / sh))) * 0.28)
    density_penalty = abs(sum(x > 0 for x in ap) - sum(y > 0 for y in bp)) / len(ap) * 0.3
    return overlap - width_penalty - density_penalty


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--ocr", type=Path, required=True)
    parser.add_argument("--index", type=int, required=True)
    parser.add_argument("--font-dir", action="append", default=[])
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()
    observations = json.loads(args.ocr.read_text(encoding="utf-8"))
    item = observations[args.index]
    source = tight(source_mask(Image.open(args.image), item["box"]))
    results = []
    for path in installed_font_files(args.font_dir):
        try:
            indices = font_face_indices(path)
        except (OSError, ValueError):
            continue
        for index in indices:
            try:
                rendered, (family, style) = render(item["text"], path, source.height, index)
                results.append({"family": family, "style": style, "file": str(path),
                                "face_index": index, "score": round(score(source, rendered), 3)})
            except (OSError, ValueError):
                continue
    results.sort(key=lambda entry: entry["score"], reverse=True)
    print(json.dumps({"text": item["text"], "box": item["box"],
                      "candidates": results[:args.limit]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
