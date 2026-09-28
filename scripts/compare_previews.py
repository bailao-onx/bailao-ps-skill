"""Compare a Photoshop reopened-document export with the source design.

Reports several diagnostics at full size and at a viewing size, finds the worst tiles, and writes
review images (heatmap, side-by-side crops of the worst tiles) for a visual inspection pass.
None of these numbers is a "percent fidelity"; the rubric in references/quality-protocol.md
decides whether a case passes, and it always includes a region-by-region visual review.
Requires numpy, scipy and Pillow.
"""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


def srgb_to_lab(rgb):
    c = rgb.astype(np.float64) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def delta_e2000(lab1, lab2):
    l1, a1, b1 = lab1[..., 0], lab1[..., 1], lab1[..., 2]
    l2, a2, b2 = lab2[..., 0], lab2[..., 1], lab2[..., 2]
    c1, c2 = np.hypot(a1, b1), np.hypot(a2, b2)
    cm = (c1 + c2) / 2
    g = 0.5 * (1 - np.sqrt(cm ** 7 / (cm ** 7 + 25.0 ** 7)))
    a1p, a2p = (1 + g) * a1, (1 + g) * a2
    c1p, c2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360
    dlp, dcp = l2 - l1, c2p - c1p
    dh = h2p - h1p
    dh = np.where(dh > 180, dh - 360, np.where(dh < -180, dh + 360, dh))
    dh = np.where(c1p * c2p == 0, 0, dh)
    dhp = 2 * np.sqrt(c1p * c2p) * np.sin(np.radians(dh / 2))
    lpm, cpm = (l1 + l2) / 2, (c1p + c2p) / 2
    hs = h1p + h2p
    hpm = np.where(c1p * c2p == 0, hs,
                   np.where(np.abs(h1p - h2p) <= 180, hs / 2, np.where(hs < 360, (hs + 360) / 2, (hs - 360) / 2)))
    t = (1 - 0.17 * np.cos(np.radians(hpm - 30)) + 0.24 * np.cos(np.radians(2 * hpm))
         + 0.32 * np.cos(np.radians(3 * hpm + 6)) - 0.20 * np.cos(np.radians(4 * hpm - 63)))
    sl = 1 + 0.015 * (lpm - 50) ** 2 / np.sqrt(20 + (lpm - 50) ** 2)
    sc = 1 + 0.045 * cpm
    sh = 1 + 0.015 * cpm * t
    rt = (-2 * np.sqrt(cpm ** 7 / (cpm ** 7 + 25.0 ** 7))
          * np.sin(np.radians(60 * np.exp(-(((hpm - 275) / 25) ** 2)))))
    return np.sqrt((dlp / sl) ** 2 + (dcp / sc) ** 2 + (dhp / sh) ** 2 + rt * (dcp / sc) * (dhp / sh))


def ssim_map(x, y):
    x, y = x.astype(np.float64), y.astype(np.float64)
    blur = lambda v: ndimage.gaussian_filter(v, 1.5)
    mx, my = blur(x), blur(y)
    vx, vy, cxy = blur(x * x) - mx * mx, blur(y * y) - my * my, blur(x * y) - mx * my
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    return ((2 * mx * my + c1) * (2 * cxy + c2)) / ((mx * mx + my * my + c1) * (vx + vy + c2))


def luminance(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def metrics(a, b):
    diff = np.abs(a.astype(np.int16) - b.astype(np.int16))
    peak = diff.max(axis=2)
    de = delta_e2000(srgb_to_lab(a), srgb_to_lab(b))
    ss = ssim_map(luminance(a), luminance(b))
    return {
        "mean_absolute_channel_error": round(float(diff.mean()), 3),
        "pixels_with_any_channel_error_above_24_percent": round(float((peak > 24).mean() * 100), 3),
        "mean_delta_e2000": round(float(de.mean()), 3),
        "pixels_delta_e2000_at_most_2_percent": round(float((de <= 2).mean() * 100), 3),
        "pixels_delta_e2000_at_most_5_percent": round(float((de <= 5).mean() * 100), 3),
        "mean_ssim_luminance": round(float(ss.mean()), 4),
    }, de, ss


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--preview", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--view-long-side", type=int, default=1080,
                        help="Long side used for the viewing-size comparison (default 1080 px)")
    parser.add_argument("--tiles", type=int, default=8, help="Grid size for the worst-tile report")
    parser.add_argument("--worst", type=int, default=6, help="Number of worst tiles to crop for review")
    args = parser.parse_args()
    a_img = Image.open(args.source).convert("RGB")
    b_img = Image.open(args.preview).convert("RGB")
    if a_img.size != b_img.size:
        raise ValueError(f"Canvas mismatch: source={a_img.size}, preview={b_img.size}")
    a, b = np.asarray(a_img), np.asarray(b_img)
    full, de, ss = metrics(a, b)
    scale = min(1.0, args.view_long_side / max(a_img.size))
    view_size = (max(1, round(a_img.width * scale)), max(1, round(a_img.height * scale)))
    va = np.asarray(a_img.resize(view_size, Image.Resampling.LANCZOS))
    vb = np.asarray(b_img.resize(view_size, Image.Resampling.LANCZOS))
    view, _, _ = metrics(va, vb)
    # A 1 px Gaussian at viewing size forgives sub-pixel anti-aliasing but not wrong shapes, text or colors.
    soft = lambda v: np.clip(ndimage.gaussian_filter(v.astype(np.float64), (1.0, 1.0, 0)), 0, 255).astype(np.uint8)
    softened, _, _ = metrics(soft(va), soft(vb))

    h, w = de.shape
    rows = []
    for ty in range(args.tiles):
        for tx in range(args.tiles):
            x0, x1 = tx * w // args.tiles, (tx + 1) * w // args.tiles
            y0, y1 = ty * h // args.tiles, (ty + 1) * h // args.tiles
            tile = de[y0:y1, x0:x1]
            rows.append({"box": [x0, y0, x1 - x0, y1 - y0],
                         "mean_delta_e2000": round(float(tile.mean()), 3),
                         "pixels_delta_e2000_above_5_percent": round(float((tile > 5).mean() * 100), 2),
                         "mean_ssim_luminance": round(float(ss[y0:y1, x0:x1].mean()), 4)})
    rows.sort(key=lambda r: r["mean_delta_e2000"], reverse=True)

    out = args.output
    out.mkdir(parents=True, exist_ok=True)
    heat = np.clip(de * 12, 0, 255).astype(np.uint8)
    Image.fromarray(heat, "L").save(out / "difference.png")
    review = []
    for i, row in enumerate(rows[:args.worst]):
        x, y, tw, th = row["box"]
        pad = 8
        crop = (max(0, x - pad), max(0, y - pad), min(w, x + tw + pad), min(h, y + th + pad))
        sa, sb = a_img.crop(crop), b_img.crop(crop)
        sd = Image.fromarray(heat[crop[1]:crop[3], crop[0]:crop[2]], "L").convert("RGB")
        panel = Image.new("RGB", (sa.width * 3 + 8, sa.height + 18), "white")
        for j, im in enumerate((sa, sb, sd)):
            panel.paste(im, (j * (sa.width + 4), 18))
        ImageDraw.Draw(panel).text((2, 2), f"source | preview | dE00x12   tile {row['box']}", fill="black")
        name = f"worst-tile-{i + 1}.png"
        panel.save(out / name)
        review.append(name)

    report = {
        "source": str(args.source.resolve()),
        "preview": str(args.preview.resolve()),
        "canvas": list(a_img.size),
        "full_size": full,
        "viewing_size": {"size": list(view_size), **view},
        "viewing_size_softened_1px": softened,
        "worst_tiles": rows[:args.worst],
        "review_images": review,
        "note": "Diagnostics only. A case passes only by the rubric in references/quality-protocol.md, "
                "which also requires a region-by-region visual review and an editability check.",
    }
    (out / "comparison.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: report[k] for k in ("canvas", "full_size", "viewing_size", "viewing_size_softened_1px")},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
