# Native depth fades for reconstructed architecture

Use after matching object geometry and confirming that the reference fades into atmosphere. A group mask controls opacity; visual fidelity and movement require separate checks.

## Receiving geometry first

Identify what occupies every apparent gap: background, another object, or the same object’s recessed surface. Build a continuous native backing behind foreground curls/rails when the source shows a dark interior. Do not use a fog mask to conceal missing receiving geometry. Work in full canvas coordinates; a source analysis crop is not an object boundary. Explicitly label inferred off-frame or occluded continuation.

## Bottom-only group mask in Photoshop JSX

Run only on a task-owned duplicate, with the intended document and group explicitly selected. This example assumes pixel units and a group without a user mask. If a mask already exists, preserve it and work in a new wrapper group or deliberately combine masks after inspecting them.

```javascript
app.activeDocument = doc;
doc.activeLayer = targetGroup;
// Keep left, right and top selection edges well outside the canvas so feathering
// affects only the intended bottom transition. Values are source-canvas pixels.
var margin = Math.max(doc.width.as('px'), doc.height.as('px'));
var width = doc.width.as('px');
doc.selection.select([[-margin,-margin], [width+margin,-margin],
                      [width+margin,fadeY], [-margin,fadeY]]);
doc.selection.feather(featherPx);
var c = charIDToTypeID, desc = new ActionDescriptor();
var ref = new ActionReference();
desc.putClass(c('Nw  '), c('Chnl'));
ref.putEnumerated(c('Chnl'), c('Chnl'), c('Msk '));
desc.putReference(c('At  '), ref);
desc.putEnumerated(c('Usng'), c('UsrM'), c('RvlS'));
executeAction(c('Mk  '), desc, DialogModes.NO);
doc.selection.deselect();
```

Choose `fadeY` and `featherPx` from the reference at its actual canvas scale. Keep the feathered selection beyond the side and top edges when only the bottom should fade. Feathering does not reproduce colored fog, faceted material or directional light; keep those treatments independently adjustable.

## Verification and failure handling

Save, close the task-owned copy, reopen it and export a preview. Check matched crops and the full composition for seams, unwanted side fading and geometric endpoints visible through the fade. Hide the object to inspect the receiving surface. Move the full group to confirm mask linkage and that local assets follow, then restore and compare. Exact restoration does not prove the moved geometry is complete.

Selecting an old hidden layer as an insertion anchor can change its visibility. Hide superseded layers after structural edits, then check visibility in the reopened PSD. A fade that travels with an object can still reveal malformed endpoints previously covered by another object.

## Mixed atmospheric edges

Keep soft haze separate from sharp faceted surfaces. Convert only layers needing blur into embedded Smart Objects and retain their source geometry inside. Inspect the saved filter descriptor by layer ID and confirm enabled state, name and radius. Filter existence is distinct from a successful radius edit/restore probe. Compare the actual material and color against the reference.

## Light beams behind movable assemblies

Hide foreground structures before accepting background light geometry. Continue light and receiving surfaces behind those structures so moving them does not expose a beam ending at the old position. Keep the light separate from the movable structure, label hidden continuation as inferred, and verify the requested displacement.
