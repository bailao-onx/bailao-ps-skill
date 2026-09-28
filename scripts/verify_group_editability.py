"""Prepare/check a reversible Photoshop group move and hide probe.
Pixel checks never certify visual fidelity or correct hidden anatomy.
"""
import argparse,json,math
from pathlib import Path
import sys

def check(root):
 import numpy as np
 from PIL import Image
 r=json.loads((root/'result.json').read_text())
 if r.get('status')!='RENDERED_NEEDS_CHECK':raise RuntimeError(r)
 a={n:np.asarray(Image.open(root/(n+'.png')).convert('RGBA')) for n in ['before','hidden','moved','restored']}
 if len({x.shape for x in a.values()})!=1:raise ValueError('Preview dimensions differ')
 failures=[];e={}
 for n in ['hidden','moved','restored']:
  mask=np.any(a[n]!=a['before'],axis=2);ys,xs=np.where(mask);count=int(mask.sum())
  e[n]={'changed_pixels':count,'box':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)] if count else None}
  if n=='restored' and count:failures.append('Restore differs from baseline')
  if n!='restored' and not count:failures.append(n+': no visible change')
 r.update(status='FAIL' if failures else 'PIXEL_CHECKS_PASSED_VISUAL_REVIEW_REQUIRED',pixel_checks=e,failures=failures,required_review=['Moved group retains every intended component','Hidden and moved previews expose no clipped receiving surfaces','Hidden repairs are plausible and uncertainties recorded','Unrelated scene content unchanged'])
 (root/'verification.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
 return bool(failures)

def main():
 if hasattr(sys.stdout, "reconfigure"):
  sys.stdout.reconfigure(errors="backslashreplace")
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--check',type=Path)
 for n in ['psd','output','emit']:p.add_argument('--'+n,type=Path)
 p.add_argument('--group');p.add_argument('--dx',type=float,default=100);p.add_argument('--dy',type=float,default=-100)
 a=p.parse_args()
 if a.check:raise SystemExit(check(a.check.resolve()))
 if not all([a.psd,a.output,a.emit,a.group]):p.error('--psd, --group, --output, --emit required')
 if not a.psd.is_file():raise FileNotFoundError(a.psd)
 if not all(math.isfinite(x) for x in [a.dx,a.dy]) or (a.dx==0 and a.dy==0):p.error('Move must be finite and nonzero')
 if a.output.exists() and any(a.output.iterdir()):raise FileExistsError('Use fresh output directory')
 a.output.mkdir(parents=True,exist_ok=True);a.emit.parent.mkdir(parents=True,exist_ok=True)
 scripts=Path(__file__).resolve().parent;core=(scripts/'reconstruct_psd.jsx').read_text(encoding='ascii');marker='\n(function () {'
 if marker not in core:raise RuntimeError('Missing helper boundary')
 cfg=dict(psd=str(a.psd.resolve()),output=str(a.output.resolve()),group=a.group,dx=a.dx,dy=a.dy)
 a.emit.write_text('#target photoshop\nvar CFG='+json.dumps(cfg,ensure_ascii=True)+';\n'+core.split(marker,1)[0]+(scripts/'group_editability_probe.jsx').read_text(encoding='ascii'),encoding='ascii');print(a.emit.resolve())
if __name__=='__main__':main()
