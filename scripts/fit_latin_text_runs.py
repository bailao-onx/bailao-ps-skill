"""Fit editable character scales/tracking to a reviewed flat uppercase word.

Requires Pillow, NumPy, SciPy, fontTools and uharfbuzz. This is not OCR or a font
identifier. Supply confirmed text, a chosen font file and a tight source crop.
It rejects merged/missing/extra glyphs rather than fabricating a match.
"""
import argparse
import hashlib
import json
from pathlib import Path


def main():
    import numpy as np
    from PIL import Image
    from scipy import ndimage
    from fontTools.ttLib import TTFont
    from fontTools.pens.boundsPen import BoundsPen
    import uharfbuzz as hb
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source', type=Path, required=True)
    p.add_argument('--region', type=int, nargs=4, metavar=('X', 'Y', 'WIDTH', 'HEIGHT'), required=True)
    p.add_argument('--text', required=True)
    p.add_argument('--font-file', type=Path, required=True)
    p.add_argument('--font-index', type=int, default=0)
    p.add_argument('--font-name', required=True, help='Installed Photoshop PostScript name')
    p.add_argument('--name', default='Fitted editable word')
    p.add_argument('--ink', default='000000')
    p.add_argument('--background', required=True, help='Reviewed flat background hex color')
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    if not a.text or any(c not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' for c in a.text):
        p.error('This narrow fitter supports one uppercase ASCII/alphanumeric word without spaces')
    def rgb(s):
        if len(s) != 6:
            raise ValueError('Colors need six hex digits')
        return np.array([int(s[i:i+2], 16) for i in (0, 2, 4)], float)
    img = np.array(Image.open(a.source).convert('RGB'), float)
    x, y, w, h = a.region
    if min(x, y) < 0 or min(w, h) <= 0 or x+w > img.shape[1] or y+h > img.shape[0]:
        p.error('Region must fit inside source')
    fg, bg = rgb(a.ink), rgb(a.background)
    delta = fg-bg
    if (delta*delta).sum() < 100:
        p.error('Foreground/background contrast is too low')
    coverage = np.clip(((img[y:y+h, x:x+w]-bg)*delta).sum(2)/(delta*delta).sum(), 0, 1)
    labels, n = ndimage.label(coverage > .5)
    areas = np.bincount(labels.ravel())[1:]
    cutoff = max(20, float(np.median(areas))*0.05) if n else 20
    glyphs = []
    for i, area in enumerate(areas, 1):
        if area < cutoff:
            continue
        yy, xx = np.where(labels == i)
        glyphs.append({'x0':int(xx.min()+x), 'y0':int(yy.min()+y),
                       'x1':int(xx.max()+x+1), 'y1':int(yy.max()+y+1), 'area':int(area)})
    glyphs.sort(key=lambda g:g['x0'])
    if len(glyphs) != len(a.text):
        raise ValueError(f'Expected {len(a.text)} separate glyphs, found {len(glyphs)}. Review the crop/connected letters; no plan emitted.')
    for left, right in zip(glyphs, glyphs[1:]):
        if left['x1'] > right['x0']:
            raise ValueError('Overlapping component x ranges need manual review')
    font = TTFont(a.font_file, fontNumber=a.font_index)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    def bounds(gname):
        pen = BoundsPen(gs)
        gs[gname].draw(pen)
        return pen.bounds
    if ord('H') not in cmap or any(ord(c) not in cmap for c in a.text):
        raise ValueError('Chosen font lacks required glyphs')
    hbfont = hb.Font(hb.Face(hb.Blob.from_file_path(str(a.font_file)), a.font_index))
    upem = font['head'].unitsPerEm
    hbfont.scale = (upem, upem)
    buffer = hb.Buffer(); buffer.add_str(a.text); buffer.guess_segment_properties()
    hb.shape(hbfont, buffer, {'kern':True, 'liga':False, 'clig':False})
    if len(buffer.glyph_infos) != len(a.text) or [g.cluster for g in buffer.glyph_infos] != list(range(len(a.text))):
        raise ValueError('Nontrivial shaping is outside this narrow fitter')
    flat = [g['y1']-g['y0'] for c,g in zip(a.text,glyphs) if c in 'BDEFHIKLMNPRTUZ1']
    cap = float(np.median(flat or [g['y1']-g['y0'] for g in glyphs]))
    hbbox = bounds(cmap[ord('H')]); size = cap*upem/(hbbox[3]-hbbox[1])
    order = font.getGlyphOrder()
    boxes = [bounds(order[g.codepoint]) for g in buffer.glyph_infos]
    scales = [(g['x1']-g['x0'])/((b[2]-b[0])*size/upem) for g,b in zip(glyphs,boxes)]
    runs = []
    for i,(g,b,pos) in enumerate(zip(glyphs,boxes,buffer.glyph_positions)):
        tracking = 0
        if i+1 < len(glyphs):
            advance = (pos.x_advance-b[0])*size/upem*scales[i]+boxes[i+1][0]*size/upem*scales[i+1]
            tracking = ((glyphs[i+1]['x0']-g['x0'])-advance)*1000/size
        runs.append({'from':i, 'to':i+1, 'horizontal_scale':100*scales[i], 'tracking':tracking})
    target = [glyphs[0]['x0'], min(g['y0'] for g in glyphs), glyphs[-1]['x1']-glyphs[0]['x0'], max(g['y1'] for g in glyphs)-min(g['y0'] for g in glyphs)]
    layer = {'type':'text','name':a.name,'text':a.text,'font':a.font_name,'color':a.ink,
             'font_size_px':size,'box':target,'character_styles':runs}
    report = {'source':str(a.source.resolve()),'source_region':a.region,'font_file':str(a.font_file.resolve()),
              'font_sha256':hashlib.sha256(a.font_file.read_bytes()).hexdigest(),'glyph_targets':glyphs,
              'status':'PLAN_ONLY','warning':'Glyph bounds are a fit target, not font identity or visual acceptance. Render/reopen in Photoshop and inspect.'}
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps({'layer':layer,'evidence':report},indent=2)+'\n')
    print(a.output.resolve())


if __name__ == '__main__':
    main()
