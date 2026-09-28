# Supported scope

## Environment

The workflow uses Codex with local tools and Photoshop 2026 on the same computer: AppleScript on macOS, or Photoshop COM from PowerShell on Windows. The Windows connection and PSD save/reopen/export route were checked with Windows 11, Photoshop 27.10.0 and PowerShell 7.6.5. Other versions and other agent integrations need their own checks. See [setup](installation.md) for connection commands and permission requirements.

The checked Windows operations include PSD save/reopen/export, linked masks, Smart Object replacement, live text edits, layout changes, native vector edits and the supplied blur/fade effect checks. A flattened-reference workflow was also checked: generate a missing complete asset with an available image tool, rebuild an editable PSD, reflow square and portrait layouts, and isolate selected elements. Font substitutions and generated detail can differ from the reference; this does not establish accuracy for every design.

This does not validate every helper: batch construction, photo cutouts, the bundled font helpers, and type-range and Bezier examples still need Windows-specific checks.

The optional Vision OCR helper and `fetch_google_font.py --install` are macOS-only. On Windows, use an available OCR tool and install licensed fonts through the normal Windows font installer. The font download helper can save files without `--install`.

## Design work

- Rebuild the independently editable parts of an AI image or reference.
- Reuse existing PSD layers, rearrange layouts and adapt dimensions.
- Update live text, spacing, shapes and supported effects.
- Prepare selected elements; use available image tools for missing assets when needed.
- Save a layered PSD and export a checked preview.

These tasks are guided by Codex. The manifest builder executes a reviewed layer plan; it does not automatically detect objects, identify fonts or prepare clean assets.

## Editable components

Live type, native vector shapes, groups, embedded Smart Objects, masks and supported layer effects can remain editable. See the [manifest reference](../references/manifest-runner.md) for exact fields. Older polygon and Bezier-fill modes retain paths but use raster fills; use `vector` for natively editable contours.

Photographic detail and generated materials may remain raster content. Outlined lettering is not live text. Glass can retain baked reflections and transmission. Occluded content must be inferred or rebuilt, not recovered from original hidden layers.

## Review the result

Check the reopened PSD, exact copy, layout, visible differences and promised editing operations. Repositioning an object can require repairing its old background; a new light setup can require relighting. Complex designs may need several revisions. No universal similarity score or turnaround time is promised.

The [quality protocol](../references/quality-protocol.md) describes practical delivery checks. Synthetic examples are provided to check selected operations in your own environment; they do not establish quality for every design.
