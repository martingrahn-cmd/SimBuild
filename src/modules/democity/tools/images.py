from PIL import Image
import numpy as np,json,pathlib,sys,colorsys
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'shots/democity/rdev1')
def L(a):return a[...,0]*.2126+a[...,1]*.7152+a[...,2]*.0722
def groups(mask,eight=False):
 # Scanline connected components; counts each pixel, joins diagonal runs only for eight-connectivity.
 parent=[];size=[];bounds=[];last=[]
 def find(i):
  while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
  return i
 def join(a,b):
  a,b=find(a),find(b)
  if a!=b:parent[b]=a;size[a]+=size[b];bounds[a]=[min(bounds[a][0],bounds[b][0]),min(bounds[a][1],bounds[b][1]),max(bounds[a][2],bounds[b][2]),max(bounds[a][3],bounds[b][3])]
 for y,row in enumerate(mask):
  edges=np.diff(np.r_[False,row,False].astype(np.int8));runs=list(zip(np.where(edges==1)[0],np.where(edges==-1)[0]));cur=[]
  for x0,x1 in runs:
   i=len(parent);parent.append(i);size.append(int(x1-x0));bounds.append([int(x0),y,int(x1),y+1]);cur.append((x0,x1,i))
   for a,b,j in last:
    if b+int(eight)>x0 and a-int(eight)<x1:join(i,j)
  last=cur
 return [{'pixels':size[i],'bounds':bounds[i]} for i in range(len(parent)) if find(i)==i]
def autocorr(v):
 n=len(v);smooth=np.convolve(v,np.ones(101),mode='same')/np.convolve(np.ones(n),np.ones(101),mode='same');a=v-smooth;rows=[]
 for lag in range(24,min(400,n-2)+1):
  x,y=a[:-lag],a[lag:];den=np.linalg.norm(x)*np.linalg.norm(y);rows.append((lag,float(np.dot(x,y)/den) if den else 0))
 lag,r=max(rows,key=lambda q:abs(q[1]));return {'maxAbs':abs(r),'lag':lag,'r':r,'passes':abs(r)<=.55}
rows={};tiling={}
for p in sorted(root.glob('*.png')):
 if p.stem.startswith(('smoke','roadmask')):continue
 im=Image.open(p).convert('RGB');full=np.asarray(im,dtype=np.float64);a=np.asarray(im.resize((480,round(im.height*480/im.width)),Image.Resampling.LANCZOS),dtype=np.float64);lum=L(a);fl=L(full);mx=a.max(2);mn=a.min(2);sat=np.divide(mx-mn,mx,out=np.zeros_like(mx),where=mx>0)
 q=np.percentile(lum,[1,50,99]);row={'size':[im.width,im.height],'scale480':{'mean':float(lum.mean()),'std':float(lum.std()),'p1':float(q[0]),'p50':float(q[1]),'p99':float(q[2]),'p99OverP50':float(q[2]/max(.0001,q[1])),'sat':float(sat.mean()),'above180':float((lum>180).mean()),'above235':float((lum>235).mean()),'clippedAny255':float((a>=255).any(2).mean())},'fullAbove245':float((fl>245).mean())}
 if '_22' in p.stem:
  cs=[c for c in groups(fl>150,True) if c['pixels']>=4];tiles=[]
  for j in range(4):
   for i in range(4):
    c=groups((fl>150)[j*im.height//4:(j+1)*im.height//4,i*im.width//4:(i+1)*im.width//4],True);tiles.append(sum(x['pixels']>=4 for x in c))
  row['brightClusters']={'total':len(cs),'minimumPixels':4,'connectivity':8,'per4x4Tile':tiles,'builtTileMask':'not supplied for this camera; counts are measured but blanket tile pass is not claimed'}
 if '_17p5' in p.stem:
  flat=np.array([[lum[y:y+24,x:x+24].std()<6 for x in range(0,lum.shape[1]-23,12)]for y in range(0,lum.shape[0]-23,12)])
  patches=groups(flat);area=max([c['pixels']*144 for c in patches]or[0]);row['flatPatch']={'maxStrideCellAreaFraction':area/lum.size,'thresholdStd':6,'stride':12,'window':24}
  if 'skyline' in p.stem:
   h=round(im.height/2*(1-np.tan(.16)/np.tan(np.radians(45)/2)));band=fl[h:min(im.height,h+120)];row['farBand']={'scale':'full resolution','horizonRow':h,'height':120,'std':float(band.std())}
 crop=root/(p.stem+'.crops.json')
 if crop.exists():
  doc=json.load(open(crop));vals={}
  for name,r in doc.get('rects',{}).items():
   if not name.startswith('democity.'):continue
   x,y,w,h=map(int,r);s=fl[y:y+h,x:x+w];vals[name]={'rect':r,'mean':float(s.mean()),'max':float(s.max()),'p99':float(np.percentile(s,99))} if s.size else {'missing':True}
  row['crops']=vals
 rows[p.name]=row
 if p.stem in ['aerial_12','overview_12','night_street_22']:
  tiling[p.name]={'rows':autocorr(fl.mean(1)),'columns':autocorr(fl.mean(0)),'algorithm':'full resolution; centred101movingaverage with edge normalization; max absolute normalized dot product, lags24..400'}
if (root/'closeup_12_repeat.png').exists():
 a=np.array(Image.open(root/'closeup_12.png').convert('RGB'),float);b=np.array(Image.open(root/'closeup_12_repeat.png').convert('RGB'),float)
 rows['repeatability']={'meanAbs':float(abs(a-b).mean()),'threshold':1.5,'excludedAnimatedRects':[],'passes':float(abs(a-b).mean())<1.5}
if (root/'roadmask-on.png').exists():
 a=np.array(Image.open(root/'roadmask-on.png').convert('RGB'),float);b=np.array(Image.open(root/'roadmask-off.png').convert('RGB'),float);l=L(a);mask=abs(l-L(b))>6
 for i in range(3):
  m=mask.copy();mask[1:-1,1:-1]=m[1:-1,1:-1]&m[:-2,1:-1]&m[2:,1:-1]&m[1:-1,:-2]&m[1:-1,2:]&m[:-2,:-2]&m[:-2,2:]&m[2:,:-2]&m[2:,2:];mask[[0,-1],:]=False;mask[:,[0,-1]]=False
 vals=l[mask];low=mask&(l<np.percentile(vals,40)) if vals.size else mask;rgb=a[low]/255;hsv=np.array([colorsys.rgb_to_hsv(*c) for c in rgb]);rows['roadShadow']={'pixels':int(low.sum()),'graded':int(low.sum())>=2000,'hueMeanDegrees':float(hsv[:,0].mean()*360) if len(hsv) else None,'satMean':float(hsv[:,1].mean()) if len(hsv) else None,'method':'same-page roadvisibility diff absdeltaL>6;3px squareerosion;lowest40percent'}
json.dump(rows,open(root/'imgstats.json','w'),indent=2);json.dump(tiling,open(root/'tiling.json','w'),indent=2)
print(json.dumps({'frames':len(rows),'tiling':tiling,'repeat':rows.get('repeatability'),'roadShadow':rows.get('roadShadow')},indent=2))
