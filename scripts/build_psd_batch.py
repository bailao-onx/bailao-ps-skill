"""Emit an ASCII JSX batch from reviewed layout JSON. Execute it inside Photoshop via File > Scripts > Browse."""
import argparse,json,math
from pathlib import Path

def svg(w,h,body):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w*4}" height="{h*4}" viewBox="0 0 {w} {h}">{body}</svg>'
def prepare_svg(l,assets,idx):
 t=l['type'];co=l.get('color','00D7DF');box=l.get('box',[0,0,1,1]);w,h=box[2:]
 if t=='line':
  points=l['points'];pad=l.get('width',2)*2;x=min(p[0] for p in points)-pad;y=min(p[1] for p in points)-pad;w=max(p[0] for p in points)-x+pad;h=max(p[1] for p in points)-y+pad;l['box']=[x,y,w,h];pts=' '.join(f'{p[0]-x},{p[1]-y}' for p in points);body=f'<polyline points="{pts}" fill="none" stroke="#{co}" stroke-width="{l.get("width",2)}" stroke-linejoin="round" stroke-linecap="round"/>'
 elif t=='gradient':
  stops=''.join(f'<stop offset="{p*100}%" stop-color="#{co}" stop-opacity="{o}"/>' for p,o in l['stops']);body=f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">{stops}</linearGradient></defs><rect width="{w}" height="{h}" fill="url(#g)"/>'
 elif t=='shape':body=f'<rect width="{w}" height="{h}" rx="{l["radius"]}" fill="#{co}"/>'
 else:
  ico=l['icon'];w=h=100
  if ico=='uv':body='<path d="M50 3 C38 12 20 16 8 18 L11 48 C15 69 29 85 50 97 C71 85 85 69 89 48 L92 18 C79 16 62 12 50 3 Z"/><path d="M25 32V49 Q25 63 37 63 Q49 63 49 49 V32 M56 32L67 63 78 32"/>'
  elif ico=='sun':
   body='<circle cx="50" cy="50" r="27"/>'
   for a in range(0,360,45):
    r=math.radians(a);body+=f'<path d="M{50+36*math.cos(r)} {50+36*math.sin(r)} L{50+48*math.cos(r)} {50+48*math.sin(r)}"/>'
  elif ico=='thermometer':body='<path d="M36 65 V19 Q36 5 50 5 Q64 5 64 19 V65 A25 25 0 1 1 36 65Z"/><path d="M50 24V77"/><circle cx="50" cy="79" r="10" fill="currentColor"/>'
  else:body='<path d="M18 76 A42 42 0 1 1 35 91 L5 98 13 72"/><path d="M33 26 Q29 23 26 33 Q23 49 42 65 Q61 81 73 70 L77 62 61 54 55 61 Q43 56 39 46 L43 39Z" fill="currentColor"/>'
  body=f'<g fill="none" stroke="#{co}" color="#{co}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">{body}</g>'
 path=assets/f'vector-{idx}.svg';path.write_text(svg(w,h,body));l['_svg']=str(path)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--layouts',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);ap.add_argument('--helper',type=Path,default=Path(__file__).with_name('photoshop_batch_core.jsx'));ap.add_argument('--emit',type=Path,required=True);ap.add_argument('--ids',default='1');ap.add_argument('--scale',type=float,default=2);ap.add_argument('--overwrite',action='store_true');a=ap.parse_args();out=a.output.resolve();assets=out/'assets';assets.mkdir(parents=True,exist_ok=True);(out/'ads').mkdir(exist_ok=True);(out/'records').mkdir(exist_ok=True)
 layouts=[]
 for n in map(int,a.ids.split(',')):
  d=json.loads((a.layouts/f'layout-{n:02}.json').read_text());d['tag']=d.get('tag',f'Ad-{n:02}');
  if Path(d['tag']).name != d['tag'] or d['tag'] in ('.','..'):raise ValueError('tag must be a filename stem')
  if (out/'ads'/f'{d["tag"]}-editable.psd').exists() and not a.overwrite:raise FileExistsError('PSD exists; use --overwrite only for an intended replacement')
  for i,l in enumerate(d['layers']):
   if l['type'] in ('photo','brand'):
    if l['file'].startswith('$'):l['file']=str(assets/l['file'][1:])
    if not Path(l['file']).is_file():raise FileNotFoundError(l['file'])
    if l['type']=='photo' and l.get('crop'):l['_cropped']=str(assets/f'{d["tag"]}-crop-{i}.png')
   if l['type']=='check' and not (assets/'check-white.svg').is_file():raise FileNotFoundError(assets/'check-white.svg')
   if l['type']=='text' and not l.get('font'):raise ValueError('Every text layer requires a font PostScript name')
   if l['type'] in ['icon','line','gradient'] or l['type']=='shape' and l.get('radius'):prepare_svg(l,assets,f'{n:02}-{i}')
  layouts.append(d)
 cfg={'output':str(out),'scale':a.scale,'overwrite':a.overwrite,'layouts':layouts}
 core=a.helper.read_text();a.emit.write_text('#target photoshop\nvar CFG='+json.dumps(cfg,ensure_ascii=True)+';\n'+core,encoding='ascii');print(a.emit)
if __name__=='__main__':main()
