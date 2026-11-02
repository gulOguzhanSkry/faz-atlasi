"""MIT — compose the section sheet and the magnification series from private/kesit-paftasi.
Run from the repository root after kesit-paftasi.mjs."""
import json,math,sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[2];D=str(ROOT/'private/kesit-paftasi');OUTDIR=ROOT/'web/gorseller'
M=json.load(open(D+'/meta.json'));N=M['N']
def f(size,w='Regular'):
  for c in [f'/usr/share/fonts/opentype/inter/Inter-{w}.otf','C:/Windows/Fonts/'+('segoeuib.ttf' if w in ('Bold','SemiBold') else 'segoeui.ttf'),'/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if w in ('Bold','SemiBold') else '')+'.ttf']:
    if Path(c).exists():return ImageFont.truetype(c,size)
  return ImageFont.load_default()
BG,INK,MUT,RULE,RED=(246,243,236),(31,42,40),(102,112,108),(214,208,196),(183,28,28)
meta={m['name']:m for m in M['meta']}
def panel(name,n=N):return Image.frombytes('RGBA',(n,n),open(f'{D}/{name}.rgba','rb').read()).convert('RGB')
def bar(d,x,y,size,pixelUm,scale,lang):
  target=pixelUm*size/scale/5;import math
  p=10**math.floor(math.log10(target));um=[k*p for k in (1,2,5,10) if k*p<=target*1.3][-1]
  px=round(um/pixelUm*scale);h=4;lab=(f'{um:g} µm').replace('.',',' if lang=='tr' else '.')
  d.rectangle([x-4,y-20,x+max(px,40)+6,y+h+4],fill=(255,255,255));d.rectangle([x,y,x+px,y+h],fill=INK);d.text((x,y-17),lab,font=f(12,'SemiBold'),fill=INK)
def sheet(lang):
  P=220;cs=[.2,.45,.76,1.2,3,4.38,5];mags=['low','medium','high'];modes=['phases','constituents','etched']
  T={'tr':dict(title='Kesit paftası · aynı model, temsili ölçek',sub='Yedi bileşim (650 °C, yavaş soğuma) · üç görünüm · üç büyütme. Büyütme pencereyi yeniden örnekler; ölçek çubukları temsili ölçek varsayımına göredir (önceki östenit tanesi ≈40 µm, lamel aralığı ≈0,5 µm).',
     mag=dict(low='Düşük',medium='Orta',high='Yüksek'),mode=dict(phases='Faz',constituents='Bileşen',etched='Dağlanmış'),c=lambda c:'%'+f'{c:g}'.replace('.',',')+' C',
     foot='Şematik · ölçülmüş mikrograf değildir. Kod: Claude Opus 5.5 ile, Oğuzhan Gül denetiminde.'),
     'en':dict(title='Section sheet · one model, representative scale',sub='Seven compositions (650 °C, slow cooling) · three displays · three magnifications. Magnification resamples the window; scale bars follow the assumed representative scale (prior-austenite grain ≈40 µm, lamellar spacing ≈0.5 µm).',
     mag=dict(low='Low',medium='Medium',high='High'),mode=dict(phases='Phase',constituents='Constituent',etched='Etched'),c=lambda c:f'{c:g} wt% C',
     foot='Schematic · not a measured micrograph. Code: written with Claude Opus 5.5 under Oğuzhan Gül’s supervision.')}[lang]
  L,top,gap,gg=110,140,6,22;W=L+9*P+8*gap+2*gg+30;H=top+len(cs)*(P+gap)+70
  im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
  d.text((30,22),T['title'],font=f(30,'Bold'),fill=INK);d.text((30,64),T['sub'],font=f(14),fill=MUT)
  for gi,mag in enumerate(mags):
    x0=L+gi*(3*P+2*gap+gg)
    d.text((x0,top-46),T['mag'][mag].upper(),font=f(13,'SemiBold'),fill=INK)
    for k,mode in enumerate(modes):d.text((x0+k*(P+gap),top-24),T['mode'][mode],font=f(12),fill=MUT)
  for r,c in enumerate(cs):
    y=top+r*(P+gap);d.text((30,y+P/2-9),T['c'](c),font=f(14,'SemiBold'),fill=INK)
    for gi,mag in enumerate(mags):
      x0=L+gi*(3*P+2*gap+gg)
      for k,mode in enumerate(modes):
        name=f'{c:g}-{mag}-{mode}';img=panel(name).resize((P,P),Image.LANCZOS);x=x0+k*(P+gap);im.paste(img,(x,y))
        if k==0:bar(d,x+10,y+P-14,P,meta[name]['pixelUm'],P/N,lang)
  d.text((30,H-40),T['foot'],font=f(13),fill=RED)
  return im
def zoom(lang):
  zs=[1,2.5,6,15];P=360
  T={'tr':dict(title='Gerçek büyütme: aynı kesit, %0,45 C · 650 °C',sub='Her adım daha küçük bir pencereyi yeniden örnekler. Lamel aralığı (≈0,5 µm) pikselden inceyken perlit koyu ve tek tonludur; piksel küçüldükçe lameller ayrışır.',r1='Dağlanmış\n(temsili Nital)',r2='Faz renkleri',foot='Kod: Claude Opus 5.5 ile, Oğuzhan Gül denetiminde.',px='µm/piksel'),
     'en':dict(title='True magnification: one section, 0.45 wt% C · 650 °C',sub='Each step resamples a smaller window. While the ≈0.5 µm lamellar spacing is finer than a pixel, pearlite is a uniform dark constituent; smaller pixels resolve the lamellae.',r1='Etched\n(illustrative\nNital)',r2='Phase colours',foot='Code: written with Claude Opus 5.5 under Oğuzhan Gül’s supervision.',px='µm/pixel')}[lang]
  L,top,gap=170,130,8;W=L+4*P+3*gap+30;H=top+2*(P+gap)+60
  im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
  d.text((30,22),T['title'],font=f(28,'Bold'),fill=INK);d.text((30,62),T['sub'],font=f(14),fill=MUT)
  for k,z in enumerate(zs):
    m=meta[f'zoom-{z}-etched'];pu=m['pixelUm'] if m['pixelUm'] else None
    d.text((L+k*(P+gap),top-26),(f'×{z:g} · {pu:.2f} {T["px"]}'.replace('.',',') if lang=='tr' else f'×{z:g} · {pu:.2f} {T["px"]}'),font=f(13,'SemiBold'),fill=INK)
    for r,mode in enumerate(['etched','phases']):
      x,y=L+k*(P+gap),top+r*(P+gap);im.paste(panel(f'zoom-{z}-{mode}',512).resize((P,P),Image.LANCZOS),(x,y));bar(d,x+12,y+P-16,P,pu,P/512,lang)
  d.multiline_text((30,top+P/2-16),T['r1'],font=f(14,'SemiBold'),fill=INK,spacing=4);d.text((30,top+P+gap+P/2-8),T['r2'],font=f(14,'SemiBold'),fill=INK)
  d.text((30,H-36),T['foot'],font=f(13),fill=RED)
  return im
for lang in ['tr','en']:
  s=sheet(lang);z=zoom(lang);suf='' if lang=='tr' else '-en'
  s.save(OUTDIR/f'kesit-paftasi{suf}.png',optimize=True);z.save(OUTDIR/f'olcek-buyutme{suf}.webp',quality=88)
  print(lang,s.size,z.size)
