# 섬네일 생성: photo(원본 사진) + kicker/hook(문구) → thumb (960x600)
# hook이 비어 있으면 사진만(사진만으로 내용이 바로 보일 때), 있으면 어두운 그라데이션 + 큰 문구
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
D0 = os.path.dirname(os.path.abspath(__file__)); PUB = os.path.join(D0, '..', 'public')
FB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc'; FM = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
W, H = 960, 600
def cover(im):
    w, h = im.size; s = max(W / w, H / h); im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    l, t = (im.width - W) // 2, (im.height - H) // 2; return im.crop((l, t, l + W, t + H))
def make(it):
    im = cover(Image.open(os.path.join(PUB, it['photo'])).convert('RGB'))
    out = 'assets/img/news/' + os.path.splitext(os.path.basename(it['photo']))[0] + '.jpg'
    if it.get('hook'):
        # 아래쪽·왼쪽이 어두운 그라데이션
        g = Image.new('L', (W, H), 0); gd = ImageDraw.Draw(g)
        for y in range(H):
            a = max(0, min(255, int(255 * ((y / H) - 0.18) / 0.62)))
            gd.line([(0, y), (W, y)], fill=int(a * 0.92))
        navy = Image.new('RGB', (W, H), (11, 22, 52)); im = Image.composite(navy, im, g)
        d = ImageDraw.Draw(im)
        lines = it['hook'].split('\n'); fs = 74 if max(len(l) for l in lines) <= 8 else 64 if max(len(l) for l in lines) <= 10 else 54
        f = ImageFont.truetype(FB, fs, index=1); fk = ImageFont.truetype(FM, 34, index=1)
        y = H - 48 - len(lines) * int(fs * 1.22)
        if it.get('kicker'):
            kb = d.textbbox((0, 0), it['kicker'], font=fk); kw = kb[2] - kb[0]
            d.rounded_rectangle([48, y - 66, 48 + kw + 36, y - 14], radius=26, fill=(226, 201, 155))
            d.text((66, y - 62), it['kicker'], font=fk, fill=(11, 22, 52))
        for i, l in enumerate(lines):
            d.text((48, y + i * int(fs * 1.22)), l, font=f, fill=(255, 255, 255), stroke_width=1, stroke_fill=(11, 22, 52))
    im.save(os.path.join(PUB, out), quality=84, optimize=True)
    it['thumb'] = out
if __name__ == '__main__':
    for fn in ['news.json', 'biz.json', 'llm.json']:
        p = os.path.join(D0, fn); L = json.load(open(p, encoding='utf8'))
        for it in L:
            if it.get('photo'): make(it)
        json.dump(L, open(p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    T = [x['thumb'] for fn in ['news.json', 'biz.json', 'llm.json'] for x in json.load(open(os.path.join(D0, fn), encoding='utf8'))]
    print('thumbs', len(T), 'unique', len(set(T)))
