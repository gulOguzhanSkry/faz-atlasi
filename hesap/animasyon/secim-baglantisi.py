"""MIT — calculated-data explanation, deliberately not a fabricated screenshot."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

root=Path(__file__).resolve().parents[2]
raw=root/'private/secim-baglantisi'
manifest=json.loads((raw/'manifest.json').read_text(encoding='utf-8'))
data=json.loads((root/'web/veri/fe_c.json').read_text(encoding='utf-8'))
out=root/'web/gorseller'
BG='#f3f0e7'; INK='#293a33'; MUTED='#657067'; ACCENT='#a15d39'
COLORS={'A':'#d7b876','G':'#567f9b','C':'#62446a','D':'#699083','L':'#df9b70'}

def font(n,bold=False):
    for p in [Path('C:/Windows/Fonts')/('segoeuib.ttf' if bold else 'segoeui.ttf'),Path('/usr/share/fonts/truetype/dejavu')/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')]:
        if p.exists():return ImageFont.truetype(str(p),n)
    return ImageFont.load_default()

def face(image,points,size,light):
    a0,a1,_,a3=points;ux,uy=a1[0]-a0[0],a1[1]-a0[1];vx,vy=a3[0]-a0[0],a3[1]-a0[1];det=ux*vy-uy*vx;n=image.width
    a,b=n*vy/det,-n*vx/det;d,e=-n*uy/det,n*ux/det;c,f=-a*a0[0]-b*a0[1],-d*a0[0]-e*a0[1]
    source=ImageEnhance.Brightness(image.convert('RGB')).enhance(light).convert('RGBA')
    layer=source.transform(size,Image.Transform.AFFINE,(a,b,c,d,e,f),resample=Image.Resampling.BICUBIC)
    mask=Image.new('L',size);ImageDraw.Draw(mask).polygon(points,fill=255);layer.putalpha(mask);return layer

def cube(state):
    size=(620,500);im=Image.new('RGBA',size);cx=310;top=[(cx,18),(580,145),(cx,272),(40,145)]
    left=[top[3],top[2],(cx,485),(40,358)];right=[top[2],top[1],(580,358),(cx,485)]
    for name,points,light in [('left',left,.87),('right',right,.96),('top',top,1.04)]:
        source=Image.frombytes('RGBA',(512,512),(raw/state['files'][name]).read_bytes())
        im.alpha_composite(face(source,points,size,light))
    d=ImageDraw.Draw(im)
    for p in [left,right,top]:d.line(p+[p[0]],fill='#68756c',width=2)
    return im

def diagram(im,state,origin):
    d=ImageDraw.Draw(im);x,y=origin;w,h=550,350
    sx=lambda c:x+c/2.2*w
    sy=lambda t:y+h-(t-400)/1200*h
    for i,row in enumerate(data['rows'][:-1]):
        nextT=data['rows'][i+1]['T'];bottom=sy(row['T']);top=sy(nextT)
        for region in row['r']:
            lo,hi=region['x'];lo=max(0,lo);hi=min(2.2,hi)
            if lo>=hi:continue
            phases=region['p'];colour=COLORS[phases[0]]
            d.rectangle((sx(lo),top,sx(hi),bottom+1),fill=colour)
            if len(phases)>1:
                second=COLORS[phases[1]]
                for xx in range(int(sx(lo)),int(sx(hi)),9):d.line((xx,top,xx,bottom+1),fill=second,width=2)
    for c in [0,.5,1,1.5,2]:
        xx=sx(c);d.line((xx,y,xx,y+h),fill='#e9e5da',width=1);d.text((xx-13,y+h+8),str(c),font=font(19),fill=MUTED)
    for t in [400,800,1200,1600]:
        yy=sy(t);d.line((x,yy,x+w,yy),fill='#e9e5da',width=1);d.text((x-60,yy-12),str(t),font=font(19),fill=MUTED)
    d.rectangle((x,y,x+w,y+h),outline='#718075',width=2)
    px,py=sx(.45),sy(state['temperature'])
    d.line((px,y,px,y+h),fill=ACCENT,width=3);d.line((x,py,x+w,py),fill=ACCENT,width=3)
    d.ellipse((px-10,py-10,px+10,py+10),fill='#ffad56',outline=INK,width=3)
    d.text((x,y-28),'T / °C',font=font(18,True),fill=MUTED);d.text((x+w-140,y+h+36),'C / wt%',font=font(18,True),fill=MUTED)
    d.rounded_rectangle((px+18,py-21,px+220,py+18),radius=6,fill=BG)
    d.text((px+28,py-19),f"0.45 C · {state['temperature']} °C",font=font(21,True),fill=INK)

for en in [False,True]:
    suffix='-en' if en else '';frames=[]
    phaseNames={'A':'Ferrite · α' if en else 'Ferrit · α','G':'Austenite · γ' if en else 'Östenit · γ','C':'Cementite · Fe₃C' if en else 'Sementit · Fe₃C'}
    for state in manifest['states']:
        im=Image.new('RGBA',(2200,880),BG);d=ImageDraw.Draw(im)
        d.text((60,30),'SELECT A POINT. THE MODEL UPDATES.' if en else 'NOKTAYI SEÇ. MİKROYAPI GÜNCELLENSİN.',font=font(38,True),fill=INK)
        d.text((60,86),'Same C/T selection → source calculation → shared 3D volume and section' if en else 'Aynı C/T seçimi → kaynak hesabı → ortak 3B hacim ve kesit',font=font(26),fill=MUTED)
        for x,label in [(80,'01 / DIAGRAM' if en else '01 / DİYAGRAM'),(835,'02 / LIVE CALCULATION' if en else '02 / ANLIK HESAP'),(1510,'03 / 3D MICROSTRUCTURE' if en else '03 / 3B MİKROYAPI')]:d.text((x,164),label,font=font(23,True),fill=ACCENT)
        diagram(im,state,(140,255))
        d.text((725,430),'→',font=font(60,True),fill=ACCENT);d.text((1370,430),'→',font=font(60,True),fill=ACCENT)
        d.text((835,225),f"{state['temperature']} °C",font=font(42,True),fill=INK)
        d.text((835,284),'C = 0.45 wt%' if en else 'C = %0,45',font=font(27),fill=MUTED)
        yy=350
        for p in state['phases']:
            d.ellipse((837,yy+7,853,yy+23),fill=COLORS[p['f']]);d.text((870,yy),phaseNames.get(p['f'],p['f']),font=font(25,True),fill=INK)
            d.text((1190,yy),f"{p['oran']*100:.2f}%",font=font(26,True),fill=INK);yy+=42
        d.line((835,yy+6,1290,yy+6),fill='#c7ccbf',width=2);yy+=30
        d.text((835,yy),'Constituents' if en else 'Mikroyapı bileşenleri',font=font(24,True),fill=MUTED);yy+=40
        partNames={'proeutectoid-ferrite':('Proeutectoid ferrite','Ötektoid öncesi ferrit'),'pearlite':('Pearlite','Perlit'),'tertiary-cementite':('Tertiary cementite','Tersiyer sementit'),'austenite':('Austenite','Östenit')}
        for p in state['parts']:
            label=partNames.get(p['id'],(p['id'],p['id']))[0 if en else 1]
            d.text((835,yy),label,font=font(22),fill=INK);d.text((1190,yy),f"{p['fraction']*100:.2f}%",font=font(23,True),fill=INK);yy+=36
        im.alpha_composite(cube(state),(1470,220));d=ImageDraw.Draw(im)
        d.text((1510,738),'384 grains · same source state' if en else '384 tane · aynı kaynak durumu',font=font(22),fill=MUTED)
        d.line((60,805,2140,805),fill='#c7ccbf',width=2)
        d.text((60,830),'Calculated data / schematic geometry · not a captured web interface or kinetic simulation' if en else 'Hesaplanmış veri / şematik yerleşim · web ekran görüntüsü veya kinetik simülasyon değildir',font=font(22),fill=MUTED)
        frames.append(im.convert('RGB'))
    # Static comparison deliberately repeats the exact same C with two T values.
    comparison=Image.new('RGB',(2200,1760),BG);comparison.paste(frames[0],(0,0));comparison.paste(frames[-1],(0,880))
    comparison.save(out/f'secim-mikroyapi{suffix}.webp',quality=93,method=6)
    frames[0].save(out/f'secim-mikroyapi{suffix}.gif',save_all=True,append_images=frames[1:],duration=[2200,1400,1800,3000],loop=0,optimize=True)
    print(out/f'secim-mikroyapi{suffix}.webp')
