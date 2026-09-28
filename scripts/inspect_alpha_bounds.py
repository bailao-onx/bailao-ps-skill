#!/usr/bin/env python3
"""Read-only alpha extent diagnostic; never crops or recommends deleting soft pixels."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image


def inspect(path):
    with Image.open(path) as source:
        if source.mode != 'RGBA':
            raise ValueError('Expected RGBA input; opacity must not be inferred from RGB colors')
        alpha = source.getchannel('A')
        histogram = alpha.histogram()
        rows = []
        for threshold in (0, 8, 32, 128):
            mask = alpha.point(lambda value: 255 if value > threshold else 0)
            bounds = mask.getbbox()
            rows.append({'alpha_greater_than': threshold,
                         'bounds_ltrb_exclusive': list(bounds) if bounds else None,
                         'pixel_count': sum(histogram[threshold + 1:])})
        return {'source': str(path.resolve()), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                'size': list(source.size), 'mode': source.mode, 'extents': rows,
                'interpretation': 'Compare extents with actual visual inspection. Low alpha can be real hair, haze, shadows or antialiasing. These thresholds are diagnostics, not crop boundaries or removal instructions.',
                'source_modified': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    try:
        report = inspect(args.source)
    except (OSError, ValueError) as error:
        parser.exit(2, f'{error}\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
