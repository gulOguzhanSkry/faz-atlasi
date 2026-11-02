"""MIT — Offline isometric presentation of the shared 3D model's three faces.

Requires Pillow and an ffmpeg executable (PATH, --ffmpeg or imageio_ffmpeg).
No random imagery or independent phase/morphology model is used.

Run from the repository root:
  node hesap/animasyon/kareleri-uret.mjs
  python hesap/animasyon/animasyonu-uret.py
"""
import argparse
import json
import math
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--frames', type=Path, default=ROOT / 'private/animasyon-kareleri')
parser.add_argument('--output', type=Path, default=ROOT / 'web/gorseller')
parser.add_argument('--ffmpeg')
args = parser.parse_args()
manifest = json.loads((args.frames / 'manifest.json').read_text(encoding='utf8'))
args.output.mkdir(parents=True, exist_ok=True)
W, H = 1200, 780
fps = 12
colours = {'A': '#d7b876', 'G': '#567f9b', 'C': '#62446a', 'D': '#74a18f', 'L': '#bc6d4d'}


def font(size, bold=False):
    candidates = [Path('C:/Windows/Fonts/' + ('segoeuib.ttf' if bold else 'segoeui.ttf')),
                  Path('/usr/share/fonts/truetype/dejavu/DejaVuSans' + ('-Bold.ttf' if bold else '.ttf'))]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def face_on_canvas(image, points, brightness=1):
    p0, p1, p2, p3 = points
    ux, uy = p1[0]-p0[0], p1[1]-p0[1]
    vx, vy = p3[0]-p0[0], p3[1]-p0[1]
    det = ux*vy-uy*vx
    n = image.width
    a, b = n*vy/det, -n*vx/det
    d, e = -n*uy/det, n*ux/det
    c, f = -a*p0[0]-b*p0[1], -d*p0[0]-e*p0[1]
    if brightness != 1:
        alpha = image.getchannel('A')
        image = ImageEnhance.Brightness(image.convert('RGB')).enhance(brightness).convert('RGBA')
        image.putalpha(alpha)
    warped = image.transform((W,H), Image.Transform.AFFINE, (a,b,c,d,e,f), resample=Image.Resampling.BICUBIC)
    mask = Image.new('L', (W,H))
    ImageDraw.Draw(mask).polygon(points, fill=255)
    warped.putalpha(Image.composite(warped.getchannel('A'), Image.new('L',(W,H)), mask))
    return warped


def render(frame, language='tr'):
    en = language == 'en'
    im = Image.new('RGBA', (W,H), '#f3f0e7')
    draw = ImageDraw.Draw(im)
    draw.text((48,36), 'FE–C / MIKROYAPI ATLASI' if not en else 'FE–C / MICROSTRUCTURE ATLAS', font=font(15,True), fill='#996042')
    title = 'Östenitten ferrit–perlite.' if not en else 'From austenite to ferrite–pearlite.'
    draw.text((46,65), title, font=font(36,True), fill='#293a33')
    draw.text((49,119), '%0,45 C  ·  Yavaş denge soğuması' if not en else '0.45 wt% C  ·  Slow equilibrium cooling', font=font(18), fill='#6b736b')
    cx, y, half, rise, tall = 429, 190, 224, 112, 290
    top = [(cx,y),(cx+half,y+rise),(cx,y+2*rise),(cx-half,y+rise)]
    left = [top[3],top[2],(cx,y+2*rise+tall),(cx-half,y+rise+tall)]
    right = [top[2],top[1],(cx+half,y+rise+tall),(cx,y+2*rise+tall)]
    shadow = Image.new('RGBA',(W,H))
    ImageDraw.Draw(shadow).ellipse((cx-250,y+2*rise+tall-7,cx+270,y+2*rise+tall+45),fill=(45,48,39,48))
    im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    n = manifest['resolution']
    for name, points, brightness in [('left',left,.88),('right',right,.97),('top',top,1.06)]:
        raw = (args.frames / frame['files'][name]).read_bytes()
        face = Image.frombytes('RGBA',(n,n),raw)
        im.alpha_composite(face_on_canvas(face,points,brightness))
    draw = ImageDraw.Draw(im)
    for points in [left,right,top]:
        draw.line(points+[points[0]],fill='#68746c',width=2)
    tx,ty = 780,215
    draw.text((tx,ty), 'SEÇİLİ DURUM' if not en else 'SELECTED STATE', font=font(13,True),fill='#996042')
    text = f"{frame['temperature']:.1f} °C"
    if not en: text=text.replace('.',',')
    draw.text((tx,ty+27),text,font=font(48,True),fill='#293a33')
    if 'xi' in frame:
        draw.text((tx,ty+92),('Ötektoid dönüşüm' if not en else 'Eutectoid transformation')+f" · ξ={frame['xi']:.2f}",font=font(14),fill='#6b736b')
    yy=ty+140
    phase_names={'A':('Ferrit · α','Ferrite · α'),'G':('Östenit · γ','Austenite · γ'),'C':('Sementit · Fe₃C','Cementite · Fe₃C'),'D':('δ-ferrit','δ-ferrite'),'L':('Sıvı','Liquid')}
    for phase in frame['phases']:
        code,share=phase['f'],phase['oran']
        if share<.00005: continue
        draw.ellipse((tx,yy+5,tx+12,yy+17),fill=colours[code])
        draw.text((tx+24,yy),phase_names[code][int(en)],font=font(18),fill='#293a33')
        pct=f"{share*100:.1f}%" if en else f"%{share*100:.1f}".replace('.',',')
        draw.text((tx+24,yy+27),pct,font=font(23,True),fill='#293a33')
        yy+=76
    draw.line((48,728,W-48,728),fill='#c8cbbf',width=1)
    draw.text((48,743),'ŞEMATİK · ÖLÇEKSİZ · KİNETİK HESABI DEĞİLDİR' if not en else 'SCHEMATIC · UNSCALED · NOT A KINETIC SIMULATION',font=font(13,True),fill='#6b736b')
    draw.text((W-390,743),'Faz Atlası / acarcemal · OG fork',font=font(13),fill='#6b736b')
    return im.convert('RGB')


ffmpeg = args.ffmpeg or shutil.which('ffmpeg')
if not ffmpeg:
    try:
        import imageio_ffmpeg
        ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        raise SystemExit('ffmpeg missing: pass --ffmpeg or install imageio-ffmpeg')

for language in ['tr','en']:
    suffix='' if language=='tr' else '-en'
    output=args.output/f'mikroyapi-sogume{suffix}.mp4'
    command=[ffmpeg,'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(fps),'-i','-','-an','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(output)]
    process=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    frames=manifest['frames']
    for _ in range(8): process.stdin.write(render(frames[0],language).tobytes())
    for frame in frames:
        picture=render(frame,language)
        # Two identical display frames per computed state: intentionally didactic,
        # not physical time. Final fade resets the loop, never a reversed heating.
        for _ in range(2): process.stdin.write(picture.tobytes())
    last=render(frames[-1],language)
    for _ in range(12): process.stdin.write(last.tobytes())
    backdrop=Image.new('RGB',(W,H),'#f3f0e7')
    first=render(frames[0],language)
    for i in range(8): process.stdin.write(Image.blend(last,backdrop,(i+1)/8).tobytes())
    for i in range(8): process.stdin.write(Image.blend(backdrop,first,(i+1)/8).tobytes())
    process.stdin.close()
    error=process.stderr.read().decode(errors='replace')
    if process.wait()!=0: raise RuntimeError(error)
    render(frames[44],language).save(args.output/f'mikroyapi-sogume{suffix}-poster.webp',quality=90)
    print(output)

sidecar={k:v for k,v in manifest.items() if k!='frames'}
sidecar['frameStates']=[{k:v for k,v in frame.items() if k!='files'} for frame in manifest['frames']]
sidecar['display']={'size':[W,H],'fps':fps,'physicalTime':False,'faceAxes':{'top':['z',1],'left':['x',0],'right':['y',0]},'loopReset':'fade, not reversed heating'}
(args.output/'mikroyapi-sogume.manifest.json').write_text(json.dumps(sidecar,ensure_ascii=False,indent=2),encoding='utf8')
