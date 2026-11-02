"""MIT — contact sheet from the same dynamic section renderer, not input imagery."""
import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[2]
source=root/'private/kesit-paftasi'
manifest=json.loads((source/'manifest.json').read_text())
font_path=Path('C:/Windows/Fonts/segoeui.ttf')
def font(size):
    return ImageFont.truetype(str(font_path),size) if font_path.exists() else ImageFont.load_default()
cell=150;left=80;top=110;row=182
im=Image.new('RGB',(left+cell*9+20,top+row*7+48),'#f4f1e8')
d=ImageDraw.Draw(im)
d.text((20,14),'Fe–C mikroyapı kesitleri · ortak 3B hacimden',font=font(25),fill='#293a33')
d.text((20,48),'650 °C · tohum 20261101 · şematik, ölçeksiz · göreli büyütmeler',font=font(15),fill='#6b736b')
columns=[(m,z) for m in ['phases','constituents','etched'] for z in ['low','medium','high']]
names={'phases':'Faz','constituents':'Bileşen','etched':'Nital'}
zoom={'low':'düşük','medium':'orta','high':'yüksek'}
carbons=[.2,.45,.76,1.2,3,4.38,5]
for col,(mode,mag) in enumerate(columns):
    d.text((left+col*cell+5,top-30),names[mode]+' / '+zoom[mag],font=font(13),fill='#293a33')
for case in manifest['cases']:
    col=columns.index((case['mode'],case['magnification']));r=carbons.index(case['carbon'])
    picture=Image.frombytes('RGBA',(manifest['resolution'],)*2,(source/case['file']).read_bytes()).convert('RGB')
    picture=picture.resize((cell-8,cell-8),Image.Resampling.LANCZOS)
    im.paste(picture,(left+col*cell,top+r*row))
    if col==0:d.text((12,top+r*row+48),('%'+str(case['carbon'])).replace('.',','),font=font(16),fill='#293a33')
d.text((20,im.height-28),'Kesit alan payları tüm numunenin kütle/hacim paylarıyla zorla eşitlenmez. Görsel etkiler kimlik haritasını değiştirmez.',font=font(13),fill='#6b736b')
output=root/'web/gorseller/kesit-paftasi.png'
im.save(output,optimize=True)
print(output)
