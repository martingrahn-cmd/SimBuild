from pathlib import Path
import json,numpy as np
from PIL import Image
from collections import deque
r=Path('shots/democity/rdev3'); rows={};tiling={}
def lum(a):return a@np.array([.2126,.7152,.0722])
def hsv(a):
 a=a.astype(float)/255; mx=a.max(2);mn=a.min(2);d=mx-mn;s=np.divide(d,mx,out=np.zeros_like(mx),where=mx!=0);h=np.zeros_like(mx)
 for ch in range(3):
  m=(mx==a[:,:,ch])&(d!=0);t=(a[:,:,(ch+1)%3]-a[:,:,(ch+2)%3])/np.where(d==0,1,d)+2*ch;h[m]=(t[m]%6)*60
 return h,s
def comp(mask,diag=False):
 seen=np.zeros(mask.shape,bool);out=[];H,W=mask.shape
 for y,x in zip(*np.where(mask)):
  if seen[y,x]:continue
  seen[y,x]=True;q=[(y,x)];coords=[]
  while q:
   v,u=q.pop();coords.append((v,u))
   for dy,dx in ([(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)] if diag else [(-1,0),(1,0),(0,-1),(0,1)]):
    yy,xx=v+dy,u+dx
    if 0<=yy<H and 0<=xx<W and mask[yy,xx] and not seen[yy,xx]:seen[yy,xx]=True;q.append((yy,xx))
  out.append(coords)
 return out
for path in sorted(list(r.glob('*.png'))+list(r.parent.joinpath('rdev3s7').glob('*.png'))):
 im=Image.open(path).convert('RGB');a=np.asarray(im.resize((480,round(im.height*480/im.width)),Image.Resampling.LANCZOS));L=lum(a);H,S=hsv(a);p1,p50,p99=np.percentile(L,[1,50,99]);row={'mean':float(L.mean()),'p1':float(p1),'p50':float(p50),'p99':float(p99),'std':float(L.std()),'sat':float(S.mean()),'ratio99_50':float(p99/max(p50,1e-9)),'above180Pct':float((L>180).mean()*100),'above235Pct':float((L>235).mean()*100),'clippedChannelPct':float((a.max(2)==255).mean()*100)}
 if path.stem in ['aerial_6p5','skyline_17p5','street_17p5','closeup_6p5']:
  mask=np.array([[L[y:y+24,x:x+24].std()<6 for x in range(0,L.shape[1]-23,12)]for y in range(0,L.shape[0]-23,12)])
  best=0
  for c in comp(mask):
   area=np.zeros(L.shape,bool)
   for y,x in c:area[y*12:y*12+24,x*12:x*12+24]=True
   best=max(best,float(area.mean()*100))
  row['largestFlatPatchPct']=best
 full=np.asarray(im);fL=lum(full)
 if path.parent==r and path.stem in ['aerial_12','overview_12','aerial_17p5']:
  ac=[]
  for axis in [0,1]:
   sig=fL.mean(axis=axis);trend=np.convolve(np.pad(sig,(50,50),mode='edge'),np.ones(101)/101,mode='valid');sig=sig-trend
   ac.append(max(abs(float(np.corrcoef(sig[:-lag],sig[lag:])[0,1]))for lag in range(24,min(401,len(sig)-1))))
  tiling[path.name]={'columnMax':ac[0],'rowMax':ac[1],'method':'full resolution; 101px edge-padded moving mean; overlap Pearson coefficient at lags24..400; max absolute'}
 if path.parent==r and path.stem=='aerial_22':
  cs=[c for c in comp(fL>150,True)if len(c)>=4];tiles=np.zeros((4,4),int)
  for c in cs:
   y,x=np.mean(c,axis=0);tiles[min(3,int(y*4/im.height)),min(3,int(x*4/im.width))]+=1
  row['brightClusters']=len(cs);row['clusterCentroidTiles']=tiles.tolist()
 cp=path.with_suffix('.crops.json')
 if cp.exists():
  rects=json.loads(cp.read_text())['rects'];row['pinned']={}
  for k,rect in rects.items():
   if not k.startswith('democity.'):continue
   x,y,w,h=rect;patch=fL[y:y+h,x:x+w];row['pinned'][k]={'rect':rect,'mean':float(patch.mean()),'peak':float(patch.max())}
 if path.stem=='skyline_17p5':
  meta=json.loads(path.with_suffix('.json').read_text());p=meta['cameraState']['position'];t=meta['cameraState']['target'];pitch=np.arctan2(p[1]-t[1],np.hypot(p[0]-t[0],p[2]-t[2]));y=int(im.height/2*(1-np.tan(pitch)/np.tan(np.pi/8)));row['horizonFullBand']={'pitch':float(pitch),'y':y,'std':float(fL[max(0,y):max(0,y)+120].std())}
 rows[str(path)]=row
p=r/'closeup_12_repeat.png'
if p.exists():
 a=np.asarray(Image.open(r/'closeup_12.png')).astype(float);b=np.asarray(Image.open(p)).astype(float);rows['repeat']={'rgbMAE':float(np.abs(a-b).mean()),'excluded':[]}
(r/'imgstats.json').write_text(json.dumps(rows,indent=2));(r/'tiling.json').write_text(json.dumps(tiling,indent=2));print('measured',len(rows),'images')
