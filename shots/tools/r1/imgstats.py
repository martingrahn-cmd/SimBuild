import sys, json, colorsys
from PIL import Image
f = sys.argv[1]
im = Image.open(f).convert('RGB')
W,H = im.size
if len(sys.argv) >= 6:
    x0,y0,w,h = [int(v) for v in sys.argv[2:6]]
else:
    x0,y0,w,h = 0,0,W,H
x0=max(0,x0); y0=max(0,y0); w=min(w,W-x0); h=min(h,H-y0)
px = im.crop((x0,y0,x0+w,y0+h)).load()
lum=[]; sat=[]; hue=[]; clipped=0
for y in range(h):
    for x in range(w):
        R,G,B = px[x,y]
        lum.append(0.2126*R+0.7152*G+0.0722*B)
        mx=max(R,G,B)/255.0; mn=min(R,G,B)/255.0
        sat.append(0.0 if mx==0 else (mx-mn)/mx)
        hh,_,_ = colorsys.rgb_to_hsv(R/255.0,G/255.0,B/255.0)
        hue.append(hh*360)
        if max(R,G,B) >= 250: clipped += 1
def p(a,q):
    s=sorted(a); return round(s[min(len(s)-1,int(q*len(s)))],1)
n=len(lum)
print(json.dumps({"file":f,"rect":[x0,y0,w,h],"n":n,
 "lum":{"p1":p(lum,0.01),"p50":p(lum,0.5),"p99":p(lum,0.99),"mean":round(sum(lum)/n,1)},
 "sat":{"p50":round(sorted(sat)[n//2],3),"p90":round(sorted(sat)[int(0.9*n)],3)},
 "hue_p50":round(sorted(hue)[n//2],0),
 "clippedPct":round(100.0*clipped/n,2)}))
