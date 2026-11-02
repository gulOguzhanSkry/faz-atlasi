"""MIT — source-derived cube gallery, never styled as application screenshots."""
from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont,ImageEnhance,ImageFilter
root=Path(__file__).resolve().parents[2]
raw=root/'private/readme-galerisi'
manifest=json.loads((raw/'manifest.json').read_text())
out=root/'web/gorseller'
def font(size,bold=False):
    path=Path('C:/Windows/Fonts/'+('segoeuib.ttf' if bold else 'segoeui.ttf'))
    return ImageFont.truetype(str(path),size) if path.exists() else ImageFont.load_default()
def face(image,points,size,brightness):
    a0,a1,_,a3=points;ux,uy=a1[0]-a0[0],a1[1]-a0[1];vx,vy=a3[0]-a0[0],a3[1]-a0[1];det=ux*vy-uy*vx;n=image.width
    a,b=n*vy/det,-n*vx/det;d,e=-n*uy/det,n*ux/det;c,f=-a*a0[0]-b*a0[1],-d*a0[0]-e*a0[1]
    image=ImageEnhance.Brightness(image.convert('RGB')).enhance(brightness).convert('RGBA')
    layer=image.transform(size,Image.Transform.AFFINE,(a,b,c,d,e,f),resample=Image.Resampling.BICUBIC)
    mask=Image.new('L',size);ImageDraw.Draw(mask).polygon(points,fill=255);layer.putalpha(mask);return layer
def cube(case,mode,size=(720,610)):
    im=Image.new('RGBA',size,(0,0,0,0));w,h=size;cx=w/2;y=28;half=w*.42;rise=half*.47;tall=h-y-2*rise-35
    top=[(cx,y),(cx+half,y+rise),(cx,y+rise*2),(cx-half,y+rise)]
    left=[top[3],top[2],(cx,y+rise*2+tall),(cx-half,y+rise+tall)]
    right=[top[2],top[1],(cx+half,y+rise+tall),(cx,y+rise*2+tall)]
    for name,points,light in [('left',left,.87),('right',right,.96),('top',top,1.04)]:
        image=Image.frombytes('RGBA',(manifest['resolution'],)*2,(raw/case['files'][mode][name]).read_bytes())
        im.alpha_composite(face(image,points,size,light))
    draw=ImageDraw.Draw(im)
    for p in [left,right,top]:draw.line(p+[p[0]],fill='#6b756d',width=2)
    return im
def name(case,en):
    c=case['carbon']
    if case['temperature']>800:return 'Ledeburite · γ + Fe₃C' if en else 'Ledeburit · γ + Fe₃C'
    if c<manifest['invariants']['otektoid']['G']-.01:return 'Ferrite + pearlite' if en else 'Ferrit + perlit'
    if abs(c-manifest['invariants']['otektoid']['G'])<.01:return 'Pearlite' if en else 'Perlit'
    if c<manifest['invariants']['otektik']['G']:return 'Pearlite + Fe₃C(II)' if en else 'Perlit + Fe₃C(II)'
    if c<manifest['invariants']['otektik']['L']-.01:return 'P + Fe₃C(II) + Ld′'
    if abs(c-manifest['invariants']['otektik']['L'])<.01:return 'Transformed ledeburite' if en else 'Dönüşmüş ledeburit'
    return 'Ld′ + Fe₃C(I)'
for en in [False,True]:
    suffix='-en' if en else '';W,H=3200,1850;im=Image.new('RGBA',(W,H),'#f3f0e7');d=ImageDraw.Draw(im)
    d.text((80,40),'FE–C / MICROSTRUCTURE ATLAS' if en else 'FE–C / MİKROYAPI ATLASI',font=font(23,True),fill='#9a694c')
    d.text((76,82),'One diagram. A family of microstructures.' if en else 'Bir diyagram. Farklı mikroyapılar.',font=font(56,True),fill='#293a33')
    d.text((80,163),'384 grains · maximum detail · source-calculated phase mass fractions' if en else '384 tane · en yüksek ayrıntı · kaynaktan hesaplanan faz kütle payları',font=font(25),fill='#6b736b')
    for j,(symbol,colour) in enumerate([('α','#d7b876'),('γ','#567f9b'),('Fe₃C','#62446a')]):
        lx=2500+j*170;d.ellipse((lx,169,lx+20,189),fill=colour);d.text((lx+30,157),symbol,font=font(28,True),fill='#536158')
    for i,case in enumerate(manifest['cases']):
        col,row=i%4,i//4;x=60+col*785;y=230+row*760
        im.alpha_composite(cube(case,'phases'),(x+20,y))
        d=ImageDraw.Draw(im);c=case['carbon'];formatted=f'{c:.3f}'.rstrip('0').rstrip('.')
        if not en:formatted=formatted.replace('.',',')
        ctext=f'{formatted} wt% C' if en else f'%{formatted} C'
        d.text((x+45,y+607),f"{ctext}  ·  {case['temperature']} °C",font=font(29,True),fill='#293a33')
        d.text((x+45,y+652),name(case,en),font=font(24),fill='#536158')
        pct=f"{case['thetaMassFraction']*100:.2f}"
        pct=(pct+'%') if en else '%'+pct.replace('.',',')
        d.rounded_rectangle((x+45,y+697,x+345,y+738),radius=8,fill='#e7e2ed')
        d.text((x+59,y+702),'Fe₃C  '+pct,font=font(23,True),fill='#62446a')
    d.line((80,H-80,W-80,H-80),fill='#c8cbbf',width=2)
    d.text((80,H-59),'SCHEMATIC · UNSCALED · OFFLINE RENDER OF THE SHARED 3D MODEL' if en else 'ŞEMATİK · ÖLÇEKSİZ · ORTAK 3B MODELİN ÇEVRİMDIŞI RENDERI',font=font(20,True),fill='#6b736b')
    d.text((W-580,H-59),'Faz Atlası / acarcemal · OG fork',font=font(20),fill='#6b736b')
    im.convert('RGB').save(out/f'readme-microstructures{suffix}.webp',quality=92,method=6)
    # Same computed examples, three different displays. These are rendered
    # specimens/sections, deliberately not a fictional screenshot of the UI.
    W,H=2100,2900;sheet=Image.new('RGBA',(W,H),'#f3f0e7');s=ImageDraw.Draw(sheet)
    s.text((55,35),'SAME VOLUME / THREE DISPLAYS' if en else 'AYNI HACİM / ÜÇ GÖRÜNÜM',font=font(33,True),fill='#293a33')
    headers=['Phase colours','Constituent colours','Etched section'] if en else ['Faz renkleri','Bileşen renkleri','Dağlanmış kesit']
    for j,title in enumerate(headers):s.text((130+j*690,100),title,font=font(26,True),fill='#536158')
    for i,case in enumerate(manifest['cases']):
        y=155+i*330
        for j,mode in enumerate(['phases','constituents','etched']):
            x=80+j*690
            if mode!='etched':picture=cube(case,mode,(330,300))
            else:picture=Image.frombytes('RGBA',(manifest['resolution'],)*2,(raw/case['files']['etched']['top']).read_bytes()).resize((260,260),Image.Resampling.LANCZOS)
            sheet.alpha_composite(picture,(x+10,y))
            ctext=f"{case['carbon']:.3f}% C" if en else ('%'+f"{case['carbon']:.3f}").replace('.',',')+' C'
            s.text((x+350,y+55),ctext,font=font(25,True),fill='#293a33')
            s.text((x+350,y+95),f"{case['temperature']} °C",font=font(23),fill='#536158')
            if mode=='etched' and case['temperature']>800:
                s.text((x+350,y+140),'Hot: phase' if en else 'Sıcak: faz',font=font(21),fill='#996042')
                s.text((x+350,y+168),'colours' if en else 'renkleri',font=font(21),fill='#996042')
    s.text((55,H-45),'384 grains · 512² source textures · not UI screenshots / not measured micrographs' if en else '384 tane · 512² kaynak dokular · arayüz ekran görüntüsü / ölçülmüş mikrograf değildir',font=font(20),fill='#6b736b')
    sheet.convert('RGB').save(out/f'readme-display-modes{suffix}.webp',quality=90,method=6)
    print(out/f'readme-microstructures{suffix}.webp')
