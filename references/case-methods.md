# Reconstruction methods by design type

Choose methods from the actual reference and the edits the user needs. Each technique has its own scope; validate the saved PSD using the [quality protocol](quality-protocol.md).

## Products and translucent droplets

Separate the product, live typography, background and individual droplets. Apply soft alpha once, either inside the asset or as a native mask on opaque RGB. Inspect edges on contrasting backgrounds, then move and restore the complete object group. Source-derived glass can retain baked reflections and transmitted background; disclose that limitation. See [photo cutouts](photo-cutouts.md) and [effect recipes](effect-recipes.md).

## Dense typographic posters

Inventory every text region, exact copy, rule, grid and symbol. Use live text with measured bounds and native paths for graphics. Compare counters, terminals and glyph topology before adjusting tracking. Inspect small annotations and accidental overlaps after reopening, even when the overall composition looks similar. See [typography](typography.md).

## Illustrated characters

Trace major silhouettes and internal color regions with native paths. Split anatomy and accessories by depth and ownership: fingers, held tools and items carried by those tools must follow their intended assembly. Reconstruct hidden receiving surfaces before movement tests. Separate hair mass, curls and strand highlights; a color selection alone may collapse internal details. Custom lettering needs its own review and must not be described as live type when it consists of outlines.

## Product stages and floating objects

Keep product, packaging, copy, contact shadow and reflected light separately adjustable. Group the components that should follow a reposition on the same stage. Use Smart Filter blur only on the intended focal plane. Hide the group to inspect the clean stage, move it, then restore. Rotation, elevation changes or a new receiving surface require revising the lighting.

## Print layouts and typography

Keep print-color shapes separate and use a reviewed blend mode such as Multiply when appropriate. Check font anatomy, line breaks, descenders and intended overlap. Keep paper grain independent of live text. Matching line width does not identify the original font, and a group movement test does not establish material fidelity.

## Architecture and atmospheric scenes

Measure perspective, changing-width curves, connections and window positions before adding material. Distinguish a real opening from a dark recessed surface. Use a continuous backing where needed. Native primitives must be expanded to subpaths before calling `PSC_makeVector` directly; the full manifest runner handles that conversion.

Keep structural planes, windows and material assets separate. Use the same reviewed boundary for material masks and native backing to avoid double edges. Continue geometry beyond analysis-crop edges when the source supports it; label unseen continuation as inferred. A fade mask cannot repair missing geometry. See [native depth fades](native-depth-fades.md).

For a replaceable material, use an opaque embedded image and a separate native face mask. Test replacing its contents, then hide/move the structural group to check mask attachment and exposed surfaces. Baked lighting remains part of the material asset.

## Equipment, lattice and hanging tools

Inventory front and side faces, rails, braces, dark supports, cables, tethers, hands and held tools. Pale-color segmentation can miss dark members and mistake weathering for holes. Trace reviewed connections, then add clean material within that geometry. A generated housing or limb must match its landmarks and mounting points, not just its bounding box. See [occlusion and editable assemblies](occlusion-and-assemblies.md).

## Bottles and branded labels

Prepare clean bottle and supporting-surface assets. Remove baked label lettering before adding live type. Trace distinctive logo topology where a font cannot reproduce it, and label those outlines accurately. Keep background focus independent of the product and typography. Moving a transparent cap does not prove its transmitted environment is independent. Use a small numerical tolerance for Photoshop dimensions while rejecting real pixel-size changes.

## Prioritize repairs across the whole design

After local repairs, compare both the complete design at intended size and matched enlarged crops. Resolve missing elements, large geometry, tone and focal depth before fine texture. Preserve a known-good baseline; smoothing that creates cloudy patches or generic polygon overlays may worsen material fidelity.

For generated clean plates, specify whether coordinates refer to the full canvas or an illustration crop. Check landmark registration before blending detailed and smoother plates as separate Smart Objects. Keep opacity adjustable and describe those plates as raster material, not individually editable facets.

For local color correction, isolate the background in a Normal-blend group or clip native Curves to the intended plane beneath its separate details. Compare corresponding patches and unchanged regions after reopening. If exported baselines differ, reexport both saved controls through the same route before changing geometry or color to compensate.

## Carry the method into a new task

Keep the source and provenance, reviewed decomposition, font choices, uncertainty, generation prompts when used, PSD, reopened preview and scoped edit checks with that task. Record useful failure signs without making another user depend on an old conversation, private reference or local folder. These methods guide reconstruction; they do not guarantee an exact match or arbitrary edits.
