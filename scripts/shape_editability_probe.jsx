
(function(){
var doc=null,root=CFG.output,stage='start';
function save(name){PSC_savePNG(doc,root+'/'+name+'.png');}
function find(ls,name){for(var i=0;i<ls.length;i++){if(ls[i].name==name)return ls[i];if(ls[i].typename=='LayerSet'){var a=find(ls[i].layers,name);if(a)return a;}}return null;}
try {PSC_withPrefs(function(){
 var requested=new File(CFG.psd), source=null, ownSource=false;
 for(var di=0;di<app.documents.length;di++){try{if(app.documents[di].fullName.fsName==requested.fsName)source=app.documents[di];}catch(ignored){}}
 if(!source){source=app.open(requested);ownSource=true;}
 doc=source.duplicate('Temporary shape editability probe',false);
 if(ownSource)source.close(SaveOptions.DONOTSAVECHANGES);
 app.activeDocument=doc;
 var layer=find(doc.layers,CFG.layer);if(!layer)throw Error('target not found');
 if(layer.typename!='ArtLayer' || String(layer.kind)!='LayerKind.SOLIDFILL')throw Error('Target must be a native vector shape');
 doc.activeLayer=layer;var layerId=layer.id,history=doc.activeHistoryState;
 save('before');var before=PSC_bounds(layer);
 stage='independent move';layer.translate(UnitValue(20,'px'),UnitValue(-15,'px'));
 var moved=PSC_bounds(layer);if(Math.abs(moved[0]-before[0]-20)>0.1 || Math.abs(moved[1]-before[1]+15)>0.1)throw Error('move readback mismatch');
 save('moved');
 stage='native stroke recolor';PSC_setStrokeStyle({color:'FF00AA',width:3,cap:'butt',join:'miter',align:'center'},false);
 save('recolored');
 stage='vector anchor edit';
 var ref=new ActionReference();ref.putEnumerated(PSC_c('Path'),PSC_c('Path'),PSC_s('vectorMask'));ref.putIdentifier(PSC_c('Lyr '),layerId);
 var raw=executeActionGet(ref).getObjectValue(PSC_s('pathContents'));
 var paths=PSC_pathContentsToSubpaths(raw);var p=paths[0].points[0];
 if(p.anchor){p.anchor[0]+=10;p['in'][0]+=10;p.out[0]+=10;}else p[0]+=10;
 var set=new ActionDescriptor(),target=new ActionReference();target.putEnumerated(PSC_c('Path'),PSC_c('Path'),PSC_s('vectorMask'));target.putIdentifier(PSC_c('Lyr '),layerId);
 set.putReference(PSC_c('null'),target);
 var pc=new ActionDescriptor();pc.putList(PSC_s('pathComponents'),PSC_pathComponentsList(paths));
 set.putList(PSC_c('T   '),PSC_pathComponentsList(paths));executeAction(PSC_c('setd'),set,DialogModes.NO);
 save('path-edited');
 stage='restore';doc.activeHistoryState=history;save('restored');
 PSC_write(root+'/result.json',PSC_json({status:'STRUCTURAL_CHECKS_PASSED',target:CFG.layer,layer_id:layerId,before:before,moved:moved,operations:['move','native stroke recolor','vector anchor edit','history restore'],pixel_verification:'pending'}));
 doc.close(SaveOptions.DONOTSAVECHANGES);doc=null;
});}catch(e){PSC_write(root+'/result.json',PSC_json({status:'FAIL',stage:stage,error:String(e)}));if(doc)doc.close(SaveOptions.DONOTSAVECHANGES);}
})();
