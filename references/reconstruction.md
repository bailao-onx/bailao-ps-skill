# Reconstructing flattened artwork

## Element inventory

Inspect the source at full resolution. List every visible object, text block, shape, and treatment with its approximate bounds and front-to-back order. Separate these cases:

- A clean photo or object that can become a replaceable Smart Object.
- A graphic with a simple path that should become a native Photoshop shape.
- Text that should be transcribed and rebuilt as live type.
- A treatment such as blur, glow, shadow, gradient, transparency, color grade, or texture that belongs on an editable layer.
- Ambiguous or concealed pixels requiring manual retouch or a new clean asset.

Look closely at occlusion. Text over a source photo cannot simply be covered with new text, because the old lettering remains underneath. A crop containing another petal, label, or background edge is not a clean object cutout. Record these defects before assembly.

## Depth and edges

Assign each object to its visible focal plane. Keep a clean base asset, apply the intended blur only once, and compare the rendered edge with the source. If an asset is already soft, do not add the full blur radius again. Preserve object proportions when placing it; reposition or recrop instead of stretching it. Use a mask to correct separation and fringe rather than accepting a rectangular crop or colored halo. For translucent material, keep refraction, transparency, and highlights in the correct visual order.

Use the original source as evidence for shape and lighting. Generated replacements are drafts: compare silhouettes, droplet placement, reflection direction, and overlap before accepting them. When exact reconstruction is impossible, label the approximation and describe the difference.

For flat illustrated characters, do not place one entire character crop and call every colored body part editable. Inventory outer ink, each colored region, facial features, and accessories. Curved outlines require editable Bézier paths or separate vector Smart Objects; the manifest runner's straight-point polygon is insufficient for smooth hand-drawn contours. Trace and inspect at 100% before considering Illustrator for a vector sub-asset. If Illustrator is used, record which parts were made there and keep separate Photoshop layers for independently changed elements.

For dense futuristic graphics, split the poster into text, rules, grids, patterns, wireframes, symbols and color blocks. Build repeatable marks as native shapes or distinct vector Smart Objects; retain exact type and spacing. OCR frequently joins microtext and mistakes decorative symbols for characters. A cropped full-poster image under new text is not a reconstruction.

## Completion check

Export from the reopened PSD. Compare the entire composition and zoom into fine edges and text. Check both visual fidelity and actual editability. A successful save or high layer count does not prove either. Note each unresolved region in the handoff; do not call a visibly different result an exact recreation.


## Check traced geometry before Photoshop

Automatic contour/primitive fitting is a proposal. Compare each fitted bounding box with its detected source component. Nearly straight noisy marks can be falsely classified as enormous circles, and curve fitting can overshoot far outside the element. Reject a primitive that expands well beyond the observed contour without source evidence; fall back to a bounded path or known geometry. Closed two-anchor cubic lenses can have real area, but closed straight two-point paths have none. Do not keep zero-area debris merely to preserve an anchor count. A render must verify topology, holes, and the visible outline before integration into a complete design.


## Occluded photographic objects

Inventory every foreground fragment inside the intended cutout. Duplicate the source, crop with room for the complete outline and constrain the remaining pixels to that object. Union unwanted foreground regions and repair them on the task-owned copy. Inspect material continuity; unrestricted filling can borrow unrelated scenery.

Record hidden texture and shape as inferred. Keep the repair PSD and alpha PNG. If using an external native mask, transfer alpha to opaque RGB once with `separate_alpha.py`. Group relevant contact light/shadow with the object, reopen, move it away from its old overlap, inspect the revealed pixels and restore.

See [reviewed photographic cutouts](photo-cutouts.md) for the tool and schema. Soft repair selections can retain foreground fragments; hard-cleared edges can lack color beneath feathering. Remove unwanted material fully, extend clean edge color when appropriate and inspect halos on contrasting backgrounds. These operations do not recover original hidden anatomy or physical transparency.

## Flat-color partitions and path topology

Color partitions are not necessarily complete objects. Adjacent nonoverlapping labels can leave antialiased seams, and their fills may stop at foreground ink or eyes. Continue each part beneath its own details where supported by the source. A matching stroke can hide a seam while incorrectly thickening the drawing, so inspect both.

Preserve the contour tree: enclosing outline, subtractive hole, then inner island. Grouping all additive contours before all subtractive contours can erase pupils or inner islands. Check small components before erosion/stroke reconstruction. Preserve genuine holes and infer concealed continuation explicitly.

## Test both sides of an overlap

Move the complete semantic group, including fill, outline, eyes and attachments. Assert the probe target is a LayerSet. Inspect both the moved object and newly exposed receiving surfaces; naming and pixel-exact restoration do not prove complete geometry. Prefer continuous reconstructed receiving shapes to small overlapping cover patches. Keep uncertainty about hidden anatomy explicit.

## Thin outlines and held objects

Largest-component tracing can discard thin disconnected rims or merge nearby surfaces. Use reviewed positional constraints and preserve meaningful negative spaces when smoothing compressed silhouettes.

Include tethers, harnesses, tools and held items in the moving assembly. For a gripped tool, use repaired clothing → complete independent tool → separately masked fingers/glove. Test the tool independently by hiding it, inspecting the vacated hand/garment, moving it and restoring. Complete-actor movement alone does not prove tool replaceability.

## Generated assets for complex material

When authorized and supported by an available image tool, generate separate local assets for complex material instead of forcing it into crude polygons. Preserve provenance and use replaceable Smart Objects. Match silhouette, perspective, landmarks, scale, material, light, edge quality and focal depth in Photoshop. Keep typography and suitable graphics native. A generated whole background with text overlays does not provide independent elements.

For local anatomy repairs, preserve original visible pixels and constrain generation to concealed regions where possible. Match shoulder, elbow, wrist and fingertips together: uniform bounding-box fitting can still give a disconnected limb. Reject candidates with incompatible landmarks.

## Structural completeness

Inventory all visible anatomy and attachments before acceptance. Trace custom symbol topology and negative spaces before substituting primitives. Check lattice connectivity, front/side perspective, dark members, tool identity and attachment points. Thresholding may mistake weathering for holes or omit shadowed beams; morphological closing may merge genuine openings.

Inventory support blocks and cables before filling apparent gaps. Keep hidden rear geometry behind its real occluder instead of drawing a connector over the foreground housing. Use the highest-resolution permitted reference for thin tethers. Review original, hidden and moved composites before making an editability claim.
