"""Validate one reviewed layer plan and emit a Photoshop JSX reconstruction script."""

import argparse
import json
from pathlib import Path
import sys

from geometry import bezier_bounds, expand_primitive, normalize_point

KINDS = {"image", "text", "shape", "gradient", "polygon", "bezier_fill", "color_extract", "vector"}
BLEND_MODES = {"normal", "dissolve", "darken", "multiply", "colorBurn", "linearBurn", "darkerColor", "lighten",
               "screen", "colorDodge", "linearDodge", "lighterColor", "overlay", "softLight", "hardLight",
               "vividLight", "linearLight", "pinLight", "hardMix", "difference", "exclusion", "subtract",
               "divide", "hue", "saturation", "color", "luminosity"}
OPS = {"add", "subtract", "intersect", "xor"}


def color(value, field):
    if not isinstance(value, str) or len(value) != 6 or any(c not in "0123456789abcdefABCDEF" for c in value):
        raise ValueError(f"{field} must be a six-digit hex color")
    return value.upper()


def box(value, field):
    if not isinstance(value, list) or len(value) != 4 or any(not isinstance(n, (int, float)) for n in value):
        raise ValueError(f"{field} must be [x, y, width, height]")
    if value[2] <= 0 or value[3] <= 0:
        raise ValueError(f"{field} width and height must be positive")
    return value


def number(layer, field, where, low=None, high=None, required=False):
    if field not in layer:
        if required:
            raise ValueError(f"{where}.{field} is required")
        return
    value = layer[field]
    if not isinstance(value, (int, float)) or (low is not None and value < low) or (high is not None and value > high):
        raise ValueError(f"{where}.{field} is out of range")


def vector(layer, where):
    if "primitive" in layer:
        layer["subpaths"] = expand_primitive(layer, where)
    subpaths = layer.get("subpaths")
    if not isinstance(subpaths, list) or not subpaths:
        raise ValueError(f"{where} needs subpaths or a primitive")
    for i, sub in enumerate(subpaths):
        here = f"{where}.subpaths[{i}]"
        if not isinstance(sub, dict) or not isinstance(sub.get("points"), list):
            raise ValueError(f"{here} needs points")
        sub["closed"] = bool(sub.get("closed", True))
        sub["op"] = sub.get("op", "add")
        if sub["op"] not in OPS:
            raise ValueError(f"{here}.op must be one of {sorted(OPS)}")
        if len(sub["points"]) < (3 if sub["closed"] else 2):
            raise ValueError(f"{here} has too few points")
        sub["points"] = [normalize_point(p, f"{here}.points[{j}]") for j, p in enumerate(sub["points"])]
    fill = layer.get("fill")
    if fill is not None:
        layer["fill"] = color(fill, f"{where}.fill")
    stroke = layer.get("stroke")
    if stroke is not None:
        if not isinstance(stroke, dict):
            raise ValueError(f"{where}.stroke must be an object")
        stroke["color"] = color(stroke.get("color", ""), f"{where}.stroke.color")
        number(stroke, "width", f"{where}.stroke", 0.01, required=True)
        number(stroke, "opacity", f"{where}.stroke", 0, 100)
        if stroke.setdefault("align", "center") not in ("center", "inside", "outside"):
            raise ValueError(f"{where}.stroke.align must be center, inside or outside")
        if stroke.setdefault("cap", "butt") not in ("butt", "round", "square"):
            raise ValueError(f"{where}.stroke.cap must be butt, round or square")
        if stroke.setdefault("join", "miter") not in ("miter", "round", "bevel"):
            raise ValueError(f"{where}.stroke.join must be miter, round or bevel")
        dash = stroke.get("dash")
        if dash is not None and (not isinstance(dash, list) or not dash or
                                 any(not isinstance(v, (int, float)) or v < 0 for v in dash)):
            raise ValueError(f"{where}.stroke.dash must be a list of nonnegative numbers")
    if fill is None and stroke is None:
        raise ValueError(f"{where} needs a fill color, a stroke, or both")
    if any(not s["closed"] for s in subpaths) and fill is not None:
        raise ValueError(f"{where} has an open subpath; open paths are stroke-only (fill must be null)")
    x0, y0, x1, y1 = bezier_bounds(subpaths)
    pad = (stroke["width"] / 2.0) if stroke else 0.0
    layer.setdefault("box", [x0 - pad, y0 - pad, max(0.01, x1 - x0 + 2 * pad), max(0.01, y1 - y0 + 2 * pad)])


def text(layer, where):
    if not isinstance(layer.get("text"), str) or not layer["text"]:
        raise ValueError(f"{where}.text is required")
    if not isinstance(layer.get("font"), str) or not layer["font"]:
        raise ValueError(f"{where}.font PostScript name is required")
    color(layer.get("color", ""), f"{where}.color")
    for field in ("font_size_px", "leading_px"):
        number(layer, field, where, 0.01)
    number(layer, "tracking", where, -1000, 10000)
    number(layer, "rotation", where, -360, 360)
    number(layer, "horizontal_scale", where, 1, 1000)
    number(layer, "vertical_scale", where, 1, 1000)
    number(layer, "baseline_shift_px", where)
    if layer.get("align", "left") not in ("left", "center", "right"):
        raise ValueError(f"{where}.align must be left, center or right")
    if layer.get("anti_alias", "sharp") not in ("none", "sharp", "crisp", "strong", "smooth"):
        raise ValueError(f"{where}.anti_alias must be none, sharp, crisp, strong or smooth")
    if "fit_text_box" in layer:
        if not isinstance(layer["fit_text_box"], bool):
            raise ValueError(f"{where}.fit_text_box must be boolean")
        if layer["fit_text_box"] and (layer.get("on_circle") or "\n" in layer["text"] or "\r" in layer["text"] or layer.get("rotation", 0)):
            raise ValueError(f"{where}.fit_text_box supports unrotated, single-line point text only")
    if "character_styles" in layer:
        runs = layer["character_styles"]
        if not isinstance(runs, list):
            raise ValueError(f"{where}.character_styles must be an array")
        if layer.get("fit_text_box"):
            raise ValueError(f"{where}: fit_text_box would overwrite character-level scales")
        length = len(layer["text"].encode("utf-16-le")) // 2
        boundaries = {0}
        unit = 0
        for character in layer["text"]:
            unit += len(character.encode("utf-16-le")) // 2
            boundaries.add(unit)
        end = 0
        for run in runs:
            if not isinstance(run, dict) or type(run.get("from")) is not int or type(run.get("to")) is not int:
                raise ValueError(f"{where}: character style range needs integer from/to")
            if not end <= run["from"] < run["to"] <= length:
                raise ValueError(f"{where}: character styles must be sorted, nonoverlapping UTF-16 ranges")
            if run["from"] not in boundaries or run["to"] not in boundaries:
                raise ValueError(f"{where}: a style boundary splits a UTF-16 surrogate pair")
            if set(run) - {"from", "to", "tracking", "horizontal_scale"}:
                raise ValueError(f"{where}: only tracking and horizontal_scale can vary by character")
            number(run, "tracking", where, -1000, 10000)
            number(run, "horizontal_scale", where, 1, 1000)
            end = run["to"]
    circle = layer.get("on_circle")
    if circle is not None:
        if not isinstance(circle, dict):
            raise ValueError(f"{where}.on_circle must be an object")
        number(circle, "radius", f"{where}.on_circle", 1, required=True)
        number(circle, "start_deg", f"{where}.on_circle", -720, 720, required=True)
        if not isinstance(circle.get("center"), list) or len(circle["center"]) != 2:
            raise ValueError(f"{where}.on_circle.center must be [x,y]")
        if circle.setdefault("direction", "cw") not in ("cw", "ccw"):
            raise ValueError(f"{where}.on_circle.direction must be cw or ccw")
        if "font_size_px" not in layer:
            raise ValueError(f"{where}.font_size_px is required for on_circle text")


def normalize(spec, base):
    canvas = spec.get("canvas")
    if not isinstance(canvas, dict) or any(not isinstance(canvas.get(k), int) or canvas[k] <= 0 for k in ("width", "height")):
        raise ValueError("canvas needs positive integer width and height")
    canvas["background"] = color(canvas.setdefault("background", "FFFFFF"), "canvas.background")
    layers = spec.get("layers")
    if not isinstance(layers, list) or not layers:
        raise ValueError("layers must be a non-empty list in back-to-front order")
    if any(isinstance(layer, dict) and layer.get("type") == "color_extract" for layer in layers):
        source = Path(spec.get("source_file", ""))
        if not source.is_absolute():
            source = base / source
        source = source.resolve()
        if not source.is_file():
            raise FileNotFoundError(f"source_file for color_extract: {source}")
        spec["source_file"] = str(source)
    names = set()
    for i, layer in enumerate(layers):
        where = f"layers[{i}]"
        if not isinstance(layer, dict):
            raise ValueError(f"{where} must be an object")
        kind = layer.get("type")
        if kind not in KINDS:
            raise ValueError(f"{where}.type must be one of {sorted(KINDS)}")
        if not isinstance(layer.get("name"), str) or not layer["name"].strip():
            raise ValueError(f"{where}.name is required")
        if layer["name"] in names:
            raise ValueError(f"{where}.name duplicates an earlier layer")
        names.add(layer["name"])
        group = layer.get("group")
        if group is not None and (not isinstance(group, str) or not group.strip() or
                                  any(not part.strip() for part in group.split("/"))):
            raise ValueError(f"{where}.group must be a path such as 'Panel/Subgroup'")
        if layer.get("blend_mode", "normal") not in BLEND_MODES:
            raise ValueError(f"{where}.blend_mode must be one of {sorted(BLEND_MODES)}")
        if kind == "vector":
            vector(layer, where)
        box(layer.get("box"), f"{where}.box")
        if kind == "image":
            path = Path(layer.get("file", ""))
            if not path.is_absolute():
                path = base / path
            path = path.resolve()
            if not path.is_file():
                raise FileNotFoundError(f"{where}.file: {path}")
            layer["file"] = str(path)
            if layer.get("fit", "contain") not in ("contain", "cover"):
                raise ValueError(f"{where}.fit must be contain or cover")
            number(layer, "blur_px", where, 0)
        elif kind == "text":
            text(layer, where)
        elif kind == "shape":
            color(layer.get("color", ""), f"{where}.color")
            if layer.get("geometry", "rectangle") not in ("rectangle", "ellipse"):
                raise ValueError(f"{where}.geometry must be rectangle or ellipse")
            radius = layer.get("radius_px", 0)
            if not isinstance(radius, (int, float)) or radius < 0 or radius > min(layer["box"][2:]) / 2:
                raise ValueError(f"{where}.radius_px must fit inside the shape")
        elif kind == "gradient":
            stops = layer.get("stops")
            if not isinstance(stops, list) or len(stops) < 2:
                raise ValueError(f"{where}.stops needs at least two stops")
            previous = -1
            for stop in stops:
                if not isinstance(stop, list) or len(stop) != 3 or not 0 <= stop[0] <= 1 or not 0 <= stop[2] <= 1 or stop[0] < previous:
                    raise ValueError(f"{where}.stops must be sorted [position, hex, opacity] values")
                color(stop[1], f"{where}.stop color")
                previous = stop[0]
        elif kind == "polygon":
            color(layer.get("color", ""), f"{where}.color")
            points = layer.get("points")
            if not isinstance(points, list) or len(points) < 3 or any(
                not isinstance(point, list) or len(point) != 2 or
                any(not isinstance(v, (int, float)) for v in point)
                for point in points
            ):
                raise ValueError(f"{where}.points needs at least three [x,y] pairs")
        elif kind == "bezier_fill":
            color(layer.get("color", ""), f"{where}.color")
            points = layer.get("points")
            if not isinstance(points, list) or len(points) < 3:
                raise ValueError(f"{where}.points needs at least three points")
            layer["points"] = [normalize_point(p, f"{where}.points[{j}]") for j, p in enumerate(points)]
        elif kind == "color_extract":
            color(layer.get("color", ""), f"{where}.color")
            fuzz = layer.get("fuzziness", 10)
            if not isinstance(fuzz, int) or not 0 <= fuzz <= 200:
                raise ValueError(f"{where}.fuzziness must be an integer 0–200")
        effects = layer.get("effects", {})
        if not isinstance(effects, dict):
            raise ValueError(f"{where}.effects must be an object")
        if "gradient_overlay" in effects:
            g = effects["gradient_overlay"]
            if not isinstance(g, dict) or not isinstance(g.get("stops"), list) or len(g["stops"]) < 2:
                raise ValueError(f"{where}.effects.gradient_overlay requires at least two stops")
            prior = -1
            for stop in g["stops"]:
                if not isinstance(stop, list) or len(stop) != 3:
                    raise ValueError("Gradient stops must be [position, color, opacity]")
                pos, col, opacity = stop
                if not isinstance(pos, (int, float)) or not prior <= pos <= 1 or pos < 0:
                    raise ValueError("Gradient positions must be finite, sorted and within 0..1")
                if not isinstance(opacity, (int, float)) or not 0 <= opacity <= 1:
                    raise ValueError("Gradient opacity must be within 0..1")
                color(col, where + ".effects.gradient_overlay.color")
                prior = pos
            import math
            if not isinstance(g.get("angle", -90), (int, float)) or not math.isfinite(g.get("angle", -90)):
                raise ValueError("Gradient angle must be finite")
        for effect in ("shadow", "stroke", "glow", "color_overlay"):
            if effect in effects:
                value = effects[effect]
                if not isinstance(value, dict):
                    raise ValueError(f"{where}.effects.{effect} must be an object")
                color(value.get("color", ""), f"{where}.effects.{effect}.color")
                fields = ("opacity", "angle", "distance", "size") if effect == "shadow" else (("opacity", "size") if effect in ("stroke", "glow") else ("opacity",))
                for field in fields:
                    if not isinstance(value.get(field), (int, float)):
                        raise ValueError(f"{where}.effects.{effect}.{field} must be a number")
                if not 0 <= value["opacity"] <= 100 or ("size" in value and value["size"] < 0):
                    raise ValueError(f"{where}.effects.{effect} opacity/size is out of range")
                if effect == "shadow" and "knockout" in value and not isinstance(value["knockout"], bool):
                    raise ValueError("Shadow knockout must be boolean")
                if effect == "shadow" and (value["distance"] < 0 or not 0 <= value.get("spread", 0) <= 100):
                    raise ValueError(f"{where}.effects.shadow distance/spread is out of range")
        if "mask_from_alpha" in layer and (kind != "image" or not isinstance(layer["mask_from_alpha"], bool)):
            raise ValueError(f"{where}.mask_from_alpha is only a boolean image option")
        if "mask_feather_px" in layer:
            if kind != "image" or not (layer.get("mask_from_alpha") or layer.get("mask_file")):
                raise ValueError(f"{where}: mask_feather_px requires an image with a native mask")
            number(layer, "mask_feather_px", where, 0, 1000)
        if layer.get("mask_from_alpha") or "mask_file" in layer:
            from PIL import Image, ImageChops
            if kind != "image":
                raise ValueError(f"{where}.mask_file is only an image option")
            with Image.open(layer["file"]) as asset:
                alpha = asset.convert("RGBA").getchannel("A")
                histogram = alpha.histogram()
            if layer.get("mask_from_alpha") and sum(histogram[1:255]):
                raise ValueError(f"{where}: mask_from_alpha would square soft alpha. Keep embedded alpha without this option, or supply opaque RGB plus a separate full-canvas mask_file.")
            if "mask_file" in layer:
                if layer.get("mask_from_alpha"):
                    raise ValueError(f"{where}: mask_file and mask_from_alpha are mutually exclusive")
                if alpha.getextrema() != (255, 255):
                    raise ValueError(f"{where}: mask_file requires an opaque asset; separate alpha first to avoid double masking")
                mask = (base / layer["mask_file"]).resolve()
                with Image.open(mask) as image:
                    if image.mode != "RGB" or image.size != (canvas["width"], canvas["height"]):
                        raise ValueError(f"{where}: mask_file must be RGB PNG at canvas size with equal R/G/B values")
                    red, green, blue = image.split()
                    if ImageChops.difference(red, green).getbbox() or ImageChops.difference(red, blue).getbbox():
                        raise ValueError(f"{where}: mask_file channels must be identical")
                layer["mask_file"] = str(mask)

        number(layer, "opacity", where, 0, 100)
        number(layer, "fill_opacity", where, 0, 100)
    return spec


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="backslashreplace")
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--emit", type=Path, required=True)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    manifest = args.manifest.resolve()
    output = args.output.resolve()
    script = args.emit.resolve()
    spec = normalize(json.loads(manifest.read_text(encoding="utf-8")), manifest.parent)
    if (output / "editable.psd").exists() and not args.overwrite:
        raise FileExistsError("editable.psd already exists; use --overwrite only for an intended replacement")
    output.mkdir(parents=True, exist_ok=True)
    script.parent.mkdir(parents=True, exist_ok=True)
    cfg = {"output": str(output), "spec": spec, "overwrite": args.overwrite}
    core = Path(__file__).with_name("reconstruct_psd.jsx").read_text(encoding="ascii")
    script.write_text("#target photoshop\nvar CFG=" + json.dumps(cfg, ensure_ascii=True) + ";\n" + core, encoding="ascii")
    print(script)


if __name__ == "__main__":
    main()
