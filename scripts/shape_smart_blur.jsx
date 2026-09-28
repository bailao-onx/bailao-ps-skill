// Convert an ordinary opaque-fill shape to a blurred embedded Smart Object.
// Invoke only on a task-owned duplicate; returns the new active layer.
// Shape-level opacity is applied once, outside the converted contents.
function BPS_shapeSmartBlur(doc, layer, radius, mode) {
  if (!layer || layer.typename != 'ArtLayer' || layer.kind != LayerKind.SOLIDFILL)
    throw Error('Expected a native shape layer');
  if (!isFinite(radius) || radius <= 0 || radius > 1000)
    throw Error('Blur radius must be greater than 0 and at most 1000 pixels');
  if (layer.grouped) throw Error('Unclip the shape before conversion');
  if (layer.fillOpacity != 100) throw Error('This helper requires full shape fill opacity');
  app.activeDocument = doc;
  var r = new ActionReference(); r.putIdentifier(charIDToTypeID('Lyr '), layer.id);
  var desc = executeActionGet(r), s = stringIDToTypeID;
  if (desc.hasKey(s('hasUserMask')) && desc.getBoolean(s('hasUserMask')))
    throw Error('External mask needs a separate conversion plan');
  if (desc.hasKey(s('layerEffects'))) throw Error('Layer styles need a separate conversion plan');
  var history = doc.activeHistoryState, name = layer.name, opacity = layer.opacity;
  try {
    doc.activeLayer = layer;
    layer.opacity = 100;
    executeAction(s('newPlacedLayer'), undefined, DialogModes.NO);
    var result = doc.activeLayer;
    result.name = name;
    result.opacity = opacity;
    if (mode !== undefined) result.blendMode = mode;
    result.applyGaussianBlur(radius);
    if (result.kind != LayerKind.SMARTOBJECT) throw Error('Conversion did not produce a Smart Object');
    return result;
  } catch (error) {
    doc.activeHistoryState = history;
    throw error;
  }
}
