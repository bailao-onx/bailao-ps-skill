# Detecting and rebuilding typography

## Read the image

On macOS, `swift scripts/ocr_macos.swift /absolute/source.png > /absolute/text.json` uses Apple's built-in Vision OCR and returns text, confidence, alternatives, and `[x,y,width,height]` in image pixels. Review every line against the image. Vision can merge Chinese characters into whole-line boxes; split into separate Photoshop type layers when visual styles differ within a line. On other hosts, use available OCR or Codex image inspection and record the same information. Never silently accept uncertain prices, claims, small labels, or logos as ordinary text.

## Find a font

For each OCR region, run `python3 scripts/font_candidates.py --image /absolute/source.png --ocr /absolute/text.json --index 0`. It renders locally installed fonts and ranks their glyph shapes against the crop. Pillow is required for this optional visual ranking; if absent, install it from the standard Python package registry or compare Photoshop's installed fonts manually. Test the top candidates in Photoshop at the actual size, tracking, weight, line breaks and effects. A high score is evidence for a close match, not proof of the original font. Log the chosen PostScript font name, source file, and any substitution.

If local fonts are visibly wrong, select an open-source family whose letterforms and language coverage fit. `python3 scripts/fetch_google_font.py --family-slug poppins --file-name Poppins-Bold.ttf --output /absolute/job/fonts` downloads the selected face and its license from the official `google/fonts` repository. Use `--install` on macOS only after choosing the face; verify Photoshop lists it before putting it into the PSD. For Windows, install the downloaded face through the normal OS font flow and refresh Photoshop. Do not fetch a proprietary font from an unofficial mirror or redistribute Adobe Fonts files. Adobe Fonts can be activated through Creative Cloud by the account holder, but the PSD recipient needs their own access to keep that type editable.

## Finish and verify

Remove old lettering from the underlying photo or recreate the clean background before placing new live type. Compare each type layer at 100% and intended viewing size. Check punctuation, glyph shape, width, baseline, tracking, leading, antialiasing, stroke, and shadow. Reopen the PSD, edit a selected type layer and restore its exact content. Preserve font files and license in the delivery only when their terms allow it.

Photoshop may automatically change a straight apostrophe to a curly apostrophe when **Use Smart Quotes** is enabled. The runner now checks exact contents immediately after text creation and again after reopening; a substituted character fails the build. Verify which mark is in the source rather than silently accepting either. If a literal straight quote is required, [Adobe's Type preference instructions](https://helpx.adobe.com/photoshop/using/editing-text.html) show where to turn off Use Smart Quotes; preserve and restore the user's original application setting when doing so.


## Measured per-character correction

When a selected font has plausible glyph shapes but uniform tracking cannot match a graphic headline, keep the entire word as live type and apply native `character_styles` to its ranges. Each range uses `from` (inclusive) and `to` (exclusive) **UTF-16 code-unit indices**, plus `horizontal_scale` and/or `tracking`. Ranges must be sorted and non-overlapping, and must not split a surrogate pair. This option cannot be combined with `fit_text_box`, which would overwrite the local scales. It does not turn a wrong typeface into the right one; compare stems, counters, terminals and spacing.

For a flat uppercase/alphanumeric word with separated glyphs, `scripts/fit_latin_text_runs.py` can prepare a measured layer plan. It needs Pillow, NumPy, SciPy, fontTools and uharfbuzz. Supply the exact confirmed text, licensed local font file, its installed Photoshop PostScript name, foreground/background colors, and a reviewed crop:

```sh
python3 scripts/fit_latin_text_runs.py --source /absolute/source.png --region 100 200 600 100 --text REALITY --font-file /absolute/font.otf --font-name FontPostScriptName --background FFFFFF --output /absolute/word-plan.json
```

`region` is x/y/width/height. Copy the returned `layer` into the reviewed manifest and retain its `evidence` record. The helper rejects merged/missing/extra glyphs and unsupported shaping; it is not OCR, font discovery, handwritten-text reconstruction, or a replacement for visual inspection. It currently accepts one uppercase ASCII/alphanumeric word without spaces. Test the resulting PSD at 100% and at viewing size.

## Preserve typography during verification

Changing the contents of an entire text layer can collapse range-specific formatting. The runner uses a disposable duplicate, captures history before a temporary edit, restores it and checks copy and style descriptors. Discard the probe without saving and reopen the unchanged saved master before final export. Identical descriptors do not guarantee identical rendering; compare freshly exported controls before attributing a difference to a particular cause.

## Font availability and licensing

A newly installed font may not immediately appear in `app.fonts`. Where available, call `app.refreshFonts()` and verify the exact PostScript name. The runner can use a disposable tiny text document when the name is absent from the list; it requires exact readback, closes the probe and restores the prior active document. A substituted font must fail the requested-name check. Availability does not establish a visual match.

Keep the chosen font's source, license and installation details with the task. Different font licenses have different redistribution and modification terms. Use unmodified files where required; do not bundle private test fonts or Adobe Fonts merely because Photoshop can use them.

## Match each text region

Compare stem weight, counters, terminals, slope, rendered case and baseline rhythm before fitting width or height. Apply changes consistently to live face and extrusion/shadow copies. Inspect microcopy for actual inter-line clearance after rendering. Circular-text boxes can enclose unrelated labels, so box intersections alone do not prove glyph collisions.

Measure rotated text after its transform. Planned dimensions do not guarantee rendered bounds; check the first/last glyphs, intended off-canvas clipping and surrounding clearances. Include descenders, accents and antialiasing in measured text bounds. Fitting full text into cap-height bounds distorts the type.

Keep font decisions regional: a candidate that improves one headline may worsen a larger or rotated word. Preserve a baseline and compare exact source copy instead of accepting a family from its marketing specimen alone. For handwritten substitutes, literal mixed-case contents can still render with uppercase-like glyphs.

## Variable fonts and candidate coverage

`scripts/font_candidates.py` tests default faces and is not a complete variable-font search. When manually testing axes, record actual weight/width/optical-size coordinates and deduplicate identical instances. The file scanner cannot inspect inaccessible font files, including some managed fonts; do not claim every Photoshop font was searched.

Inspect the ranking mask itself. A background-distance selection can mix fill, outline and scenery, ranking the wrong silhouette. Compare fill and outline separately when possible. Use distinctive glyph anatomy to narrow the search, then inspect the actual Photoshop render; a high score is only a candidate ranking.

## Bounded native font comparison

`scripts/render_font_candidates.jsx` accepts `PSC_FONT_CFG` with `psd`, a fresh `output` directory, exact live-text `layer` name, 1–12 installed PostScript names in `candidates`, and optional `crop` as `[left, top, right, bottom]` pixels. Define the configuration and evaluate the script in Photoshop. It refuses an already-open source; save and close only that task-owned document first. It exports candidates from disposable duplicates, checks font assignment and closes its own documents. Original size, tracking and position are retained: compare glyph design first and perform fitting separately. Crop generously to reveal overflow.

Create `CANCEL` in the output directory to stop between host operations. This cannot interrupt a currently executing Photoshop operation. Inspect `status.txt` and output files before retrying after a caller timeout. Candidate numbers follow the supplied array order. Verify source preservation and inspect each candidate against the reference.

## Stroke placement and per-character spacing

An inside stroke can consume letter fill; an outside stroke can expand the silhouette and round corners. Inspect placement before treating the mismatch as a font problem.

For point text whose glyph widths are already fitted, remeasure adjacent start advances after horizontal scaling. A useful tracking correction is `advance_error_px * 1000 / (font_size_px * horizontal_scale / 100)` on the preceding character. Verify the actual descriptor and render; this is a fitting aid, not a guarantee for contextual shaping, kerning or arbitrary transforms. Prefer native range formatting to splitting a word into separate layers when whole-word editing is required.

## Check what a PDF font belongs to

A poster in a PDF may be a raster image while only its footer uses embedded fonts. Inspect extractable text and image placement before assigning the PDF's listed fonts to the poster title. Designer credits establish authorship, not a font family or its license.

## Custom lettering when no font matches

First look for an authorized clean logo/vector source rather than tracing a small mockup. Preserve the poster as the layout target and record the secondary asset's provenance.

A constrained Photoshop Color Range selection can become a Work Path and native solid-fill shape. Keep separate wordmarks separate and label a hidden live-type alternative as approximate. Outlined letters cannot be edited by typing. Inspect complete strokes, counters, terminals, nearby contamination and source shading before adopting them.

Increasing fuzziness or path density can preserve stair steps while adding unwanted fragments. Limited selection smoothing may help, but scale all values to the source and recheck thin strokes and holes. Use continuous reviewed curves when tracing remains broken. Restrict each selection to its own word before fitting.

For double-edged lettering, retain separate body, band and rim paths. Recreate the source selection before each expansion because Work Path conversion may clear it. Verify band continuity and isolated speckles after reopening. Editable contours and live text are different deliverables.
