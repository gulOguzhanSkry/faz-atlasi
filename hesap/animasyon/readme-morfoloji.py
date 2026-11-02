"""MIT — compose readme-morphology(-en).webp from private/readme-morfoloji (see readme-morfoloji.mjs)."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[2]; SRC = ROOT / 'private/readme-morfoloji'; OUT = ROOT / 'web/gorseller'
def font(size, weight='Regular'):
    bold = weight in ('SemiBold', 'Bold', 'Medium')
    for c in [f'/usr/share/fonts/opentype/inter/Inter-{weight}.otf', 'C:/Windows/Fonts/' + ('segoeuib.ttf' if bold else 'segoeui.ttf'), '/usr/share/fonts/truetype/dejavu/DejaVuSans' + ('-Bold' if bold else '') + '.ttf']:
        if Path(c).exists(): return ImageFont.truetype(c, size)
    return ImageFont.load_default()
BG, INK, MUTED, RULE = (246, 243, 236), (31, 42, 40), (102, 112, 108), (214, 208, 196)
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

def chips(d, x, y, st, lang, size=15, width=330, line=22):
    for p in st['parts']:
        if p['fraction'] <= 0: continue
        d.rectangle([x, y + 3, x + 13, y + 16], fill=COLORS.get(p['id'], '#8b8f8c'), outline=(60, 60, 60))
        d.text((x + 20, y), f"{NAMES[lang].get(p['id'], p['id'])}", font=font(size), fill=INK)
        d.text((x + width, y), pct(p['fraction'], lang), font=font(size, 'Medium'), fill=INK, anchor='ra')
        y += line
    return y

MORPH = {
 'tr': ['Ötektoid öncesi ferrit sınırlarda değişken kalınlıkta, kendi taneleriyle; eski östenit sınırı ferritin içinden geçmez. Perlit koloniler hâlinde.',
        'İkincil sementit eski östenit sınırlarında ağ; ince yüzlerde boncuklu. İçte perlit kolonileri.',
        'Birincil östenit <100> dendritleri (gövde + ikincil kollar); aralarda ötektik ledeburit.',
        'Dönüşmüş dendritler perlit, kenarlarında ikincil sementit; ledeburit matrisi kesintisiz.',
        'Ledeburit: sürekli sementit matrisinde yönlenmiş, kesintili γ çubukları; koloni merkezinde ince noktalar.',
        'Birincil sementit uzun levhalar hâlinde; çevresi dönüşmüş ledeburit. Tane sınırı çizilmez.'],
 'en': ['Proeutectoid ferrite on prior boundaries with varying thickness and its own grains; no prior-austenite boundary crosses it. Pearlite in colonies.',
        'Secondary cementite as a network on prior boundaries, beaded on thin facets; pearlite colonies inside.',
        'Primary austenite <100> dendrites (trunks + secondary arms) with eutectic ledeburite between them.',
        'Transformed dendrites are pearlite rimmed by secondary cementite; the ledeburite matrix stays continuous.',
        'Ledeburite: oriented, broken γ rods in a continuous cementite matrix; fine spots at colony centres.',
        'Primary cementite as long plates in transformed ledeburite. No grain boundaries are drawn.']}

def morph(lang):
    cases = json.load(open(SRC / 'manifest.json'))['cases']
    P, cw, chh = 470, 520, 660
    W, H = cw * 3 + 60, 130 + 2 * chh + 10
    img = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(img)
    d.text((40, 28), {'tr': 'Kesit morfolojisi: hesaplanan miktar, gerçekçi yerleşim', 'en': 'Section morphology: calculated amounts, realistic placement'}[lang], font=font(32, 'SemiBold'), fill=INK)
    d.text((40, 76), {'tr': 'Her kesitte bileşen alan kesri, 3B hacimdeki kütle bütçesine ortalamada eşittir (Delesse, ±%4 test edilir). Temsili ölçek: önceki östenit tanesi ≈40 µm; çözünürlük altındaki lameller şematik çizgiyle.',
                      'en': 'In every section the constituent area fraction matches the 3D mass budget on average (Delesse, tested to ±4 %). Representative scale: prior-austenite grain ≈40 µm; sub-pixel lamellae drawn as schematic stripes.'}[lang], font=font(16), fill=MUTED)
    for k, st in enumerate(cases):
        x0, y0 = 30 + (k % 3) * cw, 130 + (k // 3) * chh
        im = Image.frombytes('RGBA', (512, 512), open(SRC / st['file'], 'rb').read()).convert('RGB').resize((P, P), Image.LANCZOS)
        img.paste(im, (x0 + 10, y0)); d.rectangle([x0 + 10, y0, x0 + 10 + P - 1, y0 + P - 1], outline=(49, 75, 72), width=2)
        y = y0 + P + 14
        d.text((x0 + 10, y), point_label(st, lang), font=font(20, 'SemiBold'), fill=INK)
        # wrap description
        words, line, yy = MORPH[lang][k].split(), '', y + 32
        for w in words:
            t = (line + ' ' + w).strip()
            if d.textlength(t, font=font(15)) > P: d.text((x0 + 10, yy), line, font=font(15), fill=MUTED); yy += 20; line = w
            else: line = t
        d.text((x0 + 10, yy), line, font=font(15), fill=MUTED); yy += 28
        chips(d, x0 + 10, yy, st, lang, size=14, width=P, line=20)
    img.save(OUT / f'readme-morphology{"-en" if lang == "en" else ""}.webp', quality=90, method=6)

for lang in ['tr', 'en']:
    morph(lang)
