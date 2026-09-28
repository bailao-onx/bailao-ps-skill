# Photoshop effect choices

Choose the construction that matches the image. Use a native effect where later adjustment should be possible; use a separate layer when the treatment varies across the canvas.

| Visible treatment | Preferred Photoshop construction | What to inspect |
| --- | --- | --- |
| Background color fade | Gradient fill or Gradient Overlay | Stop colors, direction, opacity, banding |
| Foreground or background blur | Smart Filter on the relevant Smart Object, with a mask if the depth changes within it | Radius, edge transition, no double blur |
| Cutout subject | Separate Smart Object with a user or vector mask | No white/color fringe, intact hair or transparent edges |
| Shadow | Layer Style or independent shadow layer for irregular contact shadows | Direction, spread, distance, object contact |
| Glow | Sharp source plus Outer Glow or a separate blurred bloom | Sharp core remains visible; glow color matches light source |
| Glass or translucent surface | Clean backdrop, blurred copy as needed, translucent fill, highlights and edge stroke | Actual backdrop blur and believable refraction |
| Tinted photograph | Adjustment or clipped color layer over a separate photo | Skin and product color remain plausible |
| Grain or paper | Separate texture layer with a documented blend mode | Scale and density; type stays legible |
| Perspective screen or package | Smart Object transformed in perspective | Geometry, readability, plausible lighting |
| Typography | Live type with measured size, tracking, leading, alignment and effects | Exact wording and hierarchy at feed size |

When native commands are unavailable or unreliable, finish that effect manually in Photoshop and verify it after reopening. Never replace a complex treatment with an unedited generated image while describing it as an editable Photoshop effect.


## Clean labels without contaminating material

Content-Aware Fill on a complete product photo can sample adjacent glass or ornaments. Work on a duplicate with constrained sampling, or a task-owned crop of the intended material, then composite through a mask. Preserve grain, lighting and seams. Hidden texture is reconstructed rather than recovered; rebuild the label separately and inspect it.

## Lighting and shadows

Record light direction, contact points, receiving material, shadow softness and reflected color. Independent assets can have incompatible lighting even when their silhouettes match. Separate contact occlusion, soft ground shadow and reflected light where needed. A carrier shape with zero Fill Opacity can drive a native shadow without showing its fill.

Keep appropriate lighting components with their object for repositioning on the same surface. Test hide/move and inspect the exposed ground. New shape, rotation, elevation or receiving surface requires lighting changes. Large fills that smear grain or create seams need repair before foreground objects cover them.

Change an actual effect parameter on a reopened disposable copy, inspect the local result and restore. Account for blur tails beyond geometric bounds. Check material, perspective and broad illumination before adding fine specular strokes; editable lines can still look optically wrong.

## Glints and hollow shadow carriers

A glint can use tapered native rays, a sharp core and restrained Outer Glow. Measure its center, length and light color from the reference.

With zero Fill Opacity, `layerConceals` (Layer Knocks Out Drop Shadow) may leave a bright hole. `effects.shadow.knockout:false` allows continuous shade; the existing default is true. The [gradient-shadow fixture](../examples/gradient-shadow/manifest.json) compares both settings. Disabled style entries do not prove that an unwanted effect is active.

## Defocused light

For a bright bokeh disk, a native colored ellipse converted to an embedded Smart Object (`newPlacedLayer`), Screen blend mode and Gaussian Blur can provide an adjustable base. Match diameter, blur, color and opacity separately. Inspect `smartObjectMore.filterFX` after reopen. A blurred disk does not reproduce detailed lens or coin structure.

## Apply opacity once during Smart Object conversion

Record the shape opacity, make its contents opaque, convert, then apply the intended opacity to the outer Smart Object. Otherwise inner and outer opacity can attenuate it twice. Inspect brightness as well as filter persistence.

Load `scripts/shape_smart_blur.jsx` and call `BPS_shapeSmartBlur(doc, layer, radiusPx, optionalBlendMode)` on a task-owned duplicate. It converts a full-fill native shape, transfers opacity outward and adds Gaussian Blur as a Smart Filter. Use the returned layer reference. It rejects clipped shapes, external masks, layer styles and non-full fill opacity; plan those cases separately. It restores history if conversion fails. Save/reopen and inspect both descriptors and pixels. The [native-effects fixture](../examples/native-effects/README.md) provides a reproducible check.

## Native group fades

Load `scripts/add_group_fade.jsx`; call `BPS_addGroupFade(doc, group, [x0,y0], [x1,y1])` in source-image pixels. Black conceals at the first point and white reveals at the second. It refuses an existing user mask. Restore `doc.activeChannels = doc.componentChannels` before subsequent color edits.

Use a group fade to protect quiet text regions while retaining light near a focal point. Inspect the fade direction, linked group movement and exposed receiving surfaces. See [native depth fades](native-depth-fades.md) for atmospheric edges and the [native-effects fixture](../examples/native-effects/README.md) for mask refusal and opacity checks.

## Editable print overlap and grain

Keep ink shapes separate and use a reviewed Multiply relationship where the reference supports it. Hide/move them to verify complete underlying text/paper and recomputed intersections. Sample colors with the substrate in mind: a final composited pixel used as the ink color can darken twice.

Determine whether grain darkens ink, exposes lighter paper or both before choosing a blend mode. Keep it clipped inside its owning assembly, with face details independent. A noise → small Gaussian Blur → Threshold Smart Filter stack can cluster marks, but values must match source scale and density. After filtering or duplicating, recheck clipping in the reopened PSD and inspect for spill. Review at native size as well as enlarged.

## Recessed openings

Inspect the underlying contour before styling. A restrained Inner Shadow and opposing highlight can suggest a shallow recess; choose direction and scale from the source. Use direct Photoshop layer styles for Inner Shadow, which the manifest runner does not currently expose. Effects cannot correct missing Bezier handles or incorrect opening geometry.
