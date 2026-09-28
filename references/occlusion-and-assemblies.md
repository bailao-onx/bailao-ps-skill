# Occlusion and editable assemblies

Read this before rebuilding overlapping people, tools, lattice structures, products with shadows, or any object crossing several depth planes.

## Establish the depth order

For each overlap, record `front object > rear object` and the contact point. Inspect the source crop, not only the full composition. List anatomy, small attached tools, straps, cables, shadows and support hardware. A hand behind a beam still belongs to the person. A tool held by a hand needs a clean tool below a separate glove occlusion layer. A lattice needs its actual front and side faces, connecting struts and supports.

When one object alternates in front of and behind another, one flat layer order cannot represent it. Split that object into depth parts, keep their common semantic identity, and use an assembly group or linked parts. Example:

```
Equipment and truss assembly
  Front truss face and visible surface
  Foreground cables / contact hardware (as observed)
  Equipment housing
  Rear truss face / inferred hidden geometry
```

Do not assume this exact stack for another image: derive it from that source. Internal members remain separately editable. Grouping objects together alone does not repair missing pixels. A combined assembly move does not prove its subobjects can move independently.

## Recover the hidden portions

1. Trace visible silhouettes and holes using the highest-resolution permitted reference. Normalize all coordinates to the output canvas once.
2. Trace dark members too. Color selection is an aid, not the definition of the object. Pale beam gaps can be occupied by brown supports and dark cables; inventory those before filling gaps.
3. Continue straight rails and planar edges from visible anchors. Keep inferred segments on named native shape layers. Where texture or anatomy is uncertain, obtain a local generated asset or repair a separate source asset, then align its landmarks and finish it in Photoshop.
4. Place hidden repairs behind their occluder. Do not paint a connecting segment over a housing just to make the mask continuous. Preserve visible reference geometry.
5. Repair the receiving surface independently. A crop containing part of the old foreground object is not a clean movable asset. Retain uncertainty notes for unseen anatomy/material rather than claiming exact recovery.
6. For source-material cutouts, preserve a separate native contour or mask. Surface extraction may retain correct texture but must exclude adjacent objects. Thin cords require measured centerlines and widths: a small offset can extract background instead of the cord.

## Verify both appearance and editing

Save, close the task-owned working copy, reopen the exact PSD and export a new preview. Inspect original placement first, including contact edges at 100–200% and the full composition at intended size.

Use `verify_group_editability.py` (see [manifest runner](manifest-runner.md)) to hide and translate the complete assembly. Inspect **both** saved hidden and moved previews. Missing attachments, floating repairs, cut-off receiving surfaces and background residue are failures even if the script returns success. Restore and compare pixels.

Then test any subobject promised to be independently movable or replaceable. Hide the occluder to expose hidden repairs; move the rear object while leaving the occluder fixed. If only the whole assembly works, explicitly state that narrower editability scope and continue repair when independent editing is required. Do not silently substitute an assembly test for it.

Keep these distinct in the review:
- Visual agreement with the source and user review.
- Layer/Smart Object/text/effect editability.
- Tested operation and exposed hidden surfaces.
- Inferred or still-unreconstructed areas.

A zero-pixel restoration proves reversibility only. It does not prove correct anatomy, complete structure or faithful design.

## Photoshop implementation notes

Set `app.activeDocument` explicitly before selecting or mutating layers. Use Action Manager layer IDs when selections span multiple nested groups. Reacquire DOM layer references after structural edits and verify actual parent membership; a repair named as part of an assembly can still end up outside it.

On the tested Photoshop host, wrapping selected groups worked with `make` (`Mk  `), class `layerSection`, and `From` a target-layer reference; a bare `groupLayersEvent` was unavailable. Inspect the result instead of repeatedly issuing the unavailable command. These are host-tested techniques, not a guarantee for every Photoshop version.

Before delivery, enumerate the assembly and compare membership with the source inventory. Hide it once more: a lone rail, shadow or tether remaining in the scene means the grouping is incomplete.

### Silhouettes against a black frame
Do not replace heads, hair, hats or shoulders with generic ellipses. Trace the source outer contour and preserve internal negative spaces as subtractive paths. Keep subtle clothing/hair highlights separate from the native silhouette. If a dark figure silhouette merges into a dark window frame, connected-component extraction also captures the frame: infer a clean hidden body boundary instead of retaining that wedge. A missing arm opening may be caused by a foreground frame even when the silhouette mask has the correct hole. Check both layers. When fitting a window ellipse, exclude canvas-clipped edges; those straight image borders are not points on the ellipse. Refit the rim together with the aperture, then inspect person and frame independently.

### Extend receiving surfaces before movement checks
After changing a frame or aperture, recheck the clean background coverage against its complete bounds. A plate that covered the old aperture can leave a thin blank strip under the new one. Extend the independent background material, then hide foreground objects to inspect it. Continue off-frame bodies on explicitly inferred native layers; do not copy the black frame or typography into a person cutout. Verify these continuations do not change visible anatomy in the original placement.


### Visibility and analysis boundaries

After selecting insertion anchors and creating replacements, explicitly set obsolete-layer visibility and check the saved result. An analysis crop is a measurement window, not an object boundary. Inspect the full source for continuation; extend a coherent inferred contour behind the actual occluder and verify the requested movement range.

### Coherent hidden geometry

Keep source-material masks and native backings on the same reviewed contour. Small cover patches can create artificial endpoints or seams during translation. Prefer one continuous hidden surface derived from visible tangents and curvature. Keep the measured visible segment fixed and label unseen geometry as inferred.

Do not mistake a shadow band for an exterior edge or hole. Compare both touching contours in the same source-coordinate crop and review their depth order and side thickness. Reuse shared Bezier anchors and handles where boundaries should meet; reverse incoming/outgoing handles when traversing a curve backwards. Compare the normal composite before and after hidden repairs to catch accidental changes to visible geometry.

### Clean material masks

Recheck geometry against source pixels before using it to extract material. An approximate plane can include background or nearby hardware. Restrict material to verified clean interiors or reconstruct it independently. Feather inside a clean margin while preserving the object's silhouette on its native backing. Inspect for hard stripes, contamination and seams in the reopened composite.

Probe every distinct occluder. Hiding one foreground object may expose a connector defect that moving another does not reveal. Record visible changes separately from inferred continuation.

### Ownership and scene stacking

Inventory what a held item carries, as well as the item itself. Group lettering with its supporting card and preserve the hidden state of alternative editable text. Verify that hiding/moving the group leaves no orphan details.

Inspect parent-group stacking before redrawing missing details. A correct path can be hidden by another group; a decorative banner can unintentionally clip feet. Grouping an actor can also lift a tool over a label. Compare the unchanged composite after regrouping, then perform movement checks. Scene overlap and group ownership are separate requirements.

### Crowds and replaceable planar assets

A thresholded crowd selection contains visible fragments, not necessarily complete people. Inspect each intended movable unit, repair hidden geometry and preserve depth/opacity variation. Call overlapping units clusters when appropriate.

For replaceable planar material, use an opaque embedded rectangle beneath a separate native silhouette mask. Test an actual contents replacement: alpha baked into the original source can disappear with replacement. Do not apply soft opacity twice.

### Frame connections and negative space

List shared junctions, rails, diagonals and vertical posts before building a frame. Compare each connection with the source; a plausible outer silhouette can still omit braces.

Use subtractive native subpaths or real masks for holes, not background-colored fills. Move the object over a contrasting receiving region and check that the underlying scene is visible through the hole. Keep foreground occluders independent.

### Clipped textures

Place each texture explicitly inside its owning assembly, above the correct base layer, and inspect clipping and mask state after saving/reopening. Hide and translate the group to verify that texture and details follow together. A full-canvas texture can inflate raw group bounds; use visible content when judging layout.

### Local generated repairs and split limbs

Compare a generated repair with the original isolated actor. Local generation can alter texture beyond the requested area. Preserve original pixels outside a restricted repair mask, keep foreground limbs on their correct depth planes, and verify coordinated movement of split parts. Align face and contact landmarks rather than raw bounds, which may include transparent margins.

Check candidate repairs on light and dark opaque backgrounds. Transparent viewers can display hidden RGB unexpectedly; inspect alpha and actual Photoshop composites before diagnosing visible corruption. A saved component or unchanged hidden RGB does not establish complete assembly editability.
