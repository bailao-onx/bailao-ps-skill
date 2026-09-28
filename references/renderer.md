# Batch renderer

Use `scripts/build_psd_batch.py` to turn reviewed JSON into an ASCII JSX script. It uses Python's standard library only; it emits files but does not launch Photoshop. Its sibling `photoshop_batch_core.jsx` is the default helper.

```sh
python3 /absolute/skill/scripts/build_psd_batch.py \
  --layouts /absolute/job/layouts --ids 1,2,3 \
  --output /absolute/job/output --scale 2 \
  --emit /absolute/job/run-batch.jsx
```

Launch the resulting JSX through native Photoshop **File > Scripts > Browse**. Check `records/build-log.txt`; `BATCH FINISHED` alone is not success. Each ad needs its own `SUCCESS` entry. Existing output PSDs are refused both during emission and during execution unless `--overwrite` was explicitly provided for an intended replacement. Font availability is checked in Photoshop before document creation.

## Layout JSON

Input filenames are `layout-01.json`, `layout-02.json`, etc. Each contains:

```json
{
  "tag": "Campaign-01",
  "width": 1080,
  "height": 1350,
  "background": "FFFFFF",
  "layers": [
    {"type":"photo","name":"Hero","file":"/absolute/clean-photo.png","box":[0,0,1080,800]},
    {"type":"text","name":"Headline","text":"Confirmed copy","font":"ArialMT","color":"000000","box":[50,850,900,70]},
    {"type":"shape","name":"Divider","color":"00878B","box":[50,950,980,3]}
  ]
}
```

`tag` defaults to `Ad-NN`. `box` is `[x,y,width,height]` in input pixels; scale uniformly multiplies the final canvas and bounds. Text boxes are visible glyph bounds: the current helper fits height and horizontal scale, so inspect distortion and prepare explicit separate lines as needed. Every layout needs at least one text layer for its edit test.

Supported layers:

- `photo`: absolute `file`; optional `crop: [left,top,right,bottom]` in normalized source coordinates, automatically saved as a separate cropped PNG before placement; optional `category: "gift"` places it in Gift photos. Each becomes a clipped independent photo smart object with native frame.
- `text`: exact `text`, required font PostScript `font`, hex `color`, optional `rotation` in degrees. All brand language/taglines must be explicit text layers too.
- `brand`: supplied clean vector `file`, placed as one embedded smart object. No brand words, colors or claims are hardcoded.
- `shape`: hex `color`, optional `ellipse: true`, `opacity` percentage. Plain shapes become native solid fills. Optional `radius` produces an SVG smart object instead; report that distinction.
- `check`: circle with `color`; needs `assets/check-white.svg` for the vector tick.
- `line`: `points: [[x,y],...]`, `width`, `color`; generated SVG smart object.
- `gradient`: `box`, `color`, `stops: [[position,opacity],...]` with values 0–1; SVG smart object.
- `icon`: `icon` one of `uv`, `sun`, `thermometer`, `phone`, plus `box`, `color`; generated SVG smart object. Use only icons appropriate to the approved design.

Shared assets must exist before emission. For `photo` or `brand`, `$filename.ext` resolves to `output/assets/filename.ext`. Place shared photos, supplied logo variants and `check-white.svg` there when used. Select the intended asset explicitly per layout. Absolute file paths also work.

Outputs are `ads/<tag>-editable.psd`, `ads/<tag>-Photoshop.png`, `assets/<tag>-background-no-text.png`, any auto crops/vectors, and `records/<tag>-layers.txt`. Layers are categorized into main photos, photo treatments, gift photos, vector graphics, editable text and brand groups. The background export excludes text and branding but includes broad shape/gradient treatments. Review its suitability for the requested photo-only background.

## Verification boundary

The helper checks text counts and a text edit/restore operation. It does not establish exact copy for every layer, photo embedding or full visual fidelity. Follow [Photoshop production checks](photoshop-production.md) for each new output. Package the verified deliverables separately from build logs and temporary files.
