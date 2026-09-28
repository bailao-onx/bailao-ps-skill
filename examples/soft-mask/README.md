# Soft-mask example

A 256 × 96 RGB swatch `(220,40,100)`, with an alpha ramp `0..255` along x, sits at `(32,40)` on a white 320 × 180 canvas. Color and alpha are separate files. This synthetic example needs no third-party artwork or fonts.

Build with `scripts/reconstruct_psd.py --manifest examples/soft-mask/manifest.json --output /fresh/output --emit /fresh/build.jsx`, then run the JSX in Photoshop.

On a disposable copy, check these operations:

1. Save and reopen; inspect the native mask and baseline preview.
2. Move the linked object and mask by `(20,15)`.
3. Replace the Smart Object contents with a same-size solid `(50,180,100)` image.
4. Invert the native mask.
5. Restore the original state and compare it with the baseline.

Compute expected 8-bit composites from these known color and alpha values. Check the actual exports, not just whether the commands finish. This example covers native mask handling; it does not verify segmentation quality or glass reconstruction.
