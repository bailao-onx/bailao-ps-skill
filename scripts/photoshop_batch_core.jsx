(function(){
var ROOT=CFG.output, S=CFG.scale, doc, groups;
var oldUnits=app.preferences.rulerUnits, oldTypes=app.preferences.typeUnits, oldDialogs=app.displayDialogs;
function log(s){var f=new File(ROOT+'/records/build-log.txt');f.encoding='UTF8';f.open('a');f.writeln(s);f.close();}
  function c(s){return charIDToTypeID(s);}
  function sid(s){return stringIDToTypeID(s);}
  function color(hex){var v=new SolidColor();v.rgb.hexValue=hex;return v;}
  function bounds(layer){var b=layer.bounds;return [b[0].as('px'),b[1].as('px'),b[2].as('px'),b[3].as('px')];}
  function group(name){var g=doc.layerSets.add();g.name=name;return g;}
  function shape(name,x,y,w,h,hex,g,ellipse){
    var d=new ActionDescriptor(), ref=new ActionReference();ref.putClass(sid('contentLayer'));d.putReference(c('null'),ref);
    var content=new ActionDescriptor(), fill=new ActionDescriptor(), rgb=new ActionDescriptor(), sc=color(hex);
    rgb.putDouble(c('Rd  '),sc.rgb.red);rgb.putDouble(c('Grn '),sc.rgb.green);rgb.putDouble(c('Bl  '),sc.rgb.blue);
    fill.putObject(c('Clr '),c('RGBC'),rgb);content.putObject(c('Type'),sid('solidColorLayer'),fill);
    var geometry=new ActionDescriptor();geometry.putUnitDouble(c('Top '),c('#Pxl'),y*S);geometry.putUnitDouble(c('Left'),c('#Pxl'),x*S);geometry.putUnitDouble(c('Btom'),c('#Pxl'),(y+h)*S);geometry.putUnitDouble(c('Rght'),c('#Pxl'),(x+w)*S);
    content.putObject(c('Shp '),c(ellipse?'Elps':'Rctn'),geometry);d.putObject(c('Usng'),sid('contentLayer'),content);
    executeAction(c('Mk  '),d,DialogModes.NO);
    var l=doc.activeLayer;l.name=name;if(g)l.move(g,ElementPlacement.INSIDE);return l;
  }
  function text(name,copy,font,x,y,w,h,hex,g){
    var l=doc.artLayers.add();l.kind=LayerKind.TEXT;l.name=name;
    var t=l.textItem;t.kind=TextType.POINTTEXT;t.contents=copy;t.font=font;t.size=UnitValue(h*S,'px');t.color=color(hex);t.antiAliasMethod=AntiAlias.SHARP;t.position=[UnitValue(x*S,'px'),UnitValue((y+h)*S,'px')];
    var b=bounds(l), bh=b[3]-b[1];
    t.size=UnitValue(t.size.as('px')*(h*S)/bh,'px');
    b=bounds(l);t.horizontalScale=(w*S)/(b[2]-b[0])*100;
    b=bounds(l);l.translate(UnitValue(x*S-b[0],'px'),UnitValue(y*S-b[1],'px'));
    if(g)l.move(g,ElementPlacement.INSIDE);return l;
  }
  function place(name,file,x,y,w,h,g,cover){
    var d=new ActionDescriptor();d.putPath(c('null'),new File(file));d.putEnumerated(c('FTcs'),c('QCSt'),c('Qcsa'));
    executeAction(c('Plc '),d,DialogModes.NO);
    var l=doc.activeLayer;l.name=name;var b=bounds(l),bw=b[2]-b[0],bh=b[3]-b[1];
    if(cover){var r=Math.max(w*S/bw,h*S/bh);l.resize(r*100,r*100,AnchorPosition.MIDDLECENTER);}
    else{l.resize(w*S/bw*100,h*S/bh*100,AnchorPosition.MIDDLECENTER);}
    b=bounds(l);l.translate(UnitValue((x+w/2)*S-(b[0]+b[2])/2,'px'),UnitValue((y+h/2)*S-(b[1]+b[3])/2,'px'));
    if(g)l.move(g,ElementPlacement.INSIDE);return l;
  }
  function photo(name,file,x,y,w,h,g){
    var m=shape(name+' / editable frame',x,y,w,h,'FFFFFF',g,false);
    var p=place(name+' / replaceable photo',file,x,y,w,h,g,true);p.grouped=true;return p;
  }
  function png(d,file){var o=new PNGSaveOptions();o.interlaced=false;d.saveAs(new File(file),o,true,Extension.LOWERCASE);}
  function splitPhoto(file,out,b){
    var d=app.open(new File(file));d.crop([UnitValue(b[0],'px'),UnitValue(b[1],'px'),UnitValue(b[2],'px'),UnitValue(b[3],'px')]);png(d,out);d.close(SaveOptions.DONOTSAVECHANGES);
  }

function gr(n){return groups[n];}
function backgroundLayer(l){return l.type=='gradient'||(l.type=='shape'&&l.box[2]>600&&l.box[3]>90);}
function render(l){
 var b=l.box||[0,0,1,1],x=b[0],y=b[1],w=b[2],h=b[3],n=l.name||l.type,t=l.type,g,out;
 if(t=='photo') {g=gr(l.category=='gift'?'04 Gift photos':'01 Main photos');out=photo(n,l._cropped||l.file,x,y,w,h,g);}
 else if(t=='brand'){
  g=gr('07 Brand');place(n+' / vector wordmark',l.file,x,y,w,h,g,false);
 } else if(t=='text'){
  g=gr('06 Editable text');out=text(n,l.text,l.font,x,y,w,h,l.color,g);
  if(l.rotation)out.rotate(l.rotation,AnchorPosition.MIDDLECENTER);
 } else if(t=='check'){
  g=gr('05 Vector graphics');shape(n+' / circle',x,y,w,h,l.color,g,true);place(n+' / vector tick',ROOT+'/assets/check-white.svg',x+w*.21,y+h*.21,w*.58,h*.58,g,false);
 } else if(t=='shape'&&!l.radius){
  g=gr(backgroundLayer(l)?'02 Photo treatments':'05 Vector graphics');out=shape(n,x,y,w,h,l.color,g,l.ellipse);if(l.opacity!==undefined)out.opacity=l.opacity;
 } else if(l._svg){g=gr(backgroundLayer(l)?'02 Photo treatments':'05 Vector graphics');out=place(n+' / vector',l._svg,x,y,w,h,g,false);if(l.opacity!==undefined)out.opacity=l.opacity;}
 else throw Error('Unknown layer type '+t);
}
function typeLayers(d,a){for(var i=0;i<d.layers.length;i++){var l=d.layers[i];if(l.typename=='LayerSet')typeLayers(l,a);else if(l.kind==LayerKind.TEXT)a.push(l);}return a;}
function list(d,rows,depth){for(var i=0;i<d.layers.length;i++){var l=d.layers[i];if(l.typename=='LayerSet'){rows.push('GROUP | '+l.name);list(l,rows,depth+1);}else{rows.push(l.kind+' | '+l.name+(l.kind==LayerKind.TEXT?' | '+l.textItem.font+' | '+l.textItem.contents:''));}}}
function savePSD(d,file){var o=new PhotoshopSaveOptions();o.layers=true;o.embedColorProfile=true;o.alphaChannels=true;o.maximizeCompatibility=true;d.saveAs(new File(file),o,false,Extension.LOWERCASE);}
try {
 app.displayDialogs=DialogModes.NO;app.preferences.rulerUnits=Units.PIXELS;app.preferences.typeUnits=TypeUnits.PIXELS;
 for(var di=0;di<CFG.layouts.length;di++){
  var spec=CFG.layouts[di],stage='start';log('BEGIN '+spec.tag);
  try{
   stage='preflight';
   if(!CFG.overwrite && new File(ROOT+'/ads/'+spec.tag+'-editable.psd').exists)throw Error('PSD exists; rebuild with --overwrite only for intended replacement');
   for(var fi=0;fi<spec.layers.length;fi++){var fl=spec.layers[fi];if(fl.type=='text'){var found=false;for(var fj=0;fj<app.fonts.length;fj++)if(app.fonts[fj].postScriptName==fl.font){found=true;break;}if(!found)throw Error('Missing font: '+fl.font);}}
   stage='prepare crops';
   for(var i=0;i<spec.layers.length;i++){var l=spec.layers[i];if(l._cropped&&!new File(l._cropped).exists){var cd=app.open(new File(l.file)),cw=cd.width.as('px'),ch=cd.height.as('px'),cr=l.crop;cd.crop([UnitValue(Math.round(cr[0]*cw),'px'),UnitValue(Math.round(cr[1]*ch),'px'),UnitValue(Math.round(cr[2]*cw),'px'),UnitValue(Math.round(cr[3]*ch),'px')]);png(cd,l._cropped);cd.close(SaveOptions.DONOTSAVECHANGES);}}
   stage='create document';doc=app.documents.add(UnitValue(spec.width*S,'px'),UnitValue(spec.height*S,'px'),72,spec.tag+' - Photoshop Editable',NewDocumentMode.RGB,DocumentFill.WHITE,1,BitsPerChannelType.EIGHT,'sRGB IEC61966-2.1');doc.backgroundLayer.name='00 Background';
   shape('Solid background',0,0,spec.width,spec.height,spec.background,null,false);
   groups={};var names=['01 Main photos','02 Photo treatments','04 Gift photos','05 Vector graphics','06 Editable text','07 Brand'];for(var gi=0;gi<names.length;gi++)groups[names[gi]]=group(names[gi]);
   stage='photos and treatment';for(var i=0;i<spec.layers.length;i++){var l=spec.layers[i];if(l.type=='photo'||backgroundLayer(l))render(l);}
   png(doc,ROOT+'/assets/'+spec.tag+'-background-no-text.png');
   stage='editable graphics and text';for(var i=0;i<spec.layers.length;i++){var l=spec.layers[i];if(l.type!='photo'&&!backgroundLayer(l))render(l);}
   stage='save';var file=ROOT+'/ads/'+spec.tag+'-editable.psd';savePSD(doc,file);
   var types=typeLayers(doc,[]),expected=0;for(var i=0;i<spec.layers.length;i++)if(spec.layers[i].type=='text')expected++;
   if(types.length!=expected)throw Error('Type count mismatch '+types.length+' vs '+expected);
   stage='reopen and edit verification';doc.close(SaveOptions.DONOTSAVECHANGES);doc=app.open(new File(file));types=typeLayers(doc,[]);if(types.length!=expected)throw Error('Reopen type mismatch');
   if(!types.length)throw Error('Roundtrip edit requires at least one text layer');var target=types[0];var original=target.textItem.contents;target.textItem.contents=original+' ';if(target.textItem.contents!=original+' ')throw Error('Edit test failed');target.textItem.contents=original;if(target.textItem.contents!=original)throw Error('Restore failed');savePSD(doc,file);
   png(doc,ROOT+'/ads/'+spec.tag+'-Photoshop.png');var rows=[];list(doc,rows,0);var inv=new File(ROOT+'/records/'+spec.tag+'-layers.txt');inv.encoding='UTF8';inv.open('w');inv.write(rows.join('\n'));inv.close();
   log('SUCCESS '+spec.tag+' | '+expected+' editable text layers | reopen-edit-restore verified');doc.close(SaveOptions.DONOTSAVECHANGES);
  }catch(e){log('ERROR '+spec.tag+' at '+stage+' | '+e.message+' | line '+e.line);}
 }
 log('BATCH FINISHED');
}catch(e){log('FATAL '+e.message+' line '+e.line);}
finally{app.preferences.rulerUnits=oldUnits;app.preferences.typeUnits=oldTypes;app.displayDialogs=oldDialogs;}
})();
