"""Expand manifest v2 vector primitives into explicit Bezier subpaths.

Every expanded point is {"anchor": [x, y], "in": [x, y], "out": [x, y]} in image pixels.
"in" is the handle arriving from the previous point; "out" leaves toward the next point.
Angles use image space: 0 degrees = +x, positive = clockwise on screen (y points down).
"""

import math

KAPPA = 0.5522847498307936


def _pt(anchor, handle_in=None, handle_out=None):
    anchor = [float(anchor[0]), float(anchor[1])]
    return {"anchor": anchor,
            "in": [float(v) for v in (handle_in or anchor)],
            "out": [float(v) for v in (handle_out or anchor)]}


def normalize_point(point, where):
    if isinstance(point, (list, tuple)):
        if len(point) != 2 or any(not isinstance(v, (int, float)) for v in point):
            raise ValueError(f"{where} must be [x,y] or {{anchor,in,out}}")
        return _pt(point)
    if isinstance(point, dict) and isinstance(point.get("anchor"), (list, tuple)):
        for field in ("anchor", "in", "out"):
            value = point.get(field)
            if value is not None and (not isinstance(value, (list, tuple)) or len(value) != 2 or
                                      any(not isinstance(v, (int, float)) for v in value)):
                raise ValueError(f"{where}.{field} must be [x,y]")
        return _pt(point["anchor"], point.get("in"), point.get("out"))
    raise ValueError(f"{where} must be [x,y] or {{anchor,in,out}}")


def _rotate(p, center, degrees):
    if not degrees:
        return p
    a = math.radians(degrees)
    c, s = math.cos(a), math.sin(a)
    x, y = p[0] - center[0], p[1] - center[1]
    return [center[0] + x * c - y * s, center[1] + x * s + y * c]


def _rotate_point(point, center, degrees):
    return {k: _rotate(v, center, degrees) for k, v in point.items()}


def ellipse(center, rx, ry, rotation=0.0):
    cx, cy = center
    kx, ky = rx * KAPPA, ry * KAPPA
    # Clockwise on screen, starting at the top: top, right, bottom, left.
    pts = [
        _pt([cx, cy - ry], [cx - kx, cy - ry], [cx + kx, cy - ry]),
        _pt([cx + rx, cy], [cx + rx, cy - ky], [cx + rx, cy + ky]),
        _pt([cx, cy + ry], [cx + kx, cy + ry], [cx - kx, cy + ry]),
        _pt([cx - rx, cy], [cx - rx, cy + ky], [cx - rx, cy - ky]),
    ]
    return [_rotate_point(p, center, rotation) for p in pts]


def rect(x, y, w, h, radius=0.0, rotation=0.0):
    center = [x + w / 2, y + h / 2]
    r = max(0.0, min(float(radius), w / 2, h / 2))
    if r == 0:
        pts = [_pt([x, y]), _pt([x + w, y]), _pt([x + w, y + h]), _pt([x, y + h])]
    else:
        k = r * KAPPA
        pts = [
            _pt([x + r, y], [x + r - k, y], None), _pt([x + w - r, y], None, [x + w - r + k, y]),
            _pt([x + w, y + r], [x + w, y + r - k], None), _pt([x + w, y + h - r], None, [x + w, y + h - r + k]),
            _pt([x + w - r, y + h], [x + w - r + k, y + h], None), _pt([x + r, y + h], None, [x + r - k, y + h]),
            _pt([x, y + h - r], [x, y + h - r + k], None), _pt([x, y + r], None, [x, y + r - k]),
        ]
    return [_rotate_point(p, center, rotation) for p in pts]


def arc(center, radius, start_deg, end_deg, ry=None):
    """Open elliptical arc from start to end angle (clockwise when end > start)."""
    rx, ry = float(radius), float(ry if ry is not None else radius)
    sweep = end_deg - start_deg
    if sweep == 0:
        raise ValueError("arc sweep must be nonzero")
    segments = max(1, int(math.ceil(abs(sweep) / 90.0 - 1e-9)))
    step = math.radians(sweep / segments)
    t = 4.0 / 3.0 * math.tan(step / 4.0)
    cx, cy = center

    def at(a):
        return [cx + rx * math.cos(a), cy + ry * math.sin(a)]

    def tangent(a):
        return [-rx * math.sin(a), ry * math.cos(a)]

    a0 = math.radians(start_deg)
    points = []
    for i in range(segments + 1):
        a = a0 + i * step
        p, d = at(a), tangent(a)
        handle_in = [p[0] - t * d[0], p[1] - t * d[1]] if i > 0 else None
        handle_out = [p[0] + t * d[0], p[1] + t * d[1]] if i < segments else None
        points.append(_pt(p, handle_in, handle_out))
    return points


def expand_primitive(layer, where):
    kind = layer["primitive"]
    rotation = float(layer.get("rotation", 0))
    if kind == "line":
        return [{"closed": False, "op": "add", "points": [_pt(layer["from"]), _pt(layer["to"])]}]
    if kind == "polyline":
        return [{"closed": bool(layer.get("closed", False)), "op": "add",
                 "points": [normalize_point(p, f"{where}.points[{i}]") for i, p in enumerate(layer["points"])]}]
    if kind == "circle":
        r = float(layer["radius"])
        return [{"closed": True, "op": "add", "points": ellipse(layer["center"], r, r)}]
    if kind == "ring":
        outer, inner = float(layer["radius"]), float(layer["inner_radius"])
        return [{"closed": True, "op": "add", "points": ellipse(layer["center"], outer, outer)},
                {"closed": True, "op": "subtract", "points": ellipse(layer["center"], inner, inner)}]
    if kind == "ellipse":
        rx, ry = layer["radii"]
        return [{"closed": True, "op": "add", "points": ellipse(layer["center"], float(rx), float(ry), rotation)}]
    if kind == "rect":
        x, y, w, h = layer["rect"]
        return [{"closed": True, "op": "add", "points": rect(x, y, w, h, layer.get("radius", 0), rotation)}]
    if kind == "arc":
        return [{"closed": False, "op": "add",
                 "points": arc(layer["center"], layer["radius"], layer["start_deg"], layer["end_deg"], layer.get("radius_y"))}]
    raise ValueError(f"{where}.primitive must be line, polyline, circle, ring, ellipse, rect or arc")


def bezier_bounds(subpaths):
    """Tight-enough bounds: sample every cubic segment."""
    xs, ys = [], []
    for sub in subpaths:
        pts = sub["points"]
        n = len(pts)
        count = n if sub.get("closed", True) else n - 1
        for i in range(max(count, 1)):
            a, b = pts[i], pts[(i + 1) % n]
            p0, p1, p2, p3 = a["anchor"], a["out"], b["in"], b["anchor"]
            for s in range(17):
                t = s / 16.0
                mt = 1 - t
                xs.append(mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0])
                ys.append(mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1])
    return min(xs), min(ys), max(xs), max(ys)
