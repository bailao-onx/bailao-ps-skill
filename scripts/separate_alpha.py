"""Separate an RGBA asset into opaque RGB and a full-canvas native-mask input.

No resizing, edge repair, segmentation, or decontamination is performed. The
input must already be a clean cutout. Positions are integer pixel coordinates.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--asset', required=True, type=Path)
    p.add_argument('--canvas', nargs=2, type=int, required=True, metavar=('WIDTH', 'HEIGHT'))
    p.add_argument('--position', nargs=2, type=int, default=[0, 0], metavar=('X', 'Y'))
    p.add_argument('--name', default='Masked photo')
    p.add_argument('--out', type=Path, required=True)
    a = p.parse_args()
    with Image.open(a.asset) as source:
        if source.mode != 'RGBA':
            raise ValueError('Provide an 8-bit RGBA PNG with reviewed straight-alpha colors')
        image = source.copy()
        icc = source.info.get('icc_profile')
    w, h = image.size
    cw, ch = a.canvas
    x, y = a.position
    if min(cw, ch) < 1 or x < 0 or y < 0 or x + w > cw or y + h > ch:
        raise ValueError('Asset must fit inside the canvas without clipping')
    if not image.getchannel('A').getbbox():
        raise ValueError('Asset has no visible pixels')
    if a.out.exists() and any(a.out.iterdir()):
        raise FileExistsError('Use a new output directory')
    a.out.mkdir(parents=True, exist_ok=True)
    options = {'icc_profile': icc} if icc else {}
    image.convert('RGB').save(a.out / 'color.png', **options)
    mask = Image.new('L', (cw, ch), 0)
    mask.paste(image.getchannel('A'), (x, y))
    # RGB with equal channels: Photoshop imports the red channel numerically.
    mask.convert('RGB').save(a.out / 'mask.png')
    layer = {'type':'image', 'name':a.name, 'file':'color.png', 'box':[x,y,w,h], 'mask_file':'mask.png'}
    (a.out / 'layer.json').write_text(json.dumps(layer, indent=2)+'\n')
    report = {'status':'PREPARED_NOT_PHOTOSHOP_VERIFIED', 'source_sha256':hashlib.sha256(a.asset.read_bytes()).hexdigest(),
              'source_size':[w,h], 'canvas':[cw,ch], 'position':[x,y],
              'limitations':['No segmentation, hidden-surface repair, or edge decontamination was performed.',
                              'Import layer.json paths relative to this output folder. Do not add mask_from_alpha.']}
    (a.out / 'preparation.json').write_text(json.dumps(report, indent=2)+'\n')
    print(a.out / 'layer.json')


if __name__ == '__main__':
    main()
