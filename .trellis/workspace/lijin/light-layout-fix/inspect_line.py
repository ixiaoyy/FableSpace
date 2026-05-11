from PIL import Image, ImageStat
from pathlib import Path
root=Path('D:/work/ai-')
paths=[
 root/'frontend/app/assets/soul-link-05-10/home-black/hero-system-visual.png',
 root/'.trellis/workspace/lijin/light-layout-fix/home-black-after-fix.png',
]
for p in paths:
    img=Image.open(p).convert('RGB')
    print(p, img.size)
    # detect columns with high cyan/blue contrast near image/right side
    w,h=img.size
    candidates=[]
    for x in range(w):
        # sample full height, average cyan-ish score and vertical uniformity-ish
        pix=[img.getpixel((x,y)) for y in range(0,h,max(1,h//300))]
        score=sum(max(0, g-r)+max(0, b-r) for r,g,b in pix)/len(pix)
        bright=sum((r+g+b)/3 for r,g,b in pix)/len(pix)
        if score>45 and bright>25:
            candidates.append((x,score,bright))
    # print clusters near right half
    clusters=[]
    if candidates:
        start=prev=candidates[0][0]; vals=[candidates[0]]
        for c in candidates[1:]:
            if c[0] == prev+1:
                vals.append(c); prev=c[0]
            else:
                clusters.append((start,prev,max(v[1] for v in vals),sum(v[2] for v in vals)/len(vals)))
                start=prev=c[0]; vals=[c]
        clusters.append((start,prev,max(v[1] for v in vals),sum(v[2] for v in vals)/len(vals)))
    print('cyan clusters right half:', [c for c in clusters if c[0] > w*0.55][:20])
# crop likely area from asset and screenshot for viewing
asset=Image.open(paths[0]).convert('RGB')
w,h=asset.size
# right-side crop around suspected vertical line in asset
asset.crop((int(w*0.70),0,w,h)).save(root/'.trellis/workspace/lijin/light-layout-fix/hero-asset-right-crop.png')
shot=Image.open(paths[1]).convert('RGB')
# hero in screenshot: x 220..1220 y 18..548, crop right side around x 1080..1220
shot.crop((1040,18,1220,548)).save(root/'.trellis/workspace/lijin/light-layout-fix/screenshot-hero-right-crop.png')
print('saved crops')
