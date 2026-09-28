# Reviewed photographic cutouts in Photoshop

Use this only after inspecting the reference and drawing a plausible object
outline. `prepare_photo_cutout.py` emits a Photoshop JSX job. It does not find
objects, infer hidden anatomy, solve physical glass transparency, or certify
that the cutout is clean.

## Plan

Coordinates are source-image pixels. The crop is `[x,y,width,height]`; polygon
points remain in full-source coordinates. The source must be an opaque RGB or
RGBA PNG/JPEG. Keep crops inside the image. Example schema:

```json
{
  "source": "reference.png",
  "crop": [100, 200, 400, 300],
  "outline": [[140,220],[460,250],[450,460],[150,470]],
  "occlusions": [[[350,220],[480,220],[480,310],[350,310]]],
  "occlusion_expand_px": 6,
  "feather_px": 1.5,
  "extend_edge_colors": true,
  "notes": ["Upper material hidden by another object is reconstructed."]
}
```

`occlusions` is a list of unwanted foreground-object polygons. The tool unions
them, expands that union by `occlusion_expand_px`, and fills them together so
one foreground object is not sampled to repair another. `extend_edge_colors`
defaults to true when occlusions exist. It fills remaining transparent pixels
with neighboring material before applying the final soft mask. This provides
color beneath the feathered edge; it does not recover original hidden pixels.
For a clean, unobscured object, omit occlusions and leave this option false.

```sh
python3 scripts/prepare_photo_cutout.py --manifest cutout-plan.json --output /fresh/cutout-job --emit /fresh/cutout-job.jsx
```

Run that JSX in Photoshop using the manifest runner's documented execution
route. It preserves unrelated documents, duplicates the source, and restores
ruler/dialog preferences. An already-open source with unsaved edits is rejected
so a saved plan is not silently applied to unreviewed pixels. A new output
folder is required. Inspect `processing.txt`; a returned script path or an
AppleScript completion message does not prove success.

The job saves a repair PSD, reopens it, and exports `cutout.png`. Its success
status is deliberately `PREPARED_NEEDS_VISUAL_REVIEW`. The PNG is an intermediate
asset, not a completed design. Source crop size, source hash, plan and required
review items remain in `plan-record.json`.

## Review before assembly

- Inspect the cutout alone. Look for foreground-object fragments, copied texture,
  rectangular boundaries, holes, smeared details, foreign colors and matte halos.
- Inspect repaired regions especially closely. Content-Aware Fill can invent
  plausible material; it cannot verify unseen anatomy or off-canvas continuation.
- A feathered repair selection can retain fragments of the object being removed.
  Remove the unwanted material fully first. A hard-cleared edge can also stay
  visibly clipped if no color exists beneath the eventual feather. Extend clean neighboring material before the final mask and inspect the result.
- Keep inherited defocus separate from added blur. The cutout's source defocus
  remains baked in; this tool does not recover a sharp original or make that
  original focus radius adjustable. A uniform feather may be wrong for a petal
  whose near and far edges have different focus.
- Keep uncertain or rejected versions. Do not hide an incomplete repair under
  another foreground object and call its independent editability finished.

For an external native user mask on a replaceable Smart Object, run
`separate_alpha.py` on the reviewed cutout with the original crop's x/y position
and full canvas size. Import its layer plan into the reconstruction manifest.
That helper applies opacity once. Move the assembled object away from its
original overlap, inspect newly exposed regions, and restore exactly.

## Integrate the prepared asset

When merging generated `layer.json` into another manifest, rebase relative `file` and `mask_file` paths to the destination manifest directory. Preflight that manifest before executing JSX.

Small glass or water cutouts may match at the original position yet retain the wrong transmitted environment after moving. Disclose baked transmission. If a movement probe reports a bounds discrepancy, inspect transforms and mask registration rather than relaxing the tolerance to obtain a pass.

## Source texture contamination

Keep reused texture in separate embedded assets with editable masks and a complete receiving field below. Hide rebuilt foreground objects to inspect the background for source fragments. A lower pixel error or softer patch edge does not prove a clean asset. Check material continuity across patch boundaries and distinguish baked details from inferred hidden material.

Photoshop UnitValue conversion can produce microscopic floating-point differences. Compare dimensions with `1e-6` px tolerance while rejecting genuine one-pixel changes. This is a numeric preflight tolerance, not a visual quality threshold.

## Diagnose transparent margins

Generated assets can contain faint alpha outside the visible subject, inflating placement bounds. Run `python3 scripts/inspect_alpha_bounds.py /absolute/asset.png`. The read-only report includes hash, dimensions, occupied counts and bounds for alpha greater than 0, 8, 32 and 128. Bounds are left/top/right/bottom with exclusive right/bottom; fully transparent images return null. RGB inputs are rejected. Pillow is required.

Use the report to locate areas for visual inspection, not automatic cropping. Compare against light and dark receiving surfaces and preserve intentional hair, haze and shadows. If margins are confirmed artifacts, crop a task-owned copy in Photoshop, retain the original, and account for the crop offset when placing. Inspect the saved/reopened composite.

## Split and replace individual assets

Partition a transparent strip at reviewed gaps. Map cropped pieces through the original placement transform, including crop offsets and uniform scale. Separate resampling can change edge pixels even when nominal coordinates match. Call overlapping units clusters rather than complete people, and test intended independent movement.

Give each replaceable person or object its own embedded Smart Object, with scene occluders above it as needed. Test Replace Contents and inspect unchanged neighbors. Different intrinsic dimensions may require refitting position and scale; successful replacement alone does not preserve pose or bounds.

## Verify unexpected preview artifacts

Hidden RGB in a zero-alpha area can look misleading in a transparent preview. Inspect alpha and render the asset on contrasting opaque backgrounds in Photoshop before changing geometry. Judge composited pixels, not hidden RGB differences alone.
