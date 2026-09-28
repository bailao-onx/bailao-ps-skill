(function () {
  var cfg=CUTOUT_CFG, doc=null, opened=null, stage='source preflight';
  var units=app.preferences.rulerUnits, dialogs=app.displayDialogs;
  function c(v){return charIDToTypeID(v)} function s(v){return stringIDToTypeID(v)}
  function report(message){var f=new File(cfg.output+'/processing.txt');f.encoding='UTF8';f.open('w');f.write(message);f.close()}
  function fill(){
    var q=new ActionDescriptor();q.putEnumerated(c('Usng'),c('FlCn'),s('contentAware'));
    q.putUnitDouble(c('Opct'),c('#Prc'),100);q.putEnumerated(c('Md  '),c('BlnM'),c('Nrml'));
    executeAction(c('Fl  '),q,DialogModes.NO);doc.selection.deselect();
  }
  function selectTransparency(){
    var q=new ActionDescriptor(),r=new ActionReference(),t=new ActionReference();
    r.putProperty(c('Chnl'),c('fsel'));q.putReference(c('null'),r);
    t.putEnumerated(s('channel'),s('channel'),s('transparencyEnum'));q.putReference(c('T   '),t);
    executeAction(c('setd'),q,DialogModes.NO);
  }
  try {
    app.preferences.rulerUnits=Units.PIXELS;app.displayDialogs=DialogModes.NO;
    var source=null, file=new File(cfg.source);
    for(var i=0;i<app.documents.length;i++){
      try {if(app.documents[i].fullName.fsName==file.fsName)source=app.documents[i]} catch(ignorePath){}
    }
    if(source && !source.saved)throw Error('Source is open with unsaved changes; save a separate reviewed source first');
    if(!source){opened=app.open(file);source=opened}
    doc=source.duplicate('Photo cutout working copy',false);
    if(opened){opened.close(SaveOptions.DONOTSAVECHANGES);opened=null}
    app.activeDocument=doc;
    if(Math.abs(doc.width.as('px')-cfg.source_size[0])>0.000001 || Math.abs(doc.height.as('px')-cfg.source_size[1])>0.000001)throw Error('Source size changed since plan preflight');
    if(doc.mode!=DocumentMode.RGB)throw Error('Source document must be RGB');
    if(doc.layers.length>1)doc.flatten();
    stage='crop';var b=cfg.crop;
    doc.crop([UnitValue(b[0],'px'),UnitValue(b[1],'px'),UnitValue(b[0]+b[2],'px'),UnitValue(b[1]+b[3],'px')]);
    if(doc.activeLayer.isBackgroundLayer)doc.activeLayer.isBackgroundLayer=false;
    doc.activeLayer.name='Source material with reviewed repairs';
    if(cfg.repair_points.length || cfg.extend_edge_colors){
      stage='constrain sampling material';
      doc.selection.select(cfg.points,SelectionType.REPLACE,0,false);doc.selection.invert();doc.selection.clear();doc.selection.deselect();
    }
    if(cfg.repair_points.length){
      stage='repair occlusions';
      for(var j=0;j<cfg.repair_points.length;j++)doc.selection.select(cfg.repair_points[j],j?SelectionType.EXTEND:SelectionType.REPLACE,0,false);
      if(cfg.occlusion_expand_px)doc.selection.expand(cfg.occlusion_expand_px);
      fill();
    }
    if(cfg.extend_edge_colors){
      stage='extend colors beneath soft edge';selectTransparency();doc.selection.invert();
      var hasSelection=true;try{var sb=doc.selection.bounds}catch(empty){hasSelection=false}
      if(hasSelection)fill();else doc.selection.deselect();
    }
    stage='final silhouette';
    doc.selection.select(cfg.points,SelectionType.REPLACE,cfg.feather_px,true);doc.selection.invert();doc.selection.clear();doc.selection.deselect();
    stage='save repair PSD';var ps=new PhotoshopSaveOptions();ps.layers=true;ps.embedColorProfile=true;
    doc.saveAs(new File(cfg.output+'/repair.psd'),ps,true,Extension.LOWERCASE);doc.close(SaveOptions.DONOTSAVECHANGES);doc=null;
    stage='reopen and export';doc=app.open(new File(cfg.output+'/repair.psd'));
    if(Math.abs(doc.width.as('px')-b[2])>0.000001 || Math.abs(doc.height.as('px')-b[3])>0.000001)throw Error('Reopened dimensions differ from crop');
    doc.saveAs(new File(cfg.output+'/cutout.png'),new PNGSaveOptions(),true,Extension.LOWERCASE);
    report('PREPARED_NEEDS_VISUAL_REVIEW: repair PSD reopened; alpha PNG exported. Hidden material is reconstructed, not recovered.');
  } catch(e) {
    report('FAILED at '+stage+': '+e.message+' line '+e.line);
    throw e;
  } finally {
    if(doc)doc.close(SaveOptions.DONOTSAVECHANGES);
    if(opened)opened.close(SaveOptions.DONOTSAVECHANGES);
    app.preferences.rulerUnits=units;app.displayDialogs=dialogs;
  }
})();
