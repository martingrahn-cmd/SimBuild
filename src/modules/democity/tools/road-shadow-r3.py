from pathlib import Path
import numpy as np,json,colorsys
from PIL import Image
r=Path('shots/democity/rdev3');a=np.asarray(Image.open(r/'roadmask-on.png').convert('RGB'),float);b=np.asarray(Image.open(r/'roadmask-off.png').convert('RGB'),float);L=lambda x:x@np.array([.2126,.7152,.0722]);l=L(a);mask=abs(l-L(b))>6
for i in range(3):
 m=mask.copy();mask[1:-1,1:-1]=m[1:-1,1:-1]&m[:-2,1:-1]&m[2:,1:-1]&m[1:-1,:-2]&m[1:-1,2:]&m[:-2,:-2]&m[:-2,2:]&m[2:,:-2]&m[2:,2:];mask[[0,-1],:]=False;mask[:,[0,-1]]=False
v=l[mask];low=mask&(l<np.percentile(v,40));hsv=np.array([colorsys.rgb_to_hsv(*c) for c in a[low]/255]);out={'pixels':int(low.sum()),'graded':int(low.sum())>=2000,'hueMeanDegrees':float(hsv[:,0].mean()*360),'satMean':float(hsv[:,1].mean()),'method':'one page roads group visibility diff; absdeltaL>6,3px erosion,below40thpercentile; fullresolution'};(r/'road-shadow.json').write_text(json.dumps(out,indent=2));print(out)
