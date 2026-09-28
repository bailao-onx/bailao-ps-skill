(function(){var doc=null,opened=null,stage='open';
function save(n){PSC_savePNG(doc,CFG.output+'/'+n+'.png');}
function search(ls,name,out){for(var i=0;i<ls.length;i++){var l=ls[i];if(l.typename=='LayerSet'&&l.name==name)out.push(l);if(l.typename=='LayerSet')search(l.layers,name,out);}}
function members(ls,out){for(var i=0;i<ls.length;i++){var l=ls[i];out.push({id:l.id,name:l.name,type:l.typename});if(l.typename=='LayerSet')members(l.layers,out);}}
try{PSC_withPrefs(function(){var f=new File(CFG.psd),s=null;for(var i=0;i<app.documents.length;i++){try{if(app.documents[i].fullName.fsName==f.fsName)s=app.documents[i];}catch(ignored){}}
if(s&&!s.saved)throw Error('Source has unsaved edits; save a reviewed task-owned copy first');
if(!s){opened=app.open(f);s=opened;}doc=s.duplicate('Temporary group verification',false);if(opened){opened.close(SaveOptions.DONOTSAVECHANGES);opened=null;}app.activeDocument=doc;
var hits=[];search(doc.layers,CFG.group,hits);if(hits.length!=1)throw Error('Group name must match exactly one group; found '+hits.length);var g=hits[0];if(g.typename!='LayerSet')throw Error('Target must be LayerSet');if(!g.visible)throw Error('Target is hidden');
var list=[];members(g.layers,list);if(!list.length)throw Error('Empty group');var id=g.id,h=doc.activeHistoryState,before=PSC_bounds(g);save('before');
stage='hide';g.visible=false;save('hidden');doc.activeHistoryState=h;
hits=[];search(doc.layers,CFG.group,hits);g=hits[0];g.visible=true;if(g.id!=id)throw Error('Group identity changed');
stage='move';g.translate(UnitValue(CFG.dx,'px'),UnitValue(CFG.dy,'px'));var moved=PSC_bounds(g);if(Math.abs(moved[0]-before[0]-CFG.dx)>.1||Math.abs(moved[1]-before[1]-CFG.dy)>.1)throw Error('Movement readback mismatch; before='+PSC_json(before)+' moved='+PSC_json(moved)+' requested='+CFG.dx+','+CFG.dy);save('moved');
stage='restore';doc.activeHistoryState=h;hits=[];search(doc.layers,CFG.group,hits);hits[0].visible=true;save('restored');PSC_write(CFG.output+'/result.json',PSC_json({status:'RENDERED_NEEDS_CHECK',target:CFG.group,group_id:id,members:list,before:before,moved:moved,dx:CFG.dx,dy:CFG.dy}));doc.close(SaveOptions.DONOTSAVECHANGES);doc=null;});}
catch(e){PSC_write(CFG.output+'/result.json',PSC_json({status:'FAIL',stage:stage,error:String(e)}));}
finally{if(doc)doc.close(SaveOptions.DONOTSAVECHANGES);if(opened)opened.close(SaveOptions.DONOTSAVECHANGES);}
})();
