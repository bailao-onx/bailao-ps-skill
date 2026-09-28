# Manifest runner

Use this only after the source has been inspected and the clean assets, text, bounds, depth order, and effects have been reviewed. The manifest is a production plan, not a detector. See `../examples/smoke/manifest.json` for an owned, simple fixture.

## Commands

From the skill folder:

```sh
python3 scripts/reconstruct_psd.py --manifest /absolute/job/manifest.json --output /absolute/job/output --emit /absolute/job/run.jsx
```

On macOS, execute the generated script directly (substitute the installed Photoshop application name and absolute script path):

```sh
osascript -e 'with timeout of 600 seconds' -e 'tell application "Adobe Photoshop 2026" to do javascript file (POSIX file "/absolute/job/run.jsx")' -e 'end timeout'
```

On Windows, use PowerShell with the registered Photoshop COM interface in an authorized user session:

```powershell
$ErrorActionPreference = 'Stop'
$photoshop = New-Object -ComObject Photoshop.Application
$photoshop.DoJavaScriptFile('C:\ps-job\run.jsx')
```

Use your actual absolute path. See [connection setup](../docs/installation.md) if the local execution environment cannot reach Photoshop.

Alternatively use Photoshop **File > Scripts > Browse…**. Only one Photoshop task may execute at a time. Inspect `output/build-log.txt` after execution; an automation return code alone does not establish success. If the automation times out, inspect the log and output files before retrying. The log is appended, so use a fresh output directory for each attempt and inspect the last terminal status. The script creates `editable.psd`, reopens it, tests/restores each live text layer, writes `layers.txt`, and exports `preview.png` from the reopened file. A `SUCCESS` line and the expected files are necessary, but visual review is still required. Re-run to a new output directory for each iteration. `--overwrite` deliberately replaces an existing PSD.

For a diagnostic pixel comparison, install Pillow, NumPy and SciPy and run:

```sh
python3 scripts/compare_previews.py --source /absolute/job/source.png --preview /absolute/job/output/preview.png --output /absolute/job/output
```

## Manifest format

UTF-8 JSON. `canvas` requires positive integer `width`, `height`, and optional six-digit hex `background`. `layers` must be a nonempty array ordered **back to front**. Every layer has a unique descriptive `name`, `type`, and `box: [x,y,width,height]` in source-image pixels. For images, the box targets the **visible alpha bounds** of the asset, not the complete file canvas. Negative x/y is allowed for off-canvas objects. Do not stretch an asset to force a match: the runner scales uniformly.

| Type | Required | Optional and behaviour |
| --- | --- | --- |
| `image` | `file`, `box` | Relative `file` resolves beside the manifest. `fit`: `contain` (default) or `cover`; `mask_file`: full-canvas RGB grayscale PNG transferred to a native user mask; `mask_from_alpha`: binary alpha only (soft alpha is rejected to avoid multiplying it twice); `mask_feather_px`: non-destructive native mask feather (requires a user mask); `blur_px`: Smart Filter Gaussian blur; `opacity` 0–100. The placed asset is an embedded Smart Object. |
| `text` | `text`, Photoshop PostScript `font`, hex `color`, `box` | `font_size_px`, `tracking`, `leading_px`, `opacity`. OCR output needs visual correction before use. |
| `shape` | hex `color`, `box` | `geometry`: `rectangle` or `ellipse`; `radius_px` for rounded rectangles; `opacity`. Native solid-color shape. For hollow symbols, set `fill_opacity: 0` plus an `effects.stroke`. |
| `gradient` | `box`, `stops` | Stops are sorted `[position 0–1, hex color, opacity 0–1]`; optional `angle` in degrees. Native Gradient Overlay on a shape. |
| `polygon` | `points` as image-space `[x,y]`, hex `color`, `box` | `opacity`. Raster fill on its own layer plus a named path kept in the PSD. It is **not** a native vector shape. |
| `bezier_fill` | `points` with image-space `{ "anchor": [x,y], "in": [x,y], "out": [x,y] }`, hex `color`, `box` | Closed Bézier path filled on its own raster layer; the named path is kept for manual editing. `in` approaches this anchor from the previous point, `out` leaves it toward the next point. Omit a handle to use its anchor. The fill does **not** update automatically when the path is edited. See `../examples/bezier/manifest.json`. |
| `color_extract` | top-level `source_file`, target hex `color`, source-coordinate `box` | Photoshop Color Range extracts matching pixels from a local flattened copy of the reference inside the box. Optional `fuzziness` 0–200, default 10. It creates an independent raster layer, **not** native text or vector geometry. The source is never included as a full-canvas output layer. Verify halos and overlapping same-color regions manually. |

Any layer can have `effects.shadow`, `effects.stroke`, `effects.glow`, or `effects.color_overlay`, each with a hex `color`. `shadow` also needs `opacity` (percent), `angle`, `distance`, and `size`, with optional `spread`. `stroke` and `glow` need `size` and `opacity`; `color_overlay` needs `opacity`. Use tested numeric values and inspect Photoshop's result. For irregular contact shadows, prepare a separate transparent asset instead of forcing a generic shadow style.

Multiline `text` uses JSON `\n`; the JSX runner converts it to Photoshop paragraph breaks and checks the exact copy after reopening. `fill_opacity` changes the layer fill without hiding its layer style, unlike overall `opacity`.

## Known boundaries

This runner does not find elements, erase baked-in lettering, infer exact fonts, segment hair/glass, reconstruct clipped artwork, apply perspective transforms, build adjustable color grades, or guarantee any visual similarity. It supports one focus radius per placed image. Focal-plane transitions, physical translucency, automatic mask discovery, and difficult compositing need manual Photoshop finishing or a new documented and tested operation. If a needed effect is unavailable, record the gap instead of quietly flattening it into a background image.

The Bézier fixture was tested in Photoshop: an initial handle mapping produced self-crossing petals; after swapping the JSX handle assignment, the reopened preview showed the intended smooth oval and `layers.txt` listed both retained paths. This confirms the path plumbing and saved-file roundtrip, not faithful tracing of a real character.


## Native vectors and circular text (v2)

`vector` creates a native solid-fill layer with an editable vector mask. Prefer it over raster `polygon` / `bezier_fill` for graphic contours. Supply `fill` as a hex color or null, and/or `stroke` with `color`, `width` in pixels, optional `align` (center/inside/outside), `cap` (butt/round/square), `join` (miter/round/bevel), and `dash` lengths **in pixels**. Round caps extend into gaps; a gap shorter than the line width can look solid.

Provide `subpaths`, each with `closed`, `op` (add/subtract/intersect/xor), and `points`. Each point is `[x,y]` or `{anchor:[x,y], in:[x,y], out:[x,y]}`. The arriving handle is `in`, the departing handle is `out`. Open paths are stroke-only. Alternatively use a `primitive`: line (`from`, `to`), circle (`center`, `radius`), ellipse (`center`, `radii`, optional rotation), ring (`center`, `radius`, `inner_radius`), rect (`rect`, optional radius/rotation), or arc (`center`, `radius`, `start_deg`, `end_deg`). For vector layers the box is inferred when omitted. Angles use image coordinates: zero points right, positive rotates clockwise. Normalize arc endpoints deliberately; crossing -180/180 can accidentally create a nearly complete circle.

Primitive fields live on the layer, not in a nested primitive object. For example: `{"type":"vector","name":"Window","primitive":"ellipse","center":[100,200],"radii":[8,16],"rotation":20,"fill":"8ACDE0"}`. Supplying `"primitive":{"type":"ellipse",...}` is invalid and is rejected before Photoshop runs.

Text adds `rotation`, `align`, `horizontal_scale`, `vertical_scale`, `baseline_shift_px`, and `anti_alias`. Ordinary text is placed by its resulting visible top-left bounds; paragraph alignment does not change the box into a baseline anchor. Circular text requires `font_size_px` and `on_circle:{center:[x,y], radius:199, start_deg:90, direction:"cw"}`; radius is the **baseline**, not the outer glyph edge. Clockwise glyphs extend outside that radius. A complete stored string can still overflow the visible path: visually confirm the final words and spacing, not only the text contents. Do not change approved copy to fit; adjust measured font/size/tracking/scale.

Any layer accepts `group` as a slash-separated path and `blend_mode`. Keep each group's layers contiguous in the back-to-front manifest. Separate non-contiguous runs can create same-named groups to preserve stacking order; a single group cannot straddle another root layer.

Use `examples/native-vector/manifest.json` for a self-owned fixture covering a subtractive ring, round-cap dashes, circular live text, nested layer organization, and literal straight quotes. Use it to check save/reopen, native shape kinds, installed font identity, circular text path retention and text edit/restore in the current environment. It does not establish complex-design fidelity.

The runner temporarily disables Smart Quotes and restores the original preference in `finally`. It refuses changed text, missing layers, wrong native layer kinds, changed fonts, or lost circular paths after reopen. Reopen checks do not establish visual fidelity, successful object replacement, or semantic separation; those remain per-design checks.


### Measured text bounds

For unrotated, single-line point text only, `fit_text_box: true` adjusts native font size to the measured ink height, then native horizontal scale to the measured ink width, with up to three measured native text-layer transform corrections for DOM scale quantization, before placing the result at `box` x/y. Use this only after measuring the actual source text region and choosing a plausible licensed font. It does not identify a font and does not turn a poor glyph match into an exact match. Record the candidate font and any distortion; inspect counters, stems, and letter spacing. Circular and multiline text need their own baseline/spacing measurements and cannot use this flag.


### Separate visible strokes

For wireframes, use one native shape layer per visible curve (group curves by object). Photoshop's stroke on a compound shape follows the resulting combined contour and can omit interior lines where subpaths overlap. A successful multi-subpath shape creation does not prove that every input curve remains visible. Inspect the reopened render before merging curves as an optimization.

### Native shape edit probe

After a visible native stroked shape is built, prepare a temporary-duplicate probe:

```sh
python3 scripts/verify_shape_editability.py --psd /absolute/output/editable.psd --layer "Exact unique shape name" --output /absolute/probe-new --emit /absolute/probe.jsx
```

Run the generated JSX once in Photoshop, then:

```sh
python3 scripts/verify_shape_editability.py --check /absolute/probe-new
```

The probe opens/duplicates the PSD without saving changes to the original, moves the target, recolors its native stroke, edits one vector anchor, then restores history. Each operation must visibly change pixels only near the target, and restoration must match the baseline exactly. Inspect the saved previews as well. If a hidden/occluded target produces no visual change, the result must fail, even if Photoshop's operation returned successfully. A pass covers only that selected shape; choose representative elements for each case and test image replacement separately.


`text.character_styles` is described in the typography reference. Example: `[{"from":0,"to":1,"horizontal_scale":98.5,"tracking":-20},{"from":1,"to":2,"tracking":15}]`. Unspecified characters retain the layer style. Range-aware verification restores history and compares the complete text-style descriptor, so a successful text edit does not flatten local tracking/scales.


## Soft edges and external masks

Never load a semi-transparent asset's alpha as a mask while retaining that same
alpha inside its Smart Object. They multiply: 128/255 becomes about 64/255.
`mask_from_alpha` remains available for binary cutouts only. For an RGBA asset
that should retain its embedded alpha, simply omit that option. For a separately
editable silhouette, split a reviewed RGBA cutout first:

```sh
python3 scripts/separate_alpha.py --asset clean-cutout.png --canvas 1254 1254 --position 700 150 --out prepared-object
```

The helper writes opaque `color.png`, a full-canvas `mask.png`, `layer.json`, and
a preparation record. Keep `layer.json` file paths relative to that folder, or
resolve them when copying the layer into another manifest. It does not clean
contaminated edges, invent hidden surfaces, or resize the object. The opaque
asset's entire bounds, including transparent padding from the original, are
used for placement. Do not use its old visible-alpha bounding box.

`mask_file` requires an opaque asset and an equal-channel RGB PNG matching the
canvas size. It is positioned in document coordinates, then linked to the
Smart Object. Later moving the object moves its mask. Masks are not auto-scaled
from the image's `box`; create the correct canvas mask yourself. Replacing
contents preserves the outer silhouette, so an object with a different outline
also needs its mask changed. A blur applied to the Smart Object does not blur
this outer mask. For depth-of-field edges, prepare/refine mask softness too.

The implementation uses Photoshop Apply Image with the source **red channel**.
RGB composite/luminosity transfer can change mask values through color conversion.
Pasting from the clipboard can create a new pixel layer instead of populating
the mask. Validate numeric alpha and visible results; a successful action is
insufficient. Use the synthetic [soft-mask example](../examples/soft-mask/README.md) to check movement, replacement, inversion and restoration against known color/alpha values.

`mask_feather_px` changes the native user-mask Feather property and is checked after reopening. It controls the mask transition independently of Smart Object blur; it does not remove contaminated edge colors or recover transmission. Choose it from a native-size edge comparison.

## Semantic group and occlusion probe

Use `scripts/verify_group_editability.py --psd design.psd --group "Complete head" --dx 100 --dy -160 --output /fresh/probe --emit /fresh/probe.jsx`. Run the emitted JSX serially in Photoshop, then run `python3 scripts/verify_group_editability.py --check /fresh/probe`. Pillow and NumPy are needed for pixel checks.

The group name must uniquely identify a LayerSet. Unsaved open source documents, ambiguous names and ordinary layers are rejected. The source is duplicated, never saved over. Outputs include before/hidden/moved/restored previews, actual member inventory and bounds. Visibility is restored explicitly because restoring history did not restore a hidden group in the tested application state.

`PIXEL_CHECKS_PASSED_VISUAL_REVIEW_REQUIRED` means hide/move visibly changed pixels and restoration was exact. It is not a visual or independent-editability pass. Inspect both the moving group and exposed receiving scene. Check hidden anatomy and attachments as well as the main receiving surface, and record any gaps.


### Gradient Overlay on live type and shapes
`effects.gradient_overlay` accepts `stops: [[position, hexColor, opacity], ...]` and optional `angle` (default -90). Positions and opacity are 0..1; positions must be sorted and at least two stops are required. This is a native linear Gradient Overlay, including on live text; it is not a rasterized lettering asset. It composes with explicit shadow/stroke/glow effects. Gradient types and Blend If are not implemented.

On a disposable copy, change the gradient angle, inspect the visible change and restore it. Check font shape, other effects and unchanged layers separately.

Group probe lookup matches LayerSet objects only. A child art layer may legitimately have the same name as its group; this does not make group selection ambiguous. Two groups with the same name still require disambiguation. Each execution needs a fresh output directory; do not reuse an earlier failed result directory.


### Layer-effect stroke placement
`effects.stroke` currently creates an outside layer-style stroke. This differs from the native vector stroke settings. In Action Manager, use `style` / `frameStyle` / `outsetFrame`; `Pstn` / `FrFl` / `OutF` is not the supported descriptor for this setting. Do not infer placement from a successful script execution.

The small fixture in `assets/stroke-outside-control.json` checks visible placement: on its 120 × 80 canvas, the blue fill occupies [40,30,70,50) and the 6 px red outer stroke reaches [34,24,76,56). Render through the runner and inspect the exported preview. These half-open bounds prove this rectangle case only. For lettering, also reopen and inspect the actual `frameFX.style` descriptor and glyph edges; a stroke can close narrow counters even when its position is correct.
