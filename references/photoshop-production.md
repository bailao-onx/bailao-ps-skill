# Photoshop execution and verification

## Manifest and reuse

Record coordinates in one consistent pixel coordinate system. Prefer the original design dimensions with a single uniform output scale. Each element needs a stable name, group, bounds and asset or copy; text also needs the installed Photoshop font's PostScript name and color. Record literal confirmed copy separately from layer labels. A layer name is not evidence of its content or type.

Keep shared photo and brand sources outside individual ad outputs while preparing the batch, then package the required assets with the handoff. Generate photographs at sufficient resolution for the final crop. For paired before/after panels, separate the clean photos into independent files before placing them.

## JSX details that matter

- Set ruler/type units to pixels and restore them and dialog preferences in `finally`. Explicitly use an RGB document and the intended output profile.
- Create text with `LayerKind.TEXT`. Prefer explicit line breaks for faithful layouts. Measure actual bounds after assigning font and size; align by resulting bounds rather than assuming a baseline equals the visible top edge.
- Create flat rectangles, ellipses, dividers and label backgrounds as `contentLayer` / `solidColorLayer` shapes. Raster-painted rectangles are not native editable shapes.
- Place each photo independently. Scale uniformly to cover its frame, center or position according to the reference, and clip it to a separate native frame. Do not non-uniformly stretch photos.
- Place original vector artwork as embedded smart objects when appropriate. A vector smart object is distinct from a native Photoshop shape; describe it accurately. Keep editable brand text native when the source supports it.
- Export the photo-only layout background before adding typography, badges and branding. Save source photo assets too; this background does not replace them.
- Save with `PhotoshopSaveOptions.layers = true`, an embedded color profile and compatibility enabled. Export PNG directly from Photoshop. Never flatten the working master to generate a preview.
- Encode JSX source as ASCII. Use a serializer with ASCII escaping for every manifest string, including Chinese copy and paths. This avoids MacRoman decoding failures in the native script loader.
- Write per-ad stage logs and a layer inventory. Catch failures with the current stage and message; a script merely finishing is not a successful batch. Restore preferences even on failure.

Prefer the macOS AppleScript or Windows COM execution described in the manifest runner reference when available; otherwise use the supported CUA APIs to select Adobe Photoshop and navigate **File > Scripts > Browse**. Do not invent automation API methods. Keep the UI under a single owner and avoid closing unrelated user documents. Follow the user’s screen-capture and privacy preferences.

## Required evidence

For every ad, check:

1. Source and output dimensions preserve the intended aspect ratio. The visual comparison preserves composition, copy, brand, crop and hierarchy, with no leftover baked-in AI lettering.
2. Enumerated text contents match the manifest exactly, including punctuation, prices and line breaks. Fonts resolve to the intended installed names. Check small labels and mixed Chinese/English text visually.
3. Every designated text layer is `LayerKind.TEXT`; flat shapes are `LayerKind.SOLIDFILL`; every photo is an independent `LayerKind.SMARTOBJECT`. Inspect the smart object's descriptor or equivalent saved-file evidence to confirm it is embedded, not externally linked. Layer counts alone cannot prove embedding.
4. Save, close only the task-owned document and reopen the PSD from its exact path. Re-enumerate expected layers. On a disposable duplicate of the saved PSD, edit a designated text layer, read it back, restore history, and verify original copy and range styles. Discard the probe without saving. Close and reopen the unchanged saved master before export; an unchanged descriptor alone does not prove unchanged rendering. On error, discard the probe and preserve the saved master. Preserve unrelated unsaved user edits.
5. Export the final PNG after restoration. Inspect it. Compare dimensions and output appearance with the earlier preview; tiny antialiasing differences can be documented, while content or layout changes require correction.
6. Confirm all intended PSDs, previews, backgrounds and standalone assets exist and are nonempty. Inspect ZIP contents so temporary scripts, failed attempts and historical references are not accidentally presented as finals.

Keep verification records with the handoff. State evidence precisely: native text count, native shape count, independent embedded photo count, any vector smart objects, and roundtrip result. Do not say a whole batch passed because one pilot passed.

## Avoid stalled UI retries

If repeated selection attempts show no change, inspect the current file picker and focus through the available UI tools before retrying. Use current observed state for any coordinate interaction. After an interrupted session, reacquire the application binding and current UI state. After a script launch timeout, inspect its output log and saved files before attempting to launch it again; a UI timeout may occur while the script finishes successfully. Report the concrete blocker promptly and continue independent file checks or packaging preparation.


### Separate opacity from the asset only once

For soft photo cutouts, retain alpha in the embedded Smart Object **or** transfer
it to a native mask on opaque RGB. Do not use both. Verify mid-alpha pixels in an
owned gradient fixture before trusting a scene with hair, glass, or defocus.
The manifest runner's `mask_file` workflow and `separate_alpha.py` provide the
second route. Mask shape editability is not proof that the underlying asset is
clean: move it over contrasting backgrounds and replace its contents. Glass
retains reflections and transmitted background from the flattened source;
segmenting its boundary alone cannot reconstruct physical transparency.


### Uniform coordinates before serialization

Apply one scale to every anchor, handle, primitive center/radius, text box and style width. Normalize tuple/list coordinates before serialization; selectively scaling one representation can create severe path spikes. Fix the authoring transform and inspect the reopened render instead of compensating with per-layer distortion.

### Document lifecycle and scratch space

Close task-owned verification documents after export. On scratch-space errors, inventory open documents, saved state and actual backing paths. Action Manager `fileReference` can help when DOM `fullName` is misleading. Close only verified saved task-owned documents; preserve unrelated, unidentified and unsaved work. Never delete active Photoshop scratch files. Recheck free space before retrying.

Keep a current working PSD and a known-good rollback checkpoint. Save separate full PSDs for meaningful structural changes; use task-owned crops for small local experiments. Preserve required linked assets and useful comparisons. Inventory history before applying the user's retention instructions. Moving files to Trash on the same volume does not immediately free space.

### Local JSX variables and single execution

Wrap scripts in an IIFE or named function. Global names such as `fonts` may resolve to application properties; use task-specific variable names and assert candidate counts. Never launch a second Photoshop mutation while the first may still be running. A caller timeout does not prove the host stopped.

### Render controls

If a local edit changes unrelated text-edge pixels, export the unchanged saved baseline through the same route. Compare fresh controls before attributing the difference to geometry, caching or antialiasing. Keep the final preview from the freshly reopened saved master.

### Parameter selection in the host

Prefer explicit if/else branches or clearly parenthesized expressions for multi-way JSX parameter selection. Verify the actual saved filter/style values in Photoshop. Rebuild from an unfiltered base when correcting blur so another blur is not stacked on top. Do not infer behavior in every host version from a single runtime check.

### Native color-edit checks

On a disposable duplicate, verify `SOLIDFILL`, then change the native `solidColorLayer` color. Read back RGB, inspect the preview and check that changes are limited to the intended visible region. Restore history and compare to that duplicate's baseline before closing without saving. Painting over the shape or adding Color Overlay does not test its native fill editing.

### Magnify the rendered appearance

Export the reopened PSD at native size and enlarge that raster, or flatten only a disposable duplicate before crop/resize. Resizing a live layered document may alter geometry without proportionally scaling native stroke widths, producing a misleading review crop. Preserve the editable master.

Use `PSC_saveReviewCrop(doc, outputPath, [left, top, right, bottom], scale)` from the shared JSX helpers. Coordinates are source pixels. It exports a native-size temporary PNG, opens that raster, crops/resizes it, closes it and removes only its own temporary file. Validate bounds first and check source history, document count and active document after review.
