// ps-capabilities lib.jsx -- reusable ExtendScript / Action Manager helpers for manifest v2.
// Plain ES3, ASCII only. All coordinates are document pixels (origin top-left), documents at 72 ppi.
// Work in progress: sections are appended as each capability is tested.

// ---------------------------------------------------------------- basics
function PSC_c(s) { return charIDToTypeID(s); }
function PSC_s(s) { return stringIDToTypeID(s); }
function PSC_idName(id) {
  var n = '';
  try { n = typeIDToStringID(id); } catch (e) {}
  if (!n) { try { n = "'" + typeIDToCharID(id) + "'"; } catch (e2) { n = String(id); } }
  return n;
}
function PSC_rgbDesc(hex) {
  var d = new ActionDescriptor();
  d.putDouble(PSC_c('Rd  '), parseInt(hex.substr(0, 2), 16));
  d.putDouble(PSC_c('Grn '), parseInt(hex.substr(2, 2), 16));
  d.putDouble(PSC_c('Bl  '), parseInt(hex.substr(4, 2), 16));
  return d;
}
function PSC_solid(hex) { var v = new SolidColor(); v.rgb.hexValue = hex; return v; }
function PSC_now() { return new Date().getTime(); }
function PSC_append(path, s) {
  var f = new File(path); f.encoding = 'UTF8'; f.lineFeed = 'Unix'; f.open('a'); f.writeln(s); f.close();
}
function PSC_write(path, s) {
  var f = new File(path); f.encoding = 'UTF8'; f.lineFeed = 'Unix'; f.open('w'); f.write(s); f.close();
}
function PSC_json(v) {
  // tiny ES3 JSON serializer (no JSON object in ExtendScript by default)
  if (v === null || v === undefined) return 'null';
  var t = typeof v;
  if (t == 'number') return isFinite(v) ? String(Math.round(v * 10000) / 10000) : 'null';
  if (t == 'boolean') return v ? 'true' : 'false';
  if (t == 'string') {
    return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t') + '"';
  }
  if (v instanceof Array) {
    var a = [];
    for (var i = 0; i < v.length; i++) a.push(PSC_json(v[i]));
    return '[' + a.join(',') + ']';
  }
  var o = [];
  for (var k in v) { if (v.hasOwnProperty(k)) o.push(PSC_json(String(k)) + ':' + PSC_json(v[k])); }
  return '{' + o.join(',') + '}';
}
function PSC_docNames() {
  var n = [];
  for (var i = 0; i < app.documents.length; i++) n.push(app.documents[i].name);
  return n;
}

// Run fn() with dialogs off and pixel units; always restores the user's preferences.
function PSC_withPrefs(fn) {
  var oldRuler = app.preferences.rulerUnits, oldType = app.preferences.typeUnits, oldDialogs = app.displayDialogs, oldSmartQuotes = app.preferences.smartQuotes;
  try {
    app.displayDialogs = DialogModes.NO;
    app.preferences.smartQuotes = false;
    app.preferences.rulerUnits = Units.PIXELS;
    app.preferences.typeUnits = TypeUnits.PIXELS;
    return fn();
  } finally {
    app.preferences.rulerUnits = oldRuler;
    app.preferences.typeUnits = oldType;
    app.displayDialogs = oldDialogs;
    app.preferences.smartQuotes = oldSmartQuotes;
  }
}

function PSC_newDoc(name, w, h, transparent) {
  return app.documents.add(UnitValue(w, 'px'), UnitValue(h, 'px'), 72, name, NewDocumentMode.RGB,
    transparent ? DocumentFill.TRANSPARENT : DocumentFill.WHITE, 1, BitsPerChannelType.EIGHT, 'sRGB IEC61966-2.1');
}
function PSC_savePSD(doc, path) {
  var o = new PhotoshopSaveOptions(); o.layers = true; o.embedColorProfile = true; o.maximizeCompatibility = true;
  doc.saveAs(new File(path), o, false, Extension.LOWERCASE);
}
function PSC_savePNG(doc, path) {
  var o = new PNGSaveOptions(); o.interlaced = false; o.compression = 1;
  doc.saveAs(new File(path), o, true, Extension.LOWERCASE);
}
// Enlarge the rendered composite, never live paths/effects. Source remains editable.
function PSC_saveReviewCrop(doc, path, box, scale) {
  scale = scale === undefined ? 1 : scale;
  var w = doc.width.as('px'), h = doc.height.as('px');
  if (!box || box.length != 4 || !(scale > 0) || !isFinite(scale) ||
      !(box[0] >= 0 && box[1] >= 0 && box[2] <= w && box[3] <= h &&
        box[2] > box[0] && box[3] > box[1])) throw Error('Invalid review crop bounds/scale');
  var prior = app.activeDocument, copy = null;
  var temp = new File(Folder.temp.fsName + "/psc-review-" + new Date().getTime() + "-" + Math.floor(Math.random()*1000000000) + ".png");
  try {
    PSC_savePNG(doc, temp.fsName);
    copy = app.open(temp);
    copy.crop([UnitValue(box[0], 'px'), UnitValue(box[1], 'px'),
      UnitValue(box[2], 'px'), UnitValue(box[3], 'px')]);
    if (scale != 1) copy.resizeImage(UnitValue(Math.round((box[2]-box[0])*scale), 'px'),
      UnitValue(Math.round((box[3]-box[1])*scale), 'px'), copy.resolution, ResampleMethod.BICUBIC);
    PSC_savePNG(copy, path);
  } finally {
    if (copy) copy.close(SaveOptions.DONOTSAVECHANGES);
    if (temp.exists) temp.remove();
    app.activeDocument = prior;
  }
}
function PSC_bounds(layer) {
  var b = layer.bounds;
  return [b[0].as('px'), b[1].as('px'), b[2].as('px'), b[3].as('px')];
}

// ---------------------------------------------------------------- descriptor dump
function PSC_dumpValue(obj, key, type, depth) {
  var T = DescValueType;
  if (type == T.INTEGERTYPE) return String(obj.getInteger(key));
  if (type == T.LARGEINTEGERTYPE) return String(obj.getLargeInteger(key));
  if (type == T.DOUBLETYPE) return String(obj.getDouble(key));
  if (type == T.UNITDOUBLE) return obj.getUnitDoubleValue(key) + ' ' + PSC_idName(obj.getUnitDoubleType(key));
  if (type == T.BOOLEANTYPE) return String(obj.getBoolean(key));
  if (type == T.STRINGTYPE) { var s = obj.getString(key); return PSC_json(s.length > 200 ? s.substr(0, 200) + '...' : s); }
  if (type == T.ENUMERATEDTYPE) return PSC_idName(obj.getEnumerationType(key)) + '.' + PSC_idName(obj.getEnumerationValue(key));
  if (type == T.CLASSTYPE) return 'class ' + PSC_idName(obj.getClass(key));
  if (type == T.OBJECTTYPE) return '<' + PSC_idName(obj.getObjectType(key)) + '> ' + PSC_dumpDesc(obj.getObjectValue(key), depth + 1);
  if (type == T.LISTTYPE) return PSC_dumpList(obj.getList(key), depth + 1);
  if (type == T.REFERENCETYPE) return 'ref';
  if (type == T.ALIASTYPE) { try { return 'alias ' + obj.getPath(key).fsName; } catch (e) { return 'alias'; } }
  if (type == T.RAWTYPE) return 'raw(' + obj.getData(key).length + ')';
  return '?' + type;
}
function PSC_pad(depth) { var s = ''; for (var i = 0; i < depth; i++) s += '  '; return s; }
function PSC_dumpDesc(d, depth) {
  depth = depth || 0;
  if (depth > 12) return '{...}';
  var lines = ['{'];
  for (var i = 0; i < d.count; i++) {
    var k = d.getKey(i), t = d.getType(k), v;
    try { v = PSC_dumpValue(d, k, t, depth); } catch (e) { v = 'ERR ' + e.message; }
    lines.push(PSC_pad(depth + 1) + PSC_idName(k) + ': ' + v);
  }
  lines.push(PSC_pad(depth) + '}');
  return lines.join('\n');
}
function PSC_dumpList(l, depth) {
  if (depth > 12) return '[...]';
  var lines = ['['];
  for (var i = 0; i < l.count; i++) {
    var t = l.getType(i), v;
    try { v = PSC_dumpValue(l, i, t, depth); } catch (e) { v = 'ERR ' + e.message; }
    lines.push(PSC_pad(depth + 1) + v);
  }
  lines.push(PSC_pad(depth) + ']');
  return lines.join('\n');
}
function PSC_layerDesc(layerId) {
  var r = new ActionReference();
  if (layerId !== undefined) r.putIdentifier(PSC_c('Lyr '), layerId);
  else r.putEnumerated(PSC_c('Lyr '), PSC_c('Ordn'), PSC_c('Trgt'));
  return executeActionGet(r);
}
function PSC_activeLayerId() {
  var r = new ActionReference();
  r.putProperty(PSC_c('Prpr'), PSC_c('LyrI'));
  r.putEnumerated(PSC_c('Lyr '), PSC_c('Ordn'), PSC_c('Trgt'));
  return executeActionGet(r).getInteger(PSC_c('LyrI'));
}

// ---------------------------------------------------------------- 1. vector (shape) layers
// Point spec: [x,y] corner point, or {anchor:[x,y], in:[x,y], out:[x,y]} (in = handle arriving from the
// previous point, out = handle leaving toward the next point; missing handle = anchor, i.e. corner-side).
// AM mapping verified in t02: DOM leftDirection == AM 'forward', DOM rightDirection == AM 'backward'.
function PSC_pntDesc(xy) {
  var d = new ActionDescriptor();
  d.putUnitDouble(PSC_c('Hrzn'), PSC_c('#Pxl'), xy[0]);
  d.putUnitDouble(PSC_c('Vrtc'), PSC_c('#Pxl'), xy[1]);
  return d;
}
var PSC_OPS = { add: 'add', subtract: 'subtract', intersect: 'interfaceIconFrameDimmed', xor: 'xor' };
function PSC_pathComponentsList(subpaths, handleSwap) {
  var comps = new ActionList();
  for (var i = 0; i < subpaths.length; i++) {
    var sp = subpaths[i], op = PSC_OPS[sp.op || 'add'];
    if (!op) throw Error('Unknown path op: ' + sp.op);
    var comp = new ActionDescriptor();
    comp.putEnumerated(PSC_s('shapeOperation'), PSC_s('shapeOperation'), PSC_s(op));
    var subList = new ActionList(), sub = new ActionDescriptor(), pts = new ActionList();
    sub.putBoolean(PSC_s('closedSubpath'), sp.closed !== false);
    for (var j = 0; j < sp.points.length; j++) {
      var p = sp.points[j], pd = new ActionDescriptor(), a, hin, hout;
      if (p instanceof Array) { a = p; hin = null; hout = null; }
      else { a = p.anchor; hin = p['in'] || null; hout = p.out || null; }
      pd.putObject(PSC_s('anchor'), PSC_c('Pnt '), PSC_pntDesc(a));
      if (hin || hout) {
        var fwd = hout || a, bwd = hin || a;
        if (handleSwap) { var t = fwd; fwd = bwd; bwd = t; }
        pd.putObject(PSC_s('forward'), PSC_c('Pnt '), PSC_pntDesc(fwd));
        pd.putObject(PSC_s('backward'), PSC_c('Pnt '), PSC_pntDesc(bwd));
        pd.putBoolean(PSC_s('smooth'), !!(hin && hout));
      }
      pts.putObject(PSC_s('pathPoint'), pd);
    }
    sub.putList(PSC_s('points'), pts);
    subList.putObject(PSC_s('subpathsList'), sub);
    comp.putList(PSC_s('subpathListKey'), subList);
    comps.putObject(PSC_s('pathComponent'), comp);
  }
  return comps;
}
function PSC_setWorkPath(subpaths, handleSwap) {
  var d = new ActionDescriptor(), r = new ActionReference();
  r.putProperty(PSC_c('Path'), PSC_c('WrPt'));
  d.putReference(PSC_c('null'), r);
  d.putList(PSC_c('T   '), PSC_pathComponentsList(subpaths, handleSwap));
  executeAction(PSC_c('setd'), d, DialogModes.NO);
}
function PSC_deleteWorkPath() {
  var d = new ActionDescriptor(), r = new ActionReference();
  r.putProperty(PSC_c('Path'), PSC_c('WrPt'));
  d.putReference(PSC_c('null'), r);
  executeAction(PSC_c('Dlt '), d, DialogModes.NO);
}
function PSC_hasWorkPath(doc) {
  for (var i = 0; i < doc.pathItems.length; i++) if (doc.pathItems[i].kind == PathKind.WORKPATH) return true;
  return false;
}
// Make a solid-color shape layer from the currently selected path (work path or named path).
function PSC_makeSolidFromPath(hex) {
  var d = new ActionDescriptor(), ref = new ActionReference();
  ref.putClass(PSC_s('contentLayer')); d.putReference(PSC_c('null'), ref);
  var content = new ActionDescriptor(), fill = new ActionDescriptor();
  fill.putObject(PSC_c('Clr '), PSC_c('RGBC'), PSC_rgbDesc(hex));
  content.putObject(PSC_c('Type'), PSC_s('solidColorLayer'), fill);
  d.putObject(PSC_c('Usng'), PSC_s('contentLayer'), content);
  executeAction(PSC_c('Mk  '), d, DialogModes.NO);
}
var PSC_CAPS = { butt: 'strokeStyleButtCap', round: 'strokeStyleRoundCap', square: 'strokeStyleSquareCap' };
var PSC_JOINS = { miter: 'strokeStyleMiterJoin', round: 'strokeStyleRoundJoin', bevel: 'strokeStyleBevelJoin' };
var PSC_ALIGNS = { center: 'strokeStyleAlignCenter', inside: 'strokeStyleAlignInside', outside: 'strokeStyleAlignOutside' };
function PSC_strokeStyleDesc(stroke, fillEnabled) {
  var ss = new ActionDescriptor();
  ss.putInteger(PSC_s('strokeStyleVersion'), 2);
  ss.putBoolean(PSC_s('strokeEnabled'), !!stroke);
  ss.putBoolean(PSC_s('fillEnabled'), fillEnabled);
  if (stroke) {
    var w = stroke.width === undefined ? 1 : stroke.width;
    ss.putUnitDouble(PSC_s('strokeStyleLineWidth'), PSC_c('#Pxl'), w);
    ss.putUnitDouble(PSC_s('strokeStyleLineDashOffset'), PSC_c('#Pnt'), 0);
    ss.putDouble(PSC_s('strokeStyleMiterLimit'), stroke.miter_limit === undefined ? 100 : stroke.miter_limit);
    var cap = PSC_CAPS[stroke.cap || 'butt'], join = PSC_JOINS[stroke.join || 'miter'], al = PSC_ALIGNS[stroke.align || 'center'];
    if (!cap || !join || !al) throw Error('Bad stroke cap/join/align');
    ss.putEnumerated(PSC_s('strokeStyleLineCapType'), PSC_s('strokeStyleLineCapType'), PSC_s(cap));
    ss.putEnumerated(PSC_s('strokeStyleLineJoinType'), PSC_s('strokeStyleLineJoinType'), PSC_s(join));
    ss.putEnumerated(PSC_s('strokeStyleLineAlignment'), PSC_s('strokeStyleLineAlignment'), PSC_s(al));
    ss.putBoolean(PSC_s('strokeStyleScaleLock'), false);
    ss.putBoolean(PSC_s('strokeStyleStrokeAdjust'), false);
    var dash = new ActionList();
    if (stroke.dash && stroke.dash.length) {
      // manifest dash values are px; Photoshop stores dash/gap as multiples of the line width.
      for (var i = 0; i < stroke.dash.length; i++) dash.putUnitDouble(PSC_c('#Nne'), stroke.dash[i] / w);
    }
    ss.putList(PSC_s('strokeStyleLineDashSet'), dash);
    ss.putEnumerated(PSC_s('strokeStyleBlendMode'), PSC_c('BlnM'), PSC_c('Nrml'));
    ss.putUnitDouble(PSC_s('strokeStyleOpacity'), PSC_c('#Prc'), stroke.opacity === undefined ? 100 : stroke.opacity);
    var sc = new ActionDescriptor();
    sc.putObject(PSC_c('Clr '), PSC_c('RGBC'), PSC_rgbDesc(stroke.color || '000000'));
    ss.putObject(PSC_s('strokeStyleContent'), PSC_s('solidColorLayer'), sc);
    ss.putDouble(PSC_s('strokeStyleResolution'), 72);
  }
  return ss;
}
// Applies stroke/fill-enabled flags to the target shape layer.
function PSC_setStrokeStyle(stroke, fillEnabled) {
  var d = new ActionDescriptor(), r = new ActionReference();
  r.putEnumerated(PSC_s('contentLayer'), PSC_c('Ordn'), PSC_c('Trgt'));
  d.putReference(PSC_c('null'), r);
  var to = new ActionDescriptor();
  to.putObject(PSC_s('strokeStyle'), PSC_s('strokeStyle'), PSC_strokeStyleDesc(stroke, fillEnabled));
  d.putObject(PSC_c('T   '), PSC_s('shapeStyle'), to);
  executeAction(PSC_c('setd'), d, DialogModes.NO);
}
// Rename the target layer through Action Manager (faster than DOM layer.name on big documents).
function PSC_setTargetLayerName(name) {
  var d = new ActionDescriptor(), r = new ActionReference(), to = new ActionDescriptor();
  r.putEnumerated(PSC_c('Lyr '), PSC_c('Ordn'), PSC_c('Trgt'));
  d.putReference(PSC_c('null'), r);
  to.putString(PSC_c('Nm  '), name);
  d.putObject(PSC_c('T   '), PSC_c('Lyr '), to);
  executeAction(PSC_c('setd'), d, DialogModes.NO);
}
var PSC_BLEND = {
  normal: 'normal', dissolve: 'dissolve', darken: 'darken', multiply: 'multiply', colorBurn: 'colorBurn',
  linearBurn: 'linearBurn', darkerColor: 'darkerColor', lighten: 'lighten', screen: 'screen',
  colorDodge: 'colorDodge', linearDodge: 'linearDodge', lighterColor: 'lighterColor', overlay: 'overlay',
  softLight: 'softLight', hardLight: 'hardLight', vividLight: 'vividLight', linearLight: 'linearLight',
  pinLight: 'pinLight', hardMix: 'hardMix', difference: 'difference', exclusion: 'exclusion',
  subtract: 'blendSubtraction', divide: 'blendDivide', hue: 'hue', saturation: 'saturation',
  color: 'color', luminosity: 'luminosity', passThrough: 'passThrough'
};
function PSC_blendId(name) {
  var n = PSC_BLEND[name];
  if (!n) throw Error('Unknown blend mode: ' + name);
  return PSC_s(n);
}

// vectorLayer(doc, spec) -> ArtLayer (LayerKind.SOLIDFILL with a vector mask). The new layer is created
// above the currently active layer (same rule as every Photoshop "make layer").
// spec = { name, subpaths:[{closed:true|false, op:'add'|'subtract'|'intersect'|'xor', points:[...]}],
//          fill:'RRGGBB'|null, stroke:{color,width,align,cap,join,dash:[px...],opacity,miter_limit}|null,
//          opacity:0-100, fill_opacity:0-100, blend_mode:'multiply'..., method:'direct'|'workpath'|'dom' }
// method 'direct' (default, fastest, leaves no Work Path): Mk contentLayer with Shp=<pathClass>{pathComponents}.
function vectorLayer(doc, spec) {
  PSC_makeVector(doc, spec);
  return doc.activeLayer;
}
// Same as vectorLayer but pure Action Manager; returns the new layer id (fastest for hundreds of layers).
function PSC_makeVector(doc, spec) {
  if (!spec.subpaths || !spec.subpaths.length) throw Error('vector ' + spec.name + ': no subpaths');
  var fillHex = spec.fill || null, stroke = spec.stroke || null;
  if (!fillHex && !stroke) throw Error('vector ' + spec.name + ': needs fill or stroke');
  var method = spec.method || 'direct';
  var fillColor = fillHex || stroke.color || '000000';
  var content = new ActionDescriptor(), fill = new ActionDescriptor();
  fill.putObject(PSC_c('Clr '), PSC_c('RGBC'), PSC_rgbDesc(fillColor));
  content.putObject(PSC_c('Type'), PSC_s('solidColorLayer'), fill);
  if (spec.opacity !== undefined) content.putUnitDouble(PSC_c('Opct'), PSC_c('#Prc'), spec.opacity);
  if (spec.blend_mode) content.putEnumerated(PSC_c('Md  '), PSC_c('BlnM'), PSC_blendId(spec.blend_mode));
  var needStyle = !!stroke || !fillHex;
  var d = new ActionDescriptor(), ref = new ActionReference();
  ref.putClass(PSC_s('contentLayer')); d.putReference(PSC_c('null'), ref);
  var tmpPath = null;
  if (method == 'direct') {
    var pc = new ActionDescriptor();
    pc.putList(PSC_s('pathComponents'), PSC_pathComponentsList(spec.subpaths, spec._handleSwap));
    content.putObject(PSC_c('Shp '), PSC_s('pathClass'), pc);
    if (needStyle) content.putObject(PSC_s('strokeStyle'), PSC_s('strokeStyle'), PSC_strokeStyleDesc(stroke, !!fillHex));
  } else if (method == 'workpath') {
    PSC_setWorkPath(spec.subpaths, spec._handleSwap);
  } else if (method == 'dom') {
    tmpPath = doc.pathItems.add('PSC tmp path', PSC_subPathInfos(spec.subpaths, spec._handleSwap));
  } else throw Error('Unknown vector method ' + method);
  d.putObject(PSC_c('Usng'), PSC_s('contentLayer'), content);
  executeAction(PSC_c('Mk  '), d, DialogModes.NO);
  if (method == 'workpath') PSC_deleteWorkPath();
  if (tmpPath) tmpPath.remove();
  if (method != 'direct' && needStyle) PSC_setStrokeStyle(stroke, !!fillHex);
  if (spec.name) PSC_setTargetLayerName(spec.name);
  if (spec.fill_opacity !== undefined) PSC_setTargetFillOpacity(spec.fill_opacity);
  return spec.return_id ? PSC_activeLayerId() : null;
}
function PSC_setTargetFillOpacity(v) {
  var d = new ActionDescriptor(), r = new ActionReference(), to = new ActionDescriptor();
  r.putEnumerated(PSC_c('Lyr '), PSC_c('Ordn'), PSC_c('Trgt'));
  d.putReference(PSC_c('null'), r);
  to.putUnitDouble(PSC_s('fillOpacity'), PSC_c('#Prc'), v);
  d.putObject(PSC_c('T   '), PSC_c('Lyr '), to);
  executeAction(PSC_c('setd'), d, DialogModes.NO);
}
// DOM SubPathInfo[] (used by method 'dom'; same handle convention as the runner: leftDirection = out).
function PSC_subPathInfos(subpaths, handleSwap) {
  var OPS = { add: ShapeOperation.SHAPEADD, subtract: ShapeOperation.SHAPESUBTRACT,
              intersect: ShapeOperation.SHAPEINTERSECT, xor: ShapeOperation.SHAPEXOR };
  var out = [];
  for (var i = 0; i < subpaths.length; i++) {
    var sp = subpaths[i], info = new SubPathInfo(), arr = [];
    info.operation = OPS[sp.op || 'add']; info.closed = sp.closed !== false;
    for (var j = 0; j < sp.points.length; j++) {
      var p = sp.points[j], pp = new PathPointInfo(), a, hin, hout;
      if (p instanceof Array) { a = p; hin = null; hout = null; } else { a = p.anchor; hin = p['in'] || null; hout = p.out || null; }
      pp.anchor = a;
      var L = hout || a, R = hin || a;
      if (handleSwap) { var t = L; L = R; R = t; }
      pp.leftDirection = L; pp.rightDirection = R;
      pp.kind = (hin || hout) ? PointKind.SMOOTHPOINT : PointKind.CORNERPOINT;
      arr.push(pp);
    }
    info.entireSubPath = arr; out.push(info);
  }
  return out;
}
// Read back the vector mask of a layer (by id or target): {components:n, ops:[...], anchors:n, closed:[...]}.
function PSC_vectorMaskInfo(layerId) {
  var r = new ActionReference();
  r.putEnumerated(PSC_c('Path'), PSC_c('Path'), PSC_s('vectorMask'));
  if (layerId !== undefined) r.putIdentifier(PSC_c('Lyr '), layerId);
  else r.putEnumerated(PSC_c('Lyr '), PSC_c('Ordn'), PSC_c('Trgt'));
  var pd = executeActionGet(r);
  return PSC_pathContentsInfo(pd.getObjectValue(PSC_s('pathContents')));
}
function PSC_pathContentsInfo(pc) {
  var comps = pc.getList(PSC_s('pathComponents')), info = { components: comps.count, ops: [], anchors: 0, closed: [], subpaths: [] };
  for (var i = 0; i < comps.count; i++) {
    var comp = comps.getObjectValue(i);
    info.ops.push(typeIDToStringID(comp.getEnumerationValue(PSC_s('shapeOperation'))));
    var subs = comp.getList(PSC_s('subpathListKey'));
    for (var j = 0; j < subs.count; j++) {
      var sp = subs.getObjectValue(j), pts = sp.getList(PSC_s('points'));
      info.anchors += pts.count;
      info.closed.push(sp.hasKey(PSC_s('closedSubpath')) ? sp.getBoolean(PSC_s('closedSubpath')) : false);
    }
  }
  return info;
}
// Convert a <pathClass> descriptor into manifest-style subpaths (for Make Work Path read-back).
function PSC_pathContentsToSubpaths(pc) {
  var comps = pc.getList(PSC_s('pathComponents')), out = [];
  var REV = { add: 'add', subtract: 'subtract', interfaceIconFrameDimmed: 'intersect', xor: 'xor' };
  function xy(pd, key) {
    var o = pd.getObjectValue(key);
    return [o.getUnitDoubleValue(PSC_c('Hrzn')), o.getUnitDoubleValue(PSC_c('Vrtc'))];
  }
  for (var i = 0; i < comps.count; i++) {
    var comp = comps.getObjectValue(i), op = REV[typeIDToStringID(comp.getEnumerationValue(PSC_s('shapeOperation')))] || 'add';
    var subs = comp.getList(PSC_s('subpathListKey'));
    for (var j = 0; j < subs.count; j++) {
      var sp = subs.getObjectValue(j), pts = sp.getList(PSC_s('points')), P = [];
      for (var k = 0; k < pts.count; k++) {
        var pd = pts.getObjectValue(k), a = xy(pd, PSC_s('anchor'));
        if (pd.hasKey(PSC_s('forward')) || pd.hasKey(PSC_s('backward'))) {
          P.push({ anchor: a, out: pd.hasKey(PSC_s('forward')) ? xy(pd, PSC_s('forward')) : a,
                   'in': pd.hasKey(PSC_s('backward')) ? xy(pd, PSC_s('backward')) : a });
        } else P.push(a);
      }
      out.push({ op: j == 0 ? op : 'add', closed: sp.hasKey(PSC_s('closedSubpath')) ? sp.getBoolean(PSC_s('closedSubpath')) : false, points: P });
    }
  }
  return out;
}
// Layer ids and names in back-to-front order (AM, fast), including group markers.
function PSC_layerStack(doc) {
  var r = new ActionReference();
  r.putProperty(PSC_c('Prpr'), PSC_c('NmbL'));
  r.putEnumerated(PSC_c('Dcmn'), PSC_c('Ordn'), PSC_c('Trgt'));
  var n = executeActionGet(r).getInteger(PSC_c('NmbL')), out = [];
  var hasBg = false;
  try { var br = new ActionReference(); br.putIndex(PSC_c('Lyr '), 0); executeActionGet(br); hasBg = true; } catch (e) {}
  for (var i = hasBg ? 0 : 1; i <= n; i++) {
    var lr = new ActionReference(); lr.putIndex(PSC_c('Lyr '), i);
    var ld = executeActionGet(lr);
    var sec = typeIDToStringID(ld.getEnumerationValue(PSC_s('layerSection')));
    out.push({ index: i, id: ld.getInteger(PSC_c('LyrI')), name: ld.getString(PSC_c('Nm  ')), section: sec,
               kind: ld.hasKey(PSC_s('layerKind')) ? ld.getInteger(PSC_s('layerKind')) : -1,
               vmask: ld.hasKey(PSC_s('hasVectorMask')) ? ld.getBoolean(PSC_s('hasVectorMask')) : false,
               stroke: ld.hasKey(PSC_s('AGMStrokeStyleInfo')),
               mode: typeIDToStringID(ld.getEnumerationValue(PSC_c('Md  '))) });
  }
  return out;
}
function PSC_selectLayerById(id) {
  var d = new ActionDescriptor(), r = new ActionReference();
  r.putIdentifier(PSC_c('Lyr '), id);
  d.putReference(PSC_c('null'), r);
  d.putBoolean(PSC_c('MkVs'), false);
  executeAction(PSC_c('slct'), d, DialogModes.NO);
}
// Paths listed in the Paths panel while NO layer is selected = saved paths + Work Path (vector masks of
// the selected layer are hidden then). Should be [] for a clean PSD. Note: the DOM reports a targeted
// layer's vector mask sometimes as NORMALPATH, so kind-based filtering is unreliable.
function PSC_selectNoLayers() {
  var d = new ActionDescriptor(), r = new ActionReference();
  r.putEnumerated(PSC_c('Lyr '), PSC_c('Ordn'), PSC_c('Trgt'));
  d.putReference(PSC_c('null'), r);
  try { executeAction(PSC_s('selectNoLayers'), d, DialogModes.NO); } catch (e) { /* background-only document */ }
}
function PSC_strayPaths(doc) {
  PSC_selectNoLayers();
  var n = [];
  for (var i = 0; i < doc.pathItems.length; i++) n.push(doc.pathItems[i].name + ':' + doc.pathItems[i].kind);
  return n;
}

// ---------------------------------------------------------------- 2./3. live text
var PSC_AA = { none: 'antiAliasNone', sharp: 'antiAliasSharp', crisp: 'antiAliasCrisp', strong: 'antiAliasStrong', smooth: 'antiAliasSmooth' };
var PSC_ALIGN = { left: 'Left', center: 'Cntr', right: 'Rght' };
// textStyleRange list for the whole string. spec: font (PostScript name), size_px, color, tracking (1/1000 em),
// leading_px, horizontal_scale (%), vertical_scale (%), baseline_shift_px.
function PSC_singleTextStyleList(spec, len) {
  var l = new ActionList(), sr = new ActionDescriptor(), ts = new ActionDescriptor();
  sr.putInteger(PSC_c('From'), 0); sr.putInteger(PSC_c('T   '), len);
  ts.putString(PSC_s('fontPostScriptName'), spec.font);
  ts.putUnitDouble(PSC_c('Sz  '), PSC_c('#Pxl'), spec.size_px);
  ts.putObject(PSC_c('Clr '), PSC_c('RGBC'), PSC_rgbDesc(spec.color || '000000'));
  if (spec.tracking !== undefined) ts.putInteger(PSC_s('tracking'), Math.round(spec.tracking));
  if (spec.horizontal_scale !== undefined) ts.putDouble(PSC_s('horizontalScale'), spec.horizontal_scale);
  if (spec.vertical_scale !== undefined) ts.putDouble(PSC_s('verticalScale'), spec.vertical_scale);
  if (spec.leading_px !== undefined) {
    ts.putBoolean(PSC_s('autoLeading'), false);
    ts.putUnitDouble(PSC_s('leading'), PSC_c('#Pxl'), spec.leading_px);
  }
  if (spec.baseline_shift_px !== undefined) ts.putUnitDouble(PSC_s('baselineShift'), PSC_c('#Pxl'), spec.baseline_shift_px);
  sr.putObject(PSC_c('TxtS'), PSC_c('TxtS'), ts);
  l.putObject(PSC_c('Txtt'), sr);
  return l;
}
function PSC_textStyleList(spec, len) {
  if (!spec.character_styles || !spec.character_styles.length) return PSC_singleTextStyleList(spec,len);
  var list=new ActionList();
  for(var i=0;i<len;i++) {
    var current={},key;
    for(key in spec) if(spec.hasOwnProperty(key))current[key]=spec[key];
    for(var j=0;j<spec.character_styles.length;j++){
      var run=spec.character_styles[j];
      if(i>=run.from && i<run.to){
        if(run.tracking!==undefined)current.tracking=run.tracking;
        if(run.horizontal_scale!==undefined)current.horizontal_scale=run.horizontal_scale;
      }
    }
    var range=PSC_singleTextStyleList(current,len).getObjectValue(0);
    range.putInteger(PSC_c('From'),i);range.putInteger(PSC_c('T   '),i+1);
    list.putObject(PSC_c('Txtt'),range);
  }
  return list;
}

function PSC_paragraphList(align, len) {
  var l = new ActionList(), pr = new ActionDescriptor(), ps = new ActionDescriptor();
  pr.putInteger(PSC_c('From'), 0); pr.putInteger(PSC_c('T   '), len);
  ps.putEnumerated(PSC_c('Algn'), PSC_c('Alg '), PSC_c(PSC_ALIGN[align || 'left']));
  pr.putObject(PSC_s('paragraphStyle'), PSC_s('paragraphStyle'), ps);
  l.putObject(PSC_s('paragraphStyleRange'), pr);
  return l;
}
function PSC_fontExists(psName) {
  for (var i = 0; i < app.fonts.length; i++) if (app.fonts[i].postScriptName == psName) return true;
  // Newly registered fonts can resolve before app.fonts refreshes. Reject silent substitution.
  var previous = app.documents.length ? app.activeDocument : null, probe = null;
  try {
    probe = app.documents.add(UnitValue(64, 'px'), UnitValue(64, 'px'), 72,
      'PSC font availability probe', NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    var layer = probe.artLayers.add(); layer.kind = LayerKind.TEXT;
    layer.textItem.contents = 'Ag'; layer.textItem.font = psName;
    return layer.textItem.font == psName;
  } catch (e) { return false; }
  finally {
    if (probe) probe.close(SaveOptions.DONOTSAVECHANGES);
    if (previous) app.activeDocument = previous;
  }
}

// textLayer(doc, spec) -> ArtLayer (LayerKind.TEXT, point text).
// spec = { name, text ('\n' = new paragraph), font, size_px, color, position:[x,y], align:'left'|'center'|'right',
//          tracking, leading_px, horizontal_scale, vertical_scale, rotation (deg, clockwise on screen, about position),
//          antialias:'sharp'|'crisp'|'strong'|'smooth'|'none' }
// position is the text origin: baseline-left for align left, baseline-center for center, baseline-right for right.
function textLayer(doc, spec) {
  var text = String(spec.text).replace(/\r\n|\n/g, '\r');
  var d = new ActionDescriptor(), ref = new ActionReference();
  ref.putClass(PSC_c('TxLr')); d.putReference(PSC_c('null'), ref);
  var tk = new ActionDescriptor();
  tk.putString(PSC_c('Txt '), text);
  var cp = new ActionDescriptor();   // textClickPoint is interpreted in percent of the canvas
  cp.putUnitDouble(PSC_c('Hrzn'), PSC_c('#Prc'), spec.position[0] / doc.width.as('px') * 100);
  cp.putUnitDouble(PSC_c('Vrtc'), PSC_c('#Prc'), spec.position[1] / doc.height.as('px') * 100);
  tk.putObject(PSC_c('TxtC'), PSC_c('Pnt '), cp);
  tk.putEnumerated(PSC_c('AntA'), PSC_c('Annt'), PSC_s(PSC_AA[spec.antialias || 'sharp']));
  var shapeList = new ActionList(), sh = new ActionDescriptor();
  sh.putEnumerated(PSC_c('TEXT'), PSC_c('TEXT'), PSC_c('Pnt '));
  sh.putEnumerated(PSC_c('Ornt'), PSC_c('Ornt'), PSC_c('Hrzn'));
  var a = (spec.rotation || 0) * Math.PI / 180, tr = new ActionDescriptor();
  tr.putDouble(PSC_s('xx'), Math.cos(a)); tr.putDouble(PSC_s('xy'), Math.sin(a));
  tr.putDouble(PSC_s('yx'), -Math.sin(a)); tr.putDouble(PSC_s('yy'), Math.cos(a));
  tr.putDouble(PSC_s('tx'), 0); tr.putDouble(PSC_s('ty'), 0);
  sh.putObject(PSC_c('Trnf'), PSC_c('Trnf'), tr);
  shapeList.putObject(PSC_s('textShape'), sh);
  tk.putList(PSC_s('textShape'), shapeList);
  tk.putList(PSC_c('Txtt'), PSC_textStyleList(spec, text.length + 1));
  tk.putList(PSC_s('paragraphStyleRange'), PSC_paragraphList(spec.align, text.length + 1));
  d.putObject(PSC_c('Usng'), PSC_c('TxLr'), tk);
  executeAction(PSC_c('Mk  '), d, DialogModes.NO);
  if (spec.name) PSC_setTargetLayerName(spec.name);
  var layer = doc.activeLayer;
  if (layer.textItem.contents != text) throw Error('Photoshop changed the text of ' + spec.name);
  return layer;
}

// Circle path for type-on-path: 4 Bezier segments, first anchor at a0 (deg, 0 = +x, clockwise positive),
// travelling clockwise (cw) or counter-clockwise (ccw) on screen.
function PSC_circlePoints(cx, cy, r, a0, cw) {
  var k = 0.5522847498307936 * r, pts = [];
  for (var i = 0; i < 4; i++) {
    var a = (a0 + (cw ? 90 : -90) * i) * Math.PI / 180, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    var tx = -Math.sin(a), ty = Math.cos(a);
    if (!cw) { tx = -tx; ty = -ty; }
    pts.push({ anchor: [x, y], 'in': [x - k * tx, y - k * ty], out: [x + k * tx, y + k * ty] });
  }
  return pts;
}
// textOnCircle(doc, spec) -> ArtLayer (live TEXT layer, type on a circular path).
// spec = { name, text, center:[cx,cy], radius (baseline radius px), start_deg | center_deg, direction:'cw'|'ccw',
//          font, size_px, color, tracking, horizontal_scale, antialias }
// cw: glyphs stand outside the circle (baseline on the circle), reading clockwise (typical top arc).
// ccw: glyphs stand inside the circle (baseline on the circle), reading counter-clockwise (typical bottom arc).
// start_deg: text origin (baseline start, before the first glyph's side bearing) sits at that angle.
// center_deg: text is centred on that angle (paragraph centre alignment between path-range brackets).
function textOnCircle(doc, spec) {
  var text = String(spec.text), cw = (spec.direction || 'cw') != 'ccw', centered = spec.center_deg !== undefined;
  var a0 = centered ? spec.center_deg + 180 : spec.start_deg;
  if (a0 === undefined) throw Error('textOnCircle ' + spec.name + ': start_deg or center_deg required');
  var pts = PSC_circlePoints(spec.center[0], spec.center[1], spec.radius, a0, cw);
  var d = new ActionDescriptor(), ref = new ActionReference();
  ref.putClass(PSC_c('TxLr')); d.putReference(PSC_c('null'), ref);
  var tk = new ActionDescriptor();
  tk.putString(PSC_c('Txt '), text);
  tk.putEnumerated(PSC_c('AntA'), PSC_c('Annt'), PSC_s(PSC_AA[spec.antialias || 'sharp']));
  var shapeList = new ActionList(), sh = new ActionDescriptor();
  sh.putEnumerated(PSC_c('TEXT'), PSC_c('TEXT'), PSC_s('onACurve'));
  sh.putEnumerated(PSC_c('Ornt'), PSC_c('Ornt'), PSC_c('Hrzn'));
  var tr = new ActionDescriptor();
  tr.putDouble(PSC_s('xx'), 1); tr.putDouble(PSC_s('xy'), 0); tr.putDouble(PSC_s('yx'), 0);
  tr.putDouble(PSC_s('yy'), 1); tr.putDouble(PSC_s('tx'), 0); tr.putDouble(PSC_s('ty'), 0);
  sh.putObject(PSC_c('Trnf'), PSC_c('Trnf'), tr);
  var pd = new ActionDescriptor();
  pd.putList(PSC_s('pathComponents'), PSC_pathComponentsList([{ closed: true, op: 'add', points: pts }]));
  sh.putObject(PSC_c('Path'), PSC_s('pathClass'), pd);
  // tRange is in path-segment units (0..4 for the 4-segment circle). Default end (-1) becomes 2.999 = 270 deg.
  var rg = new ActionDescriptor();
  rg.putDouble(PSC_c('Strt'), 0); rg.putDouble(PSC_c('End '), centered ? 4 : 3.999);
  sh.putObject(PSC_s('tRange'), PSC_s('range'), rg);
  shapeList.putObject(PSC_s('textShape'), sh);
  tk.putList(PSC_s('textShape'), shapeList);
  tk.putList(PSC_c('Txtt'), PSC_textStyleList(spec, text.length + 1));
  tk.putList(PSC_s('paragraphStyleRange'), PSC_paragraphList(centered ? 'center' : 'left', text.length + 1));
  d.putObject(PSC_c('Usng'), PSC_c('TxLr'), tk);
  executeAction(PSC_c('Mk  '), d, DialogModes.NO);
  if (spec.name) PSC_setTargetLayerName(spec.name);
  var layer = doc.activeLayer;
  if (layer.textItem.contents != text) throw Error('Photoshop changed the text of ' + spec.name);
  return layer;
}
// textShape kind of a text layer ('paint' = point text, 'box' = paragraph, 'onACurve' = type on path).
function PSC_textShapeKind(layerId) {
  var tk = PSC_layerDesc(layerId).getObjectValue(PSC_s('textKey'));
  var sh = tk.getList(PSC_s('textShape')).getObjectValue(0);
  return typeIDToStringID(sh.getEnumerationValue(PSC_c('TEXT')));
}
// Live-type round trip on a reopened document: append a char, verify, restore, verify.
function PSC_textRoundTrip(layer) {
  var t = layer.textItem, orig = t.contents;
  t.contents = orig + 'Z';
  var ok1 = t.contents == orig + 'Z';
  t.contents = orig;
  return ok1 && t.contents == orig;
}

// fontMetrics(psName [, sizePx]): ink metrics measured in Photoshop on a throwaway document (opened and closed
// here; the caller's active document is restored). Point text is created at origin (x0,y0); every value is
// relative to that origin (baseline-left), in px at sizePx (default 100). cap_height = ink top of "H" above the
// baseline, x_height from "x", ascender from "d", descender from "p"; *_bounds = [left, top, right, bottom].
function fontMetrics(psName, sizePx) {
  sizePx = sizePx || 100;
  var prev = app.documents.length ? app.activeDocument : null;
  var tmp = PSC_newDoc('PSCAP_fontMetrics_tmp', Math.round(sizePx * 6), Math.round(sizePx * 4), false);
  var out = { font: psName, size_px: sizePx }, x0 = Math.round(sizePx * 2), y0 = Math.round(sizePx * 3);
  try {
    var probes = [['H', 'cap'], ['x', 'x'], ['p', 'desc'], ['d', 'asc'], ['O', 'O']];
    for (var i = 0; i < probes.length; i++) {
      var l = textLayer(tmp, { name: 'metric ' + probes[i][0], text: probes[i][0], font: psName, size_px: sizePx, position: [x0, y0], antialias: 'sharp' });
      var b = PSC_bounds(l), p = l.textItem.position;
      out[probes[i][1] + '_bounds'] = [b[0] - x0, b[1] - y0, b[2] - x0, b[3] - y0];
      out[probes[i][1] + '_dom_position'] = [p[0].as('px'), p[1].as('px')];
      l.remove();   // safe: the white Background layer stays below
    }
  } finally {
    tmp.close(SaveOptions.DONOTSAVECHANGES);
    if (prev) app.activeDocument = prev;
  }
  out.cap_height = -out.cap_bounds[1];
  out.x_height = -out.x_bounds[1];
  out.ascender_d = -out.asc_bounds[1];
  out.descender_p = out.desc_bounds[3];
  out.O_overshoot_bottom = out.O_bounds[3];
  out.H_left_bearing = out.cap_bounds[0];
  out.H_bottom_minus_baseline = out.cap_bounds[3];
  return out;
}

// ---------------------------------------------------------------- 4. groups, order, blend modes
// Manifest order is back -> front. Build layers in manifest order and call placeLayer(doc, layer, spec.group)
// right after creating each one: the layer goes to the TOP of its group (or of the document). A group path
// "Panel/Sub" is reused only if that group chain is currently the top-most item of its parent; otherwise a new
// group with the same name is created, so the final back-to-front order always equals manifest order
// (non-contiguous group members produce two groups with the same name -- the lead's manifest should keep
// group members contiguous when a single group is wanted).
function PSC_topChild(container) { return container.layers.length ? container.layers[0] : null; }
function PSC_moveToTop(item, container) {
  var top = PSC_topChild(container);
  if (top && top.id == item.id) return;   // compare ids: DOM wrapper equality is unreliable
  if (top) item.move(top, ElementPlacement.PLACEBEFORE);
  else item.move(container, ElementPlacement.INSIDE);
}
function ensureGroupPath(doc, path) {
  var parent = doc;
  if (!path) return doc;
  var parts = String(path).split('/');
  for (var i = 0; i < parts.length; i++) {
    var top = PSC_topChild(parent);
    if (top && top.typename == 'LayerSet' && top.name == parts[i]) { parent = top; continue; }
    // container.layerSets.add() creates the group inside that container; LayerSet.move(emptySet, INSIDE)
    // throws "Illegal Argument", so nested groups must be created in place, not moved in.
    var g = parent.layerSets.add();
    g.name = parts[i];
    PSC_moveToTop(g, parent);
    parent = g;
  }
  return parent;
}
function placeLayer(doc, layer, groupPath) {
  var container = ensureGroupPath(doc, groupPath);
  PSC_moveToTop(layer, container);
  return container;
}
function setBlendMode(layer, name) {
  var doc = layer.parent; while (doc.typename != 'Document') doc = doc.parent;
  doc.activeLayer = layer;
  var d = new ActionDescriptor(), r = new ActionReference(), to = new ActionDescriptor();
  r.putEnumerated(PSC_c('Lyr '), PSC_c('Ordn'), PSC_c('Trgt'));
  d.putReference(PSC_c('null'), r);
  to.putEnumerated(PSC_c('Md  '), PSC_c('BlnM'), PSC_blendId(name));
  d.putObject(PSC_c('T   '), PSC_c('Lyr '), to);
  executeAction(PSC_c('setd'), d, DialogModes.NO);
}
// Back-to-front flat list [{path:'A/B', name, id, kind, mode, isGroup}] read through Action Manager.
function PSC_flatStack(doc) {
  var r = new ActionReference();
  r.putProperty(PSC_c('Prpr'), PSC_c('NmbL'));
  r.putEnumerated(PSC_c('Dcmn'), PSC_c('Ordn'), PSC_c('Trgt'));
  var n = executeActionGet(r).getInteger(PSC_c('NmbL')), hasBg = false;
  try { var br = new ActionReference(); br.putIndex(PSC_c('Lyr '), 0); executeActionGet(br); hasBg = true; } catch (e) {}
  var stack = [], rows = [];
  for (var i = n; i >= (hasBg ? 0 : 1); i--) {
    var lr = new ActionReference(); lr.putIndex(PSC_c('Lyr '), i);
    var ld = executeActionGet(lr), sec = typeIDToStringID(ld.getEnumerationValue(PSC_s('layerSection')));
    var name = ld.getString(PSC_c('Nm  '));
    if (sec == 'layerSectionEnd') { stack.pop(); continue; }
    var row = { path: stack.join('/'), name: name, id: ld.getInteger(PSC_c('LyrI')), isGroup: sec == 'layerSectionStart',
                kind: ld.hasKey(PSC_s('layerKind')) ? ld.getInteger(PSC_s('layerKind')) : -1,
                mode: typeIDToStringID(ld.getEnumerationValue(PSC_c('Md  '))),
                opacity: Math.round(ld.getInteger(PSC_c('Opct')) / 2.55) };
    rows.push(row);
    if (row.isGroup) stack.push(name);
  }
  rows.reverse();
  return rows;
}
// Fast path for big manifests: call right after creating each layer (the new layer is the active layer).
// When the group path equals the previous layer's, Photoshop already created the new layer directly above the
// previous one inside the same group, so nothing is moved. Only a group change touches the (slow) DOM.
// state = {} per document; do not change the active layer between creating and placing.
function placeActiveLayer(doc, groupPath, state) {
  groupPath = groupPath || '';
  if (state.last !== undefined && state.last === groupPath) return;
  placeLayer(doc, doc.activeLayer, groupPath);
  state.last = groupPath;
}

// ---------------------------------------------------------------- 5. selection -> vector
// Color Range on the ACTIVE document (flattened source copy). hex = sampled color, fuzziness 0-200.
// Optional box [x,y,w,h] intersects the result with a rectangle.
function PSC_colorRangeSelect(doc, hex, fuzziness, box) {
  doc.selection.deselect();
  var lab = PSC_solid(hex).lab, sample = new ActionDescriptor();
  sample.putDouble(PSC_c('Lmnc'), lab.l); sample.putDouble(PSC_c('A   '), lab.a); sample.putDouble(PSC_c('B   '), lab.b);
  var d = new ActionDescriptor();
  d.putInteger(PSC_c('Fzns'), fuzziness === undefined ? 10 : fuzziness);
  d.putObject(PSC_c('Mnm '), PSC_c('LbCl'), sample);
  d.putObject(PSC_c('Mxm '), PSC_c('LbCl'), sample);
  executeAction(PSC_c('ClrR'), d, DialogModes.NO);
  if (box) doc.selection.select([[box[0], box[1]], [box[0] + box[2], box[1]], [box[0] + box[2], box[1] + box[3]], [box[0], box[1] + box[3]]], SelectionType.INTERSECT, 0, false);
}
// Threshold route: selection = pixels whose channel value is >= level (or < level when invert). Works on a
// duplicate of doc (closed here), then loads the binary result into doc's selection via a saved alpha channel.
function PSC_thresholdSelect(doc, channelIndex, level, invert) {
  var dup = doc.duplicate('PSCAP_threshold_tmp', true);
  try {
    app.activeDocument = dup;
    // keep only the chosen channel: copy it to all channels via Channel Mixer is overkill; use a Levels-free route:
    var ch = dup.channels[channelIndex];
    dup.selection.load(ch, SelectionType.REPLACE, false);
    var tmp = dup.artLayers.add();
    dup.selection.selectAll(); dup.selection.fill(PSC_solid('000000'));
    dup.selection.load(ch, SelectionType.REPLACE, false);
    dup.selection.fill(PSC_solid('FFFFFF'));
    dup.selection.deselect();
    tmp.threshold(level);
    dup.selection.load(dup.channels[0], SelectionType.REPLACE, false);   // white = >= level
    if (invert) dup.selection.invert();
    var saved = dup.channels.add(); saved.name = 'PSC_threshold';
    dup.selection.store(saved, SelectionType.REPLACE);
    app.activeDocument = doc;
    doc.selection.load(saved, SelectionType.REPLACE, false);
  } finally {
    dup.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc;
  }
}
// Selection -> Work Path (tolerance px). Returns the raw <pathClass> descriptor and deletes the Work Path.
function PSC_selectionToPathContents(doc, tolerance) {
  var d = new ActionDescriptor(), r = new ActionReference();
  r.putClass(PSC_c('Path')); d.putReference(PSC_c('null'), r);
  var f = new ActionReference(); f.putProperty(PSC_c('csel'), PSC_c('fsel'));
  d.putReference(PSC_c('From'), f);
  d.putUnitDouble(PSC_c('Tlrn'), PSC_c('#Pxl'), tolerance);
  executeAction(PSC_c('Mk  '), d, DialogModes.NO);
  var g = new ActionReference(); g.putProperty(PSC_c('Path'), PSC_c('WrPt'));
  var pc = executeActionGet(g).getObjectValue(PSC_s('pathContents'));
  PSC_deleteWorkPath();
  return pc;
}
// Build a shape layer in doc from a raw <pathClass> descriptor (exact copy of components/ops).
function PSC_vectorFromPathContents(doc, pathContents, spec) {
  var d = new ActionDescriptor(), ref = new ActionReference();
  ref.putClass(PSC_s('contentLayer')); d.putReference(PSC_c('null'), ref);
  var content = new ActionDescriptor(), fill = new ActionDescriptor();
  fill.putObject(PSC_c('Clr '), PSC_c('RGBC'), PSC_rgbDesc(spec.fill || '000000'));
  content.putObject(PSC_c('Type'), PSC_s('solidColorLayer'), fill);
  var pc = new ActionDescriptor();
  pc.putList(PSC_s('pathComponents'), pathContents.getList(PSC_s('pathComponents')));
  content.putObject(PSC_c('Shp '), PSC_s('pathClass'), pc);
  if (spec.opacity !== undefined) content.putUnitDouble(PSC_c('Opct'), PSC_c('#Prc'), spec.opacity);
  d.putObject(PSC_c('Usng'), PSC_s('contentLayer'), content);
  app.activeDocument = doc;
  executeAction(PSC_c('Mk  '), d, DialogModes.NO);
  if (spec.name) PSC_setTargetLayerName(spec.name);
  return doc.activeLayer;
}

(function () {
  var spec = CFG.spec, root = CFG.output, doc = null, sourceDoc = null, sourceOwned = false, stage = 'start';
  var oldRuler = app.preferences.rulerUnits;
  var oldType = app.preferences.typeUnits;
  var oldDialogs = app.displayDialogs;
  var oldSmartQuotes = app.preferences.smartQuotes;
  function c(s) { return charIDToTypeID(s); }
  function sid(s) { return stringIDToTypeID(s); }
  function log(s) {
    var f = new File(root + '/build-log.txt');
    f.encoding = 'UTF8'; f.open('a'); f.writeln(s); f.close();
  }
  function hexColor(s) { var v = new SolidColor(); v.rgb.hexValue = s; return v; }
  function rgb(s) {
    var d = new ActionDescriptor();
    d.putDouble(c('Rd  '), parseInt(s.substr(0, 2), 16));
    d.putDouble(c('Grn '), parseInt(s.substr(2, 2), 16));
    d.putDouble(c('Bl  '), parseInt(s.substr(4, 2), 16));
    return d;
  }
  function bounds(layer) {
    var b = layer.bounds;
    return [b[0].as('px'), b[1].as('px'), b[2].as('px'), b[3].as('px')];
  }
  function shape(layer) {
    var b = layer.box, d = new ActionDescriptor(), ref = new ActionReference();
    ref.putClass(sid('contentLayer')); d.putReference(c('null'), ref);
    var content = new ActionDescriptor(), fill = new ActionDescriptor();
    fill.putObject(c('Clr '), c('RGBC'), rgb(layer.color));
    content.putObject(c('Type'), sid('solidColorLayer'), fill);
    var geometry = new ActionDescriptor();
    geometry.putUnitDouble(c('Top '), c('#Pxl'), b[1]);
    geometry.putUnitDouble(c('Left'), c('#Pxl'), b[0]);
    geometry.putUnitDouble(c('Btom'), c('#Pxl'), b[1] + b[3]);
    geometry.putUnitDouble(c('Rght'), c('#Pxl'), b[0] + b[2]);
    if (layer.radius_px !== undefined && layer.geometry != 'ellipse') {
      geometry.putInteger(sid('unitValueQuadVersion'), 1);
      geometry.putUnitDouble(sid('topLeft'), c('#Pxl'), layer.radius_px);
      geometry.putUnitDouble(sid('topRight'), c('#Pxl'), layer.radius_px);
      geometry.putUnitDouble(sid('bottomLeft'), c('#Pxl'), layer.radius_px);
      geometry.putUnitDouble(sid('bottomRight'), c('#Pxl'), layer.radius_px);
    }
    content.putObject(c('Shp '), c(layer.geometry == 'ellipse' ? 'Elps' : 'Rctn'), geometry);
    d.putObject(c('Usng'), sid('contentLayer'), content);
    executeAction(c('Mk  '), d, DialogModes.NO);
    var result = doc.activeLayer; result.name = layer.name; return result;
  }
  function place(layer) {
    var d = new ActionDescriptor();
    d.putPath(c('null'), new File(layer.file));
    d.putEnumerated(c('FTcs'), c('QCSt'), c('Qcsa'));
    executeAction(c('Plc '), d, DialogModes.NO);
    var result = doc.activeLayer, b = bounds(result), box = layer.box;
    var bw = b[2] - b[0], bh = b[3] - b[1];
    var sx = box[2] / bw, sy = box[3] / bh;
    var ratio = layer.fit == 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);
    result.resize(ratio * 100, ratio * 100, AnchorPosition.MIDDLECENTER);
    b = bounds(result);
    result.translate(UnitValue(box[0] + box[2] / 2 - (b[0] + b[2]) / 2, 'px'),
                     UnitValue(box[1] + box[3] / 2 - (b[1] + b[3]) / 2, 'px'));
    result.name = layer.name; return result;
  }

  function typeV2(layer) {
    var t = {}, k;
    for (k in layer) if (layer.hasOwnProperty(k)) t[k] = layer[k];
    t.size_px = layer.font_size_px || layer.box[3] * 1.2;
    t.antialias = layer.anti_alias || 'sharp';
    if (layer.on_circle) {
      for (k in layer.on_circle) if (layer.on_circle.hasOwnProperty(k)) t[k] = layer.on_circle[k];
      return textOnCircle(doc, t);
    }
    t.position = [layer.box[0], layer.box[1] + t.size_px];
    var result = textLayer(doc, t), b = bounds(result);
    if (layer.font_size_px === undefined) {
      var factor = Math.min(layer.box[2] / (b[2]-b[0]), layer.box[3] / (b[3]-b[1]));
      result.textItem.size = UnitValue(t.size_px * factor, 'px');
      b = bounds(result);
    }
    if (layer.fit_text_box) {
      var heightRatio = layer.box[3] / (b[3]-b[1]);
      result.textItem.size = UnitValue(result.textItem.size.as('px') * heightRatio, 'px');
      b = bounds(result);
      result.textItem.horizontalScale = result.textItem.horizontalScale * layer.box[2] / (b[2]-b[0]);
      b = bounds(result);
      // DOM horizontalScale can quantize and leave several pixels of error on long lines.
      // Refine with the editable text layer transform, measuring after each bounded correction.
      for (var fitPass=0; fitPass<3; fitPass++) {
        var widthError=Math.abs((b[2]-b[0])-layer.box[2]);
        var heightError=Math.abs((b[3]-b[1])-layer.box[3]);
        if (widthError<=1 && heightError<=1) break;
        result.resize(100*layer.box[2]/(b[2]-b[0]),100*layer.box[3]/(b[3]-b[1]),AnchorPosition.TOPLEFT);
        b=bounds(result);
      }
    }
    result.translate(UnitValue(layer.box[0]-b[0], 'px'), UnitValue(layer.box[1]-b[1], 'px'));
    return result;
  }
  function typeLayer(layer) {
    var result = doc.artLayers.add(); result.kind = LayerKind.TEXT; result.name = layer.name;
    var t = result.textItem, b = layer.box;
    t.kind = TextType.POINTTEXT; t.contents = layer.text.replace(/\n/g, '\r'); t.font = layer.font;
    if (t.contents.replace(/\r/g, '\n') != layer.text) {
      throw Error('Photoshop substituted characters in: ' + layer.name + '. Check smart quotes and exact copy.');
    }
    t.size = UnitValue(layer.font_size_px || b[3] * 1.2, 'px');
    t.color = hexColor(layer.color); t.antiAliasMethod = AntiAlias.SHARP;
    if (layer.tracking !== undefined) t.tracking = layer.tracking;
    if (layer.leading_px !== undefined) t.leading = UnitValue(layer.leading_px, 'px');
    t.position = [UnitValue(b[0], 'px'), UnitValue(b[1] + b[3], 'px')];
    if (layer.font_size_px === undefined) {
      var visible = bounds(result), h = visible[3] - visible[1], w = visible[2] - visible[0];
      if (h > 0 && w > 0) {
        var factor = Math.min(b[3] / h, b[2] / w);
        t.size = UnitValue(t.size.as('px') * factor, 'px');
      }
    }
    var actual = bounds(result);
    result.translate(UnitValue(b[0] - actual[0], 'px'), UnitValue(b[1] - actual[1], 'px'));
    return result;
  }
  function gradient(layer) {
    var base = shape({name: layer.name, type: 'shape', box: layer.box, color: layer.stops[0][1]});
    var stops = layer.stops, fade = new ActionDescriptor();
    fade.putString(c('Nm  '), layer.name);
    fade.putEnumerated(c('GrdF'), c('GrdF'), c('CstS'));
    fade.putDouble(c('Intr'), 4096);
    var colors = new ActionList(), transparency = new ActionList();
    for (var i = 0; i < stops.length; i++) {
      var value = stops[i], position = Math.round(value[0] * 4096);
      var cs = new ActionDescriptor(), ts = new ActionDescriptor();
      cs.putObject(c('Clr '), c('RGBC'), rgb(value[1]));
      cs.putEnumerated(c('Type'), c('Clry'), c('UsrS'));
      cs.putInteger(c('Lctn'), position); cs.putInteger(c('Mdpn'), 50);
      colors.putObject(c('Clrt'), cs);
      ts.putUnitDouble(c('Opct'), c('#Prc'), value[2] * 100);
      ts.putInteger(c('Lctn'), position); ts.putInteger(c('Mdpn'), 50);
      transparency.putObject(c('TrnS'), ts);
    }
    fade.putList(c('Clrs'), colors); fade.putList(c('Trns'), transparency);
    var fx = new ActionDescriptor();
    fx.putBoolean(c('enab'), true); fx.putBoolean(sid('present'), true);
    fx.putBoolean(sid('showInDialog'), true);
    fx.putEnumerated(c('Md  '), c('BlnM'), c('Nrml'));
    fx.putUnitDouble(c('Opct'), c('#Prc'), 100);
    fx.putObject(c('Grad'), c('Grdn'), fade);
    fx.putUnitDouble(c('Angl'), c('#Ang'), layer.angle === undefined ? -90 : layer.angle);
    fx.putEnumerated(c('Type'), c('GrdT'), c('Lnr '));
    fx.putBoolean(c('Rvrs'), false); fx.putBoolean(c('Dthr'), true);
    fx.putBoolean(c('Algn'), true); fx.putUnitDouble(c('Scl '), c('#Prc'), 100);
    var effects = new ActionDescriptor();
    effects.putUnitDouble(c('Scl '), c('#Prc'), 100);
    effects.putObject(c('GrFl'), c('GrFl'), fx);
    var ref = new ActionReference(); ref.putEnumerated(c('Lyr '), c('Ordn'), c('Trgt'));
    var set = new ActionDescriptor(), to = new ActionDescriptor();
    set.putReference(c('null'), ref);
    to.putUnitDouble(sid('fillOpacity'), c('#Prc'), 0);
    to.putObject(sid('layerEffects'), sid('layerEffects'), effects);
    set.putObject(c('T   '), c('Lyr '), to);
    executeAction(c('setd'), set, DialogModes.NO);
    return base;
  }
  function polygon(layer) {
    var sub = new SubPathInfo(), points = [];
    sub.operation = ShapeOperation.SHAPEADD; sub.closed = true;
    for (var i = 0; i < layer.points.length; i++) {
      var pp = new PathPointInfo(), xy = layer.points[i];
      pp.kind = PointKind.CORNERPOINT;
      pp.anchor = [xy[0], xy[1]];
      pp.leftDirection = [xy[0], xy[1]];
      pp.rightDirection = [xy[0], xy[1]];
      points.push(pp);
    }
    sub.entireSubPath = points;
    var path = doc.pathItems.add(layer.name + ' work path', [sub]);
    path.makeSelection(0, true);
    var result = doc.artLayers.add(); result.name = layer.name;
    doc.selection.fill(hexColor(layer.color), ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
    // Retain the named path so the polygon points can be inspected and changed later.
    return result;
  }
  function bezierFill(layer) {
    var sub = new SubPathInfo(), points = [];
    sub.operation = ShapeOperation.SHAPEADD; sub.closed = true;
    for (var i = 0; i < layer.points.length; i++) {
      var data = layer.points[i], pp = new PathPointInfo();
      pp.anchor = data.anchor;
      pp.leftDirection = data.out || data.anchor;
      pp.rightDirection = data['in'] || data.anchor;
      pp.kind = (data['in'] || data.out) ? PointKind.SMOOTHPOINT : PointKind.CORNERPOINT;
      points.push(pp);
    }
    sub.entireSubPath = points;
    var path = doc.pathItems.add(layer.name + ' editable path', [sub]);
    path.makeSelection(0, true);
    var result = doc.artLayers.add(); result.name = layer.name;
    doc.selection.fill(hexColor(layer.color), ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
    return result;
  }
  function colorExtract(layer) {
    if (!sourceDoc) throw Error('color_extract needs a source document');
    app.activeDocument = sourceDoc;
    sourceDoc.selection.deselect();
    var col = hexColor(layer.color), lab = col.lab;
    var sample = new ActionDescriptor();
    sample.putDouble(c('Lmnc'), lab.l);
    sample.putDouble(c('A   '), lab.a);
    sample.putDouble(c('B   '), lab.b);
    var range = new ActionDescriptor();
    range.putInteger(c('Fzns'), layer.fuzziness === undefined ? 10 : layer.fuzziness);
    range.putObject(c('Mnm '), c('LbCl'), sample);
    range.putObject(c('Mxm '), c('LbCl'), sample);
    executeAction(c('ClrR'), range, DialogModes.NO);
    var b = layer.box, region = [[b[0], b[1]], [b[0]+b[2], b[1]],
                                 [b[0]+b[2], b[1]+b[3]], [b[0], b[1]+b[3]]];
    sourceDoc.selection.select(region, SelectionType.INTERSECT, 0, false);
    var sourceBounds = sourceDoc.selection.bounds;
    var targetX = sourceBounds[0].as('px'), targetY = sourceBounds[1].as('px');
    sourceDoc.selection.copy(false);
    sourceDoc.selection.deselect();
    app.activeDocument = doc;
    var result = doc.paste();
    result.name = layer.name;
    var actual = bounds(result);
    result.translate(UnitValue(targetX - actual[0], 'px'), UnitValue(targetY - actual[1], 'px'));
    return result;
  }
  function addMaskFromTransparency() {
    var set = new ActionDescriptor(), selection = new ActionReference();
    selection.putProperty(c('Chnl'), c('fsel'));
    set.putReference(c('null'), selection);
    var transparent = new ActionReference();
    transparent.putEnumerated(sid('channel'), sid('channel'), sid('transparencyEnum'));
    set.putReference(c('T   '), transparent);
    executeAction(c('setd'), set, DialogModes.NO);
    var make = new ActionDescriptor(), at = new ActionReference();
    make.putClass(sid('new'), sid('channel'));
    at.putEnumerated(sid('channel'), sid('channel'), sid('mask')); make.putReference(sid('at'), at);
    make.putEnumerated(sid('using'), sid('userMaskEnabled'), sid('revealSelection'));
    executeAction(sid('make'), make, DialogModes.NO);
    doc.selection.deselect();
  }
  function addMaskFromFile(path, target) {
    // Apply a single numeric channel, not RGB luminosity (which changes gamma).
    var maskDoc = null;
    try {
      var maskFile = new File(path), openMask = null;
      for (var mi = 0; mi < app.documents.length; mi++) {
        try { if (app.documents[mi].fullName.fsName == maskFile.fsName) openMask = app.documents[mi]; } catch (ignoreMaskPath) {}
      }
      maskDoc = openMask ? openMask.duplicate('Mask transfer working copy', false) : app.open(maskFile);
      if (maskDoc.width.as('px') != doc.width.as('px') || maskDoc.height.as('px') != doc.height.as('px'))
        throw Error('External mask dimensions differ from canvas');
      if (maskDoc.mode != DocumentMode.RGB) throw Error('External mask must be RGB');
      maskDoc.flatten();
      app.activeDocument = doc; doc.activeLayer = target;
      var make = new ActionDescriptor(), at = new ActionReference();
      make.putClass(sid('new'), sid('channel'));
      at.putEnumerated(sid('channel'), sid('channel'), sid('mask')); make.putReference(sid('at'), at);
      make.putEnumerated(sid('using'), sid('userMaskEnabled'), sid('revealAll'));
      executeAction(sid('make'), make, DialogModes.NO);
      var select = new ActionDescriptor(), channel = new ActionReference();
      channel.putEnumerated(c('Chnl'), c('Chnl'), c('Msk ')); select.putReference(c('null'), channel);
      executeAction(c('slct'), select, DialogModes.NO);
      var apply = new ActionDescriptor(), calculation = new ActionDescriptor(), source = new ActionReference();
      source.putEnumerated(c('Chnl'), c('Chnl'), c('Rd  ')); source.putProperty(c('Lyr '), c('Bckg'));
      source.putName(c('Dcmn'), maskDoc.name); calculation.putReference(c('T   '), source);
      calculation.putBoolean(c('Invr'), false); calculation.putEnumerated(c('Clcl'), c('Clcn'), c('Nrml'));
      calculation.putUnitDouble(c('Opct'), c('#Prc'), 100); calculation.putBoolean(c('PrsT'), false);
      apply.putObject(c('With'), c('Clcl'), calculation); executeAction(c('AppI'), apply, DialogModes.NO);
      doc.activeChannels = doc.componentChannels;
    } finally {
      if (maskDoc) maskDoc.close(SaveOptions.DONOTSAVECHANGES);
      app.activeDocument = doc; doc.activeChannels = doc.componentChannels;
    }
  }
  function layerEffects(layer, effects) {
    if (!effects) return;
    doc.activeLayer = layer;
    var ref = new ActionReference();
    ref.putProperty(c('Prpr'), sid('layerEffects'));
    ref.putEnumerated(c('Lyr '), c('Ordn'), c('Trgt'));
    var existing = executeActionGet(ref);
    var all = existing.hasKey(sid('layerEffects')) ? existing.getObjectValue(sid('layerEffects')) : new ActionDescriptor();
    if (!all.hasKey(c('Scl '))) all.putUnitDouble(c('Scl '), c('#Prc'), 100);
    if (effects.shadow) {
      var v = effects.shadow, sh = new ActionDescriptor();
      sh.putBoolean(c('enab'), true); sh.putBoolean(sid('present'), true);
      sh.putBoolean(sid('showInDialog'), true);
      sh.putEnumerated(c('Md  '), c('BlnM'), c('Mltp'));
      sh.putObject(c('Clr '), c('RGBC'), rgb(v.color));
      sh.putUnitDouble(c('Opct'), c('#Prc'), v.opacity);
      sh.putBoolean(c('uglg'), false);
      sh.putUnitDouble(c('lagl'), c('#Ang'), v.angle);
      sh.putUnitDouble(c('Dstn'), c('#Pxl'), v.distance);
      sh.putUnitDouble(c('Ckmt'), c('#Pxl'), v.spread || 0);
      sh.putUnitDouble(c('blur'), c('#Pxl'), v.size);
      sh.putUnitDouble(c('Nose'), c('#Prc'), 0);
      sh.putBoolean(c('AntA'), false);
      sh.putBoolean(sid('layerConceals'), v.knockout === undefined ? true : v.knockout);
      all.putObject(c('DrSh'), c('DrSh'), sh);
    }
    if (effects.stroke) {
      var s = effects.stroke, st = new ActionDescriptor();
      st.putBoolean(c('enab'), true); st.putBoolean(sid('present'), true);
      st.putBoolean(sid('showInDialog'), true);
      st.putUnitDouble(c('Sz  '), c('#Pxl'), s.size);
      st.putEnumerated(sid('style'), sid('frameStyle'), sid('outsetFrame'));
      st.putEnumerated(c('Md  '), c('BlnM'), c('Nrml'));
      st.putUnitDouble(c('Opct'), c('#Prc'), s.opacity);
      st.putEnumerated(c('FlTp'), c('FrFl'), c('SClr'));
      st.putObject(c('Clr '), c('RGBC'), rgb(s.color));
      all.putObject(c('FrFX'), c('FrFX'), st);
    }
    if (effects.glow) {
      var g = effects.glow, outer = new ActionDescriptor();
      outer.putBoolean(c('enab'), true); outer.putBoolean(sid('present'), true);
      outer.putBoolean(sid('showInDialog'), true);
      outer.putEnumerated(c('Md  '), c('BlnM'), c('Scrn'));
      outer.putObject(c('Clr '), c('RGBC'), rgb(g.color));
      outer.putUnitDouble(c('Opct'), c('#Prc'), g.opacity);
      outer.putUnitDouble(c('Nose'), c('#Prc'), 0);
      outer.putUnitDouble(c('Ckmt'), c('#Prc'), 0);
      outer.putUnitDouble(c('blur'), c('#Pxl'), g.size);
      all.putObject(c('OrGl'), c('OrGl'), outer);
    }
    if (effects.gradient_overlay) {
    var stops = effects.gradient_overlay.stops, fade = new ActionDescriptor();
    fade.putString(c('Nm  '), layer.name);
    fade.putEnumerated(c('GrdF'), c('GrdF'), c('CstS'));
    fade.putDouble(c('Intr'), 4096);
    var colors = new ActionList(), transparency = new ActionList();
    for (var i = 0; i < stops.length; i++) {
      var value = stops[i], position = Math.round(value[0] * 4096);
      var cs = new ActionDescriptor(), ts = new ActionDescriptor();
      cs.putObject(c('Clr '), c('RGBC'), rgb(value[1]));
      cs.putEnumerated(c('Type'), c('Clry'), c('UsrS'));
      cs.putInteger(c('Lctn'), position); cs.putInteger(c('Mdpn'), 50);
      colors.putObject(c('Clrt'), cs);
      ts.putUnitDouble(c('Opct'), c('#Prc'), value[2] * 100);
      ts.putInteger(c('Lctn'), position); ts.putInteger(c('Mdpn'), 50);
      transparency.putObject(c('TrnS'), ts);
    }
    fade.putList(c('Clrs'), colors); fade.putList(c('Trns'), transparency);
    var fx = new ActionDescriptor();
    fx.putBoolean(c('enab'), true); fx.putBoolean(sid('present'), true);
    fx.putBoolean(sid('showInDialog'), true);
    fx.putEnumerated(c('Md  '), c('BlnM'), c('Nrml'));
    fx.putUnitDouble(c('Opct'), c('#Prc'), 100);
    fx.putObject(c('Grad'), c('Grdn'), fade);
    fx.putUnitDouble(c('Angl'), c('#Ang'), effects.gradient_overlay.angle === undefined ? -90 : effects.gradient_overlay.angle);
    fx.putEnumerated(c('Type'), c('GrdT'), c('Lnr '));
    fx.putBoolean(c('Rvrs'), false); fx.putBoolean(c('Dthr'), true);
    fx.putBoolean(c('Algn'), true); fx.putUnitDouble(c('Scl '), c('#Prc'), 100);
      all.putObject(c('GrFl'), c('GrFl'), fx);
    }
    if (effects.color_overlay) {
      var co = effects.color_overlay, overlay = new ActionDescriptor();
      overlay.putBoolean(c('enab'), true); overlay.putBoolean(sid('present'), true);
      overlay.putBoolean(sid('showInDialog'), true);
      overlay.putEnumerated(c('Md  '), c('BlnM'), c('Nrml'));
      overlay.putUnitDouble(c('Opct'), c('#Prc'), co.opacity);
      overlay.putObject(c('Clr '), c('RGBC'), rgb(co.color));
      all.putObject(c('SoFi'), c('SoFi'), overlay);
    }
    var set = new ActionDescriptor(); set.putReference(c('null'), ref);
    set.putObject(c('T   '), sid('layerEffects'), all);
    executeAction(c('setd'), set, DialogModes.NO);
  }
  function setFillOpacity(layer, value) {
    doc.activeLayer = layer;
    var ref = new ActionReference(), d = new ActionDescriptor(), to = new ActionDescriptor();
    ref.putEnumerated(c('Lyr '), c('Ordn'), c('Trgt'));
    d.putReference(c('null'), ref);
    to.putUnitDouble(sid('fillOpacity'), c('#Prc'), value);
    d.putObject(c('T   '), c('Lyr '), to);
    executeAction(c('setd'), d, DialogModes.NO);
  }
  function hasMask(layer) {
    doc.activeLayer = layer;
    var ref = new ActionReference();
    ref.putProperty(c('Prpr'), sid('hasUserMask'));
    ref.putEnumerated(c('Lyr '), c('Ordn'), c('Trgt'));
    var d = executeActionGet(ref);
    return d.hasKey(sid('hasUserMask')) && d.getBoolean(sid('hasUserMask'));
  }
  function savePSD(path) {
    var options = new PhotoshopSaveOptions();
    options.layers = true; options.embedColorProfile = true;
    options.maximizeCompatibility = true;
    doc.saveAs(new File(path), options, false, Extension.LOWERCASE);
  }
  function savePNG(path) {
    var options = new PNGSaveOptions(); options.interlaced = false;
    doc.saveAs(new File(path), options, true, Extension.LOWERCASE);
  }
  function inventory(layers, lines) {
    for (var i = 0; i < layers.length; i++) {
      var l = layers[i];
      if (l.typename == 'LayerSet') { lines.push('GROUP\t' + l.name); inventory(l.layers, lines); }
      else {
        var row = String(l.kind) + '\t' + l.name;
        if (l.kind == LayerKind.TEXT) row += '\t' + l.textItem.font + '\t' + l.textItem.contents;
        try { row += '\tmask=' + hasMask(l); } catch (e) { row += '\tmask=unknown'; }
        lines.push(row);
      }
    }
  }
  try {
    app.displayDialogs = DialogModes.NO;
    app.preferences.smartQuotes = false;
    app.preferences.rulerUnits = Units.PIXELS;
    app.preferences.typeUnits = TypeUnits.PIXELS;
    var psd = root + '/editable.psd';
    if (!CFG.overwrite && new File(psd).exists) throw Error('Output PSD already exists');
    stage = 'font preflight';
    for (var fi = 0; fi < spec.layers.length; fi++) {
      var item = spec.layers[fi];
      if (item.type == 'text') {
        if (!PSC_fontExists(item.font)) throw Error('Missing Photoshop font: ' + item.font);
      }
    }
    stage = 'create document';
    doc = app.documents.add(UnitValue(spec.canvas.width, 'px'), UnitValue(spec.canvas.height, 'px'), 72,
      'Editable reconstruction', NewDocumentMode.RGB, DocumentFill.WHITE, 1,
      BitsPerChannelType.EIGHT, 'sRGB IEC61966-2.1');
    doc.backgroundLayer.name = '00 Opaque base';
    shape({name: '01 Background color', box: [0, 0, spec.canvas.width, spec.canvas.height], color: spec.canvas.background});
    if (spec.source_file) {
      stage = 'open color extraction source';
      var requested = new File(spec.source_file), existingSource = null;
      for (var si = 0; si < app.documents.length; si++) {
        try {
          if (app.documents[si].fullName.fsName == requested.fsName) existingSource = app.documents[si];
        } catch (ignoredPath) {}
      }
      if (existingSource) sourceDoc = existingSource.duplicate('Extraction working copy', false);
      else sourceDoc = app.open(requested);
      sourceOwned = true;
      if (sourceDoc.width.as('px') != spec.canvas.width || sourceDoc.height.as('px') != spec.canvas.height)
        throw Error('Color extraction source dimensions differ from canvas');
      if (sourceDoc.layers.length > 1) sourceDoc.flatten();
      app.activeDocument = doc;
    }
    var groupState = {};
    for (var i = 0; i < spec.layers.length; i++) {
      var layer = spec.layers[i], made = null;
      stage = 'layer ' + (i + 1) + ' ' + layer.name;
      if (layer.type == 'image') made = place(layer);
      else if (layer.type == 'text') made = typeV2(layer);
      else if (layer.type == 'vector') made = vectorLayer(doc, layer);
      else if (layer.type == 'shape') made = shape(layer);
      else if (layer.type == 'gradient') made = gradient(layer);
      else if (layer.type == 'polygon') made = polygon(layer);
      else if (layer.type == 'bezier_fill') made = bezierFill(layer);
      else if (layer.type == 'color_extract') made = colorExtract(layer);
      placeActiveLayer(doc, layer.group, groupState);
      if (layer.blend_mode) setBlendMode(made, layer.blend_mode);
      if (layer.mask_from_alpha) { doc.activeLayer = made; addMaskFromTransparency(); }
      if (layer.mask_file) { addMaskFromFile(layer.mask_file, made); }
      if (layer.mask_feather_px !== undefined) {
        doc.activeLayer = made;
        var maskSet = new ActionDescriptor(), maskRef = new ActionReference(), maskValues = new ActionDescriptor();
        maskRef.putEnumerated(c('Lyr '), c('Ordn'), c('Trgt')); maskSet.putReference(c('null'), maskRef);
        maskValues.putUnitDouble(sid('userMaskFeather'), c('#Pxl'), layer.mask_feather_px);
        maskSet.putObject(c('T   '), c('Lyr '), maskValues); executeAction(c('setd'), maskSet, DialogModes.NO);
      }
      if (layer.blur_px && layer.type == 'image') { doc.activeLayer = made; made.applyGaussianBlur(layer.blur_px); }
      if (layer.opacity !== undefined) made.opacity = layer.opacity;
      if (layer.fill_opacity !== undefined) setFillOpacity(made, layer.fill_opacity);
      if (layer.effects) layerEffects(made, layer.effects);
    }
    stage = 'save PSD'; savePSD(psd);
    stage = 'reopen PSD'; doc.close(SaveOptions.DONOTSAVECHANGES); doc = app.open(new File(psd));
    var rows = []; inventory(doc.layers, rows);
    for (var pi = 0; pi < doc.pathItems.length; pi++) {
      var savedPath = doc.pathItems[pi];
      rows.push('PATH\t' + savedPath.name + '\tsegments=' + savedPath.subPathItems.length);
    }
    var record = new File(root + '/layers.txt');
    record.encoding = 'UTF8'; record.open('w'); record.write(rows.join('\n')); record.close();
    stage = 'verify saved layer types';
    var savedLayers = {};
    function indexSaved(layers) {
      for (var li=0; li<layers.length; li++) {
        var item=layers[li];
        if (item.typename == 'LayerSet') indexSaved(item.layers);
        else {
          if (savedLayers[item.name]) throw Error('Duplicate saved layer: ' + item.name);
          savedLayers[item.name]=item;
        }
      }
    }
    indexSaved(doc.layers);
    for (var vi=0; vi<spec.layers.length; vi++) {
      var wanted=spec.layers[vi], saved=savedLayers[wanted.name];
      if (!saved) throw Error('Missing saved layer: ' + wanted.name);
      var required = '';
      if (wanted.type == 'text') required = 'LayerKind.TEXT';
      else if (wanted.type == 'image') required = 'LayerKind.SMARTOBJECT';
      else if (wanted.type == 'vector' || wanted.type == 'shape' || wanted.type == 'gradient') required = 'LayerKind.SOLIDFILL';
      if (required && String(saved.kind) != required) throw Error('Wrong saved kind: ' + wanted.name + ' actual=' + saved.kind + ' expected=' + required);
      if (wanted.mask_file && !PSC_layerDesc(saved.id).getBoolean(sid('hasUserMask'))) throw Error('External mask lost: ' + wanted.name);
      if (wanted.mask_feather_px !== undefined && Math.abs(PSC_layerDesc(saved.id).getUnitDoubleValue(sid('userMaskFeather')) - wanted.mask_feather_px) > 0.01) throw Error('Mask feather changed: ' + wanted.name);
      if (wanted.type == 'text' && saved.textItem.font != wanted.font) throw Error('Font substitution: ' + wanted.name);
      if (wanted.type == 'text' && wanted.on_circle && PSC_textShapeKind(saved.id) != 'onACurve')
        throw Error('Circular text lost its path: ' + wanted.name);
    }
    stage = 'verify live type';
    var textCount = 0;
    function checkType(layers) {
      var expected = {};
      for (var ei = 0; ei < spec.layers.length; ei++) {
        if (spec.layers[ei].type == 'text') expected[spec.layers[ei].name] = spec.layers[ei].text;
      }
      for (var j = 0; j < layers.length; j++) {
        var current = layers[j];
        if (current.typename == 'LayerSet') checkType(current.layers);
        else if (current.kind == LayerKind.TEXT) {
          textCount++;
          var original = current.textItem.contents;
          if (original.replace(/\r/g, '\n') != expected[current.name]) throw Error('Type mismatch: ' + current.name);
          var beforeTypeStyle = PSC_dumpList(PSC_layerDesc(current.id).getObjectValue(sid('textKey')).getList(sid('textStyleRange')), 0);
          var beforeTypeEdit = doc.activeHistoryState;
          try {
            current.textItem.contents = original + ' ';
            if (current.textItem.contents != original + ' ') throw Error('Type edit failed: ' + current.name);
          } finally { doc.activeHistoryState = beforeTypeEdit; }
          if (current.textItem.contents != original) throw Error('Type restore failed: ' + current.name);
          var afterTypeStyle = PSC_dumpList(PSC_layerDesc(current.id).getObjectValue(sid('textKey')).getList(sid('textStyleRange')), 0);
          if (beforeTypeStyle != afterTypeStyle) throw Error('Type style restore failed: ' + current.name);
        }
      }
    }
    // Type edits can change rendered edges even after history restores identical style data.
    // Probe an owned duplicate and keep the reopened delivery document unmodified.
    var deliveryDoc = doc, typeProbeDoc = null;
    try {
      typeProbeDoc = deliveryDoc.duplicate('PSC disposable text verification', false);
      doc = typeProbeDoc; app.activeDocument = doc;
      checkType(doc.layers);
    } finally {
      if (typeProbeDoc) typeProbeDoc.close(SaveOptions.DONOTSAVECHANGES);
      doc = deliveryDoc; app.activeDocument = doc;
    }
    // Discard in-memory type rendering changes before exporting the saved master.
    doc.close(SaveOptions.DONOTSAVECHANGES); doc = app.open(new File(psd));
    if (sourceOwned && sourceDoc) { sourceDoc.close(SaveOptions.DONOTSAVECHANGES); sourceDoc = null; sourceOwned = false; app.activeDocument = doc; }
    savePSD(psd);
    stage = 'export preview'; savePNG(root + '/preview.png');
    log('SUCCESS: ' + spec.layers.length + ' specified layers, ' + textCount + ' reopened editable text layers');
    doc.close(SaveOptions.DONOTSAVECHANGES); doc = null;
  } catch (e) {
    log('ERROR at ' + stage + ': ' + e.message + ' line ' + e.line);
    if (doc) {
      try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (ignored) {}
      doc = null;
    }
    if (sourceOwned && sourceDoc) {
      try { sourceDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (ignoredSource) {}
      sourceDoc = null; sourceOwned = false;
    }
  } finally {
    app.preferences.rulerUnits = oldRuler;
    app.preferences.typeUnits = oldType;
    app.displayDialogs = oldDialogs;
    app.preferences.smartQuotes = oldSmartQuotes;
  }
})();
