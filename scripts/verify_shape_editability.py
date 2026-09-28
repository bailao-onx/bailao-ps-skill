"""Prepare a reversible native-shape edit probe; check rendered evidence afterward.

This tests one selected visible vector shape, not the editability of every element.
Run generated JSX serially in Photoshop, then use --check on its output directory.
Pillow and NumPy are needed only for --check. Never modifies the source PSD on disk.
"""
import argparse
import json
from pathlib import Path
import sys


def check(root):
    import numpy as np
    from PIL import Image
    root = root.resolve()
    result = json.loads((root / 'result.json').read_text())
    if result.get('status') not in {'STRUCTURAL_CHECKS_PASSED', 'PASS'}:
        raise RuntimeError(f"Photoshop probe did not complete: {result}")
    names = ['before', 'moved', 'recolored', 'path-edited', 'restored']
    arrays = {n: np.array(Image.open(root / f'{n}.png').convert('RGBA')) for n in names}
    base = arrays['before']
    if any(a.shape != base.shape for a in arrays.values()):
        raise RuntimeError('Preview dimensions differ')
    evidence = {}
    failures = []
    b, m = result['before'], result['moved']
    x0, y0 = max(0, int(min(b[0], m[0]))-16), max(0, int(min(b[1], m[1]))-16)
    x1, y1 = min(base.shape[1], int(max(b[2], m[2]))+16), min(base.shape[0], int(max(b[3], m[3]))+16)
    prior = 'before'
    for name in names[1:-1]:
        changed = np.any(arrays[name] != arrays[prior], axis=2)
        n = int(changed.sum())
        outside = changed.copy()
        outside[y0:y1, x0:x1] = False
        ys, xs = np.where(changed)
        evidence[name] = {'changed_pixels': n, 'outside_expected_region': int(outside.sum()),
                          'change_box': [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)] if n else None}
        if not n:
            failures.append(f'{name}: no visible change (possibly hidden or occluded)')
        if outside.any():
            failures.append(f'{name}: pixels changed outside the target region')
        prior = name
    restored = int(np.any(arrays['restored'] != base, axis=2).sum())
    evidence['restored_difference_pixels'] = restored
    if restored:
        failures.append('Restored preview is not identical to baseline')
    result.update(status='FAIL' if failures else 'PASS', pixel_verification=evidence, failures=failures)
    (root / 'verification.json').write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))
    return 1 if failures else 0


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="backslashreplace")
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--check', type=Path)
    p.add_argument('--psd', type=Path)
    p.add_argument('--layer')
    p.add_argument('--output', type=Path)
    p.add_argument('--emit', type=Path)
    a = p.parse_args()
    if a.check:
        raise SystemExit(check(a.check))
    if not all([a.psd, a.layer, a.output, a.emit]):
        p.error('Preparation requires --psd, --layer, --output, and --emit')
    if not a.psd.is_file():
        raise FileNotFoundError(a.psd)
    if a.output.exists() and any(a.output.iterdir()):
        raise FileExistsError('Use a fresh probe output directory')
    a.output.mkdir(parents=True, exist_ok=True)
    a.emit.parent.mkdir(parents=True, exist_ok=True)
    scripts = Path(__file__).resolve().parent
    core = (scripts / 'reconstruct_psd.jsx').read_text(encoding='ascii')
    marker = '\n(function () {'
    if marker not in core:
        raise RuntimeError('Cannot locate shared Photoshop helper prelude')
    helpers = core.split(marker, 1)[0]
    probe = (scripts / 'shape_editability_probe.jsx').read_text(encoding='ascii')
    cfg = {'psd': str(a.psd.resolve()), 'layer': a.layer, 'output': str(a.output.resolve())}
    a.emit.write_text('#target photoshop\nvar CFG='+json.dumps(cfg, ensure_ascii=True)+';\n'+helpers+probe, encoding='ascii')
    print(a.emit.resolve())


if __name__ == '__main__':
    main()
