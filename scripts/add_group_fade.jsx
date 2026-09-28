// Photoshop JSX helper: add a black-to-white linear native group mask.
// Call only on a reviewed task-owned duplicate. Black conceals, white reveals.
// Refuses to replace an existing user mask; inspect and edit that mask explicitly.
function BPS_addGroupFade(doc, group, from, to) {
  if (group.typename != 'LayerSet') throw Error('Expected a group');
  if (!from || !to || from.length!=2 || to.length!=2) throw Error('Expected two pixel points');
  for(var n=0;n<2;n++) if(!isFinite(from[n]) || !isFinite(to[n])) throw Error('Nonfinite coordinate');
  if(from[0]==to[0] && from[1]==to[1]) throw Error('Zero-length gradient');
  app.activeDocument=doc; doc.activeLayer=group;
  var check=new ActionReference();check.putIdentifier(charIDToTypeID('Lyr '),group.id);
  if(executeActionGet(check).getBoolean(stringIDToTypeID('hasUserMask'))) throw Error('Existing group mask would be replaced');
var c=charIDToTypeID,s=stringIDToTypeID;var a=new ActionDescriptor();a.putClass(c('Nw  '),c('Chnl'));var r=new ActionReference();r.putEnumerated(c('Chnl'),c('Chnl'),c('Msk '));a.putReference(c('At  '),r);a.putEnumerated(c('Usng'),c('UsrM'),c('RvlA'));executeAction(c('Mk  '),a,DialogModes.NO);
var grad=new ActionDescriptor();function pt(x,y){var z=new ActionDescriptor();z.putUnitDouble(c('Hrzn'),c('#Pxl'),x);z.putUnitDouble(c('Vrtc'),c('#Pxl'),y);return z;}grad.putObject(c('From'),c('Pnt '),pt(from[0],from[1]));grad.putObject(c('T   '),c('Pnt '),pt(to[0],to[1]));grad.putEnumerated(c('Type'),c('GrdT'),c('Lnr '));grad.putBoolean(c('Dthr'),true);grad.putBoolean(c('UsMs'),true);grad.putUnitDouble(c('Opct'),c('#Prc'),100);grad.putEnumerated(c('Md  '),c('BlnM'),c('Nrml'));var spec=new ActionDescriptor();spec.putString(c('Nm  '),'Left conceal to right reveal');spec.putEnumerated(c('GrdF'),c('GrdF'),c('CstS'));spec.putDouble(c('Intr'),4096);var colors=new ActionList();for(var i=0;i<2;i++){var q=new ActionDescriptor(),rgb=new ActionDescriptor();rgb.putDouble(c('Rd  '),i*255);rgb.putDouble(c('Grn '),i*255);rgb.putDouble(c('Bl  '),i*255);q.putObject(c('Clr '),c('RGBC'),rgb);q.putEnumerated(c('Type'),c('Clry'),c('UsrS'));q.putInteger(c('Lctn'),i*4096);q.putInteger(c('Mdpn'),50);colors.putObject(c('Clrt'),q);}spec.putList(c('Clrs'),colors);var trans=new ActionList();for(var j=0;j<2;j++){var t=new ActionDescriptor();t.putUnitDouble(c('Opct'),c('#Prc'),100);t.putInteger(c('Lctn'),j*4096);t.putInteger(c('Mdpn'),50);trans.putObject(c('TrnS'),t);}spec.putList(c('Trns'),trans);grad.putObject(c('Grad'),c('Grdn'),spec);executeAction(c('Grdn'),grad,DialogModes.NO);

}
