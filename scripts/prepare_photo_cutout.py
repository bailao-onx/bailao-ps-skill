"""Emit a Photoshop-only cutout/occlusion-repair job from a reviewed polygon plan.

This does not discover outlines or prove clean matting. Inspect every result.
Requires Pillow for source preflight; actual pixel operations run in Photoshop.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image


def polygon(value, field):
    if not isinstance(value, list) or len(value) < 3:
        raise ValueError(f'{field} needs at least three [x,y] points')
    for pair in value:
        if not isinstance(pair, list) or len(pair) != 2 or any(type(v) not in (int, float) or not math.isfinite(v) for v in pair):
            raise ValueError(f'{field} contains an invalid point')
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--emit', required=True, type=Path)
    a = parser.parse_args()
    plan = json.loads(a.manifest.read_text(encoding='utf-8'))
    source = (a.manifest.resolve().parent / plan['source']).resolve()
    with Image.open(source) as im:
        if im.format not in ('PNG', 'JPEG') or im.mode not in ('RGB', 'RGBA'):
            raise ValueError('Use an opaque RGB/RGBA PNG or JPEG of the flattened reference')
        if im.convert('RGBA').getchannel('A').getextrema() != (255, 255):
            raise ValueError('Source must be opaque; use separate_alpha.py for an existing RGBA cutout')
        width, height = im.size
    crop = plan['crop']
    if not isinstance(crop, list) or len(crop) != 4 or any(type(v) is not int for v in crop):
        raise ValueError('crop must contain four integer values: x,y,width,height')
    x, y, w, h = crop
    if min(x, y) < 0 or min(w, h) < 1 or x+w > width or y+h > height:
        raise ValueError('crop must fit inside the source')
    outline = polygon(plan['outline'], 'outline')
    repairs = plan.get('occlusions', [])
    if not isinstance(repairs, list):
        raise ValueError('occlusions must be a list of polygons')
    for i, points in enumerate(repairs):
        polygon(points, f'occlusions[{i}]')
    for key, default in [('feather_px', 0.5), ('occlusion_expand_px', 0)]:
        value = plan.setdefault(key, default)
        if type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= 250:
            raise ValueError(f'{key} must be finite and between 0 and 250 pixels')
    extend = plan.setdefault('extend_edge_colors', bool(repairs))
    if type(extend) is not bool:
        raise ValueError('extend_edge_colors must be boolean')
    output = a.output.resolve()
    if output.exists() and any(output.iterdir()):
        raise FileExistsError('Use a new, empty output directory')
    cfg = dict(plan, source=str(source), output=str(output), source_size=[width,height])
    cfg['points'] = [[px-x,py-y] for px,py in outline]
    cfg['repair_points'] = [[[px-x,py-y] for px,py in points] for points in repairs]
    output.mkdir(parents=True, exist_ok=True)
    record = {'status':'PLAN_ONLY', 'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
              'plan':plan, 'source_size':[width,height],
              'review_required':['Silhouette and soft-edge colors','No foreground-object remnants',
                                 'Hidden-material and off-canvas uncertainty','Move/replace in the assembled PSD']}
    (output/'plan-record.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
    core = Path(__file__).with_suffix('.jsx').read_text(encoding='ascii')
    a.emit.parent.mkdir(parents=True, exist_ok=True)
    a.emit.write_text('#target photoshop\nvar CUTOUT_CFG='+json.dumps(cfg,ensure_ascii=True)+';\n'+core,encoding='ascii')
    print(a.emit.resolve())


if __name__ == '__main__':
    main()
