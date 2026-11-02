"""MIT — compose readme-microstructures(-en).webp and readme-display-modes(-en).webp
from private/readme-galerisi (see readme-galerisi.mjs)."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[2]; SRC = ROOT / 'private/readme-galerisi'; OUT = ROOT / 'web/gorseller'
CASES = json.load(open(SRC / 'manifest.json', encoding='utf-8'))['cases']
for st in CASES: st['parts'] = [p for p in st['parts'] if p['fraction'] > 0]
def font(size, weight='Regular'):
    bold = weight in ('SemiBold', 'Bold', 'Medium')
    for c in [f'/usr/share/fonts/opentype/inter/Inter-{weight}.otf', 'C:/Windows/Fonts/' + ('segoeuib.ttf' if bold else 'segoeui.ttf'), '/usr/share/fonts/truetype/dejavu/DejaVuSans' + ('-Bold' if bold else '') + '.ttf']:
        if Path(c).exists(): return ImageFont.truetype(c, size)
    return ImageFont.load_default()
BG, INK, MUTED, RULE = (246, 243, 236), (31, 42, 40), (102, 112, 108), (214, 208, 196)
def face(prefix, key, F):
    st, mode = prefix
    return Image.frombytes('RGB', (F, F), open(SRC / st['files'][f'{mode}-{key}'], 'rb').read())
def footer(d, W, y, text):
    d.text((W / 2, y), text, font=font(15), fill=MUTED, anchor='ma')
NAMES = {
 'tr': {'proeutectoid-ferrite': 'Ötektoid öncesi ferrit', 'ferrite': 'Ferrit', 'tertiary-cementite': 'Tersiyer sementit', 'pearlite': 'Perlit',
        'secondary-cementite': 'İkincil sementit', 'austenite': 'Östenit', 'primary-austenite': 'Birincil östenit', 'ledeburite': 'Ledeburit',
        'transformed-ledeburite': 'Dönüşmüş ledeburit', 'primary-cementite': 'Birincil sementit', 'liquid': 'Sıvı'},
 'en': {'proeutectoid-ferrite': 'Proeutectoid ferrite', 'ferrite': 'Ferrite', 'tertiary-cementite': 'Tertiary cementite', 'pearlite': 'Pearlite',
        'secondary-cementite': 'Secondary cementite', 'austenite': 'Austenite', 'primary-austenite': 'Primary austenite', 'ledeburite': 'Ledeburite',
        'transformed-ledeburite': 'Transformed ledeburite', 'primary-cementite': 'Primary cementite', 'liquid': 'Liquid'}}
COLORS = {'proeutectoid-ferrite': '#e4d3a2', 'ferrite': '#e4d3a2', 'tertiary-cementite': '#3f2b3d', 'pearlite': '#8d7d4f', 'secondary-cementite': '#55395a',
          'austenite': '#6f95b2', 'primary-austenite': '#4c7898', 'ledeburite': '#a3647f', 'transformed-ledeburite': '#b58399', 'primary-cementite': '#3a2638', 'liquid': '#c76c43'}
PHASES = {'A': ('α', '#d8ba78'), 'G': ('γ', '#547c9c'), 'C': ('Fe₃C', '#70536c'), 'L': ('L', '#c76c43'), 'D': ('δ', '#79a69c')}

def num(x, lang, digits=2):
    s = f'{x:.{digits}f}'.rstrip('0').rstrip('.') if digits else f'{x:.0f}'
    return s.replace('.', ',') if lang == 'tr' else s
def point_label(st, lang):
    c, t = num(st['carbon'], lang), num(st['temperature'], lang, 0)
    return f'%{c} C · {t} °C' if lang == 'tr' else f'{c} wt% C · {t} °C'
def pct(f, lang):
    if 0 < f < .0005: return '<%0,1' if lang == 'tr' else '<0.1%'
    return ('%' + num(f * 100, lang, 1)) if lang == 'tr' else (num(f * 100, lang, 1) + '%')

def cube(prefix, F, edge):
    """Isometric unit cube from the three visible faces; supersampled ×2, then downscaled."""
    s, c = edge * 2, np.cos(np.pi / 6)
    W, H = int(2 * c * s) + 8, int(2 * s) + 8
    ox, oy = W / 2, s + 4
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    faces = {  # texture (tu,tv) -> screen: X = a*tu + b*tv + e ; Y = cc*tu + d*tv + f
     'top': ([[c * s / F, -c * s / F], [.5 * s / F, .5 * s / F]], [ox, oy - s], 1.0),
     'x': ([[-c * s / F, 0], [.5 * s / F, s / F]], [ox + c * s, oy + .5 * s - s], .86),
     'y': ([[c * s / F, 0], [.5 * s / F, s / F]], [ox - c * s, oy + .5 * s - s], .72)}
    for key, (M, off, shade) in faces.items():
        tex = face(prefix, key, F).point(lambda q: int(q * shade))
        M = np.array(M); inv = np.linalg.inv(M); o = np.array(off)
        # PIL wants output->input: tu = inv @ ([X,Y]-o)
        coeff = (inv[0, 0], inv[0, 1], -(inv[0] @ o), inv[1, 0], inv[1, 1], -(inv[1] @ o))
        layer = tex.transform((W, H), Image.AFFINE, coeff, resample=Image.BILINEAR)
        mask = Image.new('L', (F, F), 255).transform((W, H), Image.AFFINE, coeff, resample=Image.BILINEAR)
        out.paste(layer, (0, 0), mask)
    d = ImageDraw.Draw(out)
    P = lambda x, y, z: (ox + (x - y) * c * s, oy + (x + y) * .5 * s - z * s)
    for a, b in [((0,0,1),(1,0,1)),((1,0,1),(1,1,1)),((1,1,1),(0,1,1)),((0,1,1),(0,0,1)),((1,0,1),(1,0,0)),((1,1,1),(1,1,0)),((0,1,1),(0,1,0)),((1,0,0),(1,1,0)),((1,1,0),(0,1,0))]:
        d.line([P(*a), P(*b)], fill=(49, 75, 72, 255), width=3)
    return out.resize((W // 2, H // 2), Image.LANCZOS)

def chips(d, x, y, st, lang, size=15, width=330, line=22):
    for p in st['parts']:
        if p['fraction'] <= 0: continue
        d.rectangle([x, y + 3, x + 13, y + 16], fill=COLORS.get(p['id'], '#8b8f8c'), outline=(60, 60, 60))
        d.text((x + 20, y), f"{NAMES[lang].get(p['id'], p['id'])}", font=font(size), fill=INK)
        d.text((x + width, y), pct(p['fraction'], lang), font=font(size, 'Medium'), fill=INK, anchor='ra')
        y += line
    return y

def footer(d, W, y, text):
    d.text((W / 2, y), text, font=font(15), fill=MUTED, anchor='ma')

def hero(lang):
    
    cw, chh, cols = 450, 500, 4
    W, H = cw * cols + 60, chh * 2 + 200
    img = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(img)
    title = {'tr': 'Yavaş soğuma referansında sekiz Fe–C mikroyapısı', 'en': 'Eight Fe–C microstructures under the slow-cooling reference'}[lang]
    sub = {'tr': 'Faz ve bileşen oranları kaynak denge hesabından gelir; yerleşim 384 taneli ortak 3B hacimde şematiktir.',
           'en': 'Phase and constituent amounts come from the source equilibrium calculation; their arrangement in the shared 384-grain 3D volume is schematic.'}[lang]
    d.text((40, 32), title, font=font(34, 'SemiBold'), fill=INK); d.text((40, 80), sub, font=font(18), fill=MUTED)
    note = {'tr': 'Bileşen renkleri; perlit ve ledeburit içindeki Fe₃C koyu tonla, çözünürlük altındaki lameller şematik çizgiyle gösterilir.', 'en': 'Constituent colours; Fe₃C inside pearlite and ledeburite is darker, sub-pixel lamellae drawn as schematic stripes.'}[lang]
    d.text((40, 110), note, font=font(15), fill=MUTED)
    for k, st in enumerate(CASES):
        x0, y0 = 30 + (k % cols) * cw, 150 + (k // cols) * chh
        cb = cube((st, 'hybrid'), 384, 150)
        img.paste(cb, (x0 + (cw - cb.width) // 2, y0 + 8), cb)
        y = y0 + cb.height + 22
        d.text((x0 + 40, y), point_label(st, lang), font=font(21, 'SemiBold'), fill=INK)
        chips(d, x0 + 40, y + 36, st, lang, width=350)
    footer(d, W, H - 42, {'tr': 'Çevrim dışı şematik render · ölçülmüş mikrograf veya arayüz ekran görüntüsü değildir · temsili ölçek: önceki östenit tanesi ≈40 µm, lamel aralığı ≈0,5 µm',
                          'en': 'Offline schematic renders · not measured micrographs or interface screenshots · representative scale: prior-austenite grain ≈40 µm, lamellar spacing ≈0.5 µm'}[lang])
    img.save(OUT / f'readme-microstructures{"-en" if lang == "en" else ""}.webp', quality=88, method=6)

def display_modes(lang):
    
    lab, cell, rowh = 250, 270, 300
    gw = lab + 3 * cell
    W, H = gw * 2 + 80, 150 + 4 * rowh + 50
    img = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(img)
    d.text((40, 30), {'tr': 'Aynı hacmin üç gösterimi', 'en': 'Three displays of the same volume'}[lang], font=font(32, 'SemiBold'), fill=INK)
    heads = {'tr': ['Faz renkleri', 'Bileşen renkleri', 'Dağlanmış kesit'], 'en': ['Phase colours', 'Constituent colours', 'Etched section']}[lang]
    for gcol in range(2):
        gx = 40 + gcol * (gw + 0)
        for j, h in enumerate(heads): d.text((gx + lab + j * cell + cell / 2, 100), h, font=font(18, 'Medium'), fill=MUTED, anchor='ma')
        d.line([(gx, 132), (gx + gw - 20, 132)], fill=RULE, width=2)
    for k, st in enumerate(CASES):
        gx = 40 + (k // 4) * gw; y0 = 150 + (k % 4) * rowh
        d.text((gx, y0 + 40), point_label(st, lang), font=font(19, 'SemiBold'), fill=INK)
        yy = y0 + 76
        for p in st['phases']:
            if p['oran'] <= 0: continue
            name, col = PHASES[p['f']]
            d.rectangle([gx, yy + 3, gx + 12, yy + 15], fill=col, outline=(60, 60, 60)); d.text((gx + 20, yy), f"{name}  {pct(p['oran'], lang)}", font=font(15), fill=INK); yy += 21
        for j, mode in enumerate(['phases', 'constituents']):
            cb = cube((st, mode), 384, 118)
            img.paste(cb, (gx + lab + j * cell + (cell - cb.width) // 2, y0 + 8), cb)
        sec = Image.frombytes('RGB', (512, 512), open(SRC / st['files']['section'], 'rb').read()).resize((236, 236), Image.LANCZOS)
        sx = gx + lab + 2 * cell + (cell - 236) // 2; img.paste(sec, (sx, y0 + 18)); d.rectangle([sx, y0 + 18, sx + 235, y0 + 253], outline=(49, 75, 72), width=2)
        if not st['etchedValid']:
            d.text((sx + 118, y0 + 262), {'tr': 'γ var → faz renklerine döner', 'en': 'γ present → falls back to phase colours'}[lang], font=font(13), fill=MUTED, anchor='ma')
    footer(d, W, H - 40, {'tr': 'Dağlama tonları temsili Nital kontrastıdır (sementit parlak, ferrit açık, çözünürlük altındaki perlit koyu); kesit orta büyütmede yeniden örneklenir, kimlik haritası değişmez.',
                          'en': 'Etched tones are an illustrative Nital contrast (cementite bright, ferrite light, unresolved pearlite dark); the section is resampled at medium magnification, the identity map is unchanged.'}[lang])
    img.save(OUT / f'readme-display-modes{"-en" if lang == "en" else ""}.webp', quality=88, method=6)


for lang in ['tr', 'en']:
    hero(lang); display_modes(lang)
