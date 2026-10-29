# Uso: python3 tools/cutout.py input.jpg assets/sprites/N.png  (richiede Pillow + numpy)
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

SRC = sys.argv[1]; DST = sys.argv[2]; SIZE = 320

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.int16)
h, w, _ = a.shape
# "sfondo" = pixel chiari e poco saturi (bianco + ombra grigia)
mn = a.min(axis=2); mx = a.max(axis=2)
light = (mn > 170) & ((mx - mn) < 40)

# flood fill dai bordi, solo attraverso pixel chiari
bg = np.zeros((h, w), bool)
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if light[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
for y in range(h):
    for x in (0, w - 1):
        if light[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
while q:
    y, x = q.popleft()
    for ny, nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
        if 0 <= ny < h and 0 <= nx < w and light[ny, nx] and not bg[ny, nx]:
            bg[ny, nx] = True; q.append((ny, nx))

alpha = Image.fromarray(((~bg) * 255).astype(np.uint8))
# leggero ammorbidimento del bordo
alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
out = im.convert("RGBA"); out.putalpha(alpha)

# ritaglio al contenuto, poi quadrato con padding
bbox = out.getbbox()
out = out.crop(bbox)
cw, ch = out.size
side = int(max(cw, ch) * 1.06)
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
canvas.paste(out, ((side - cw) // 2, side - ch - (side - ch) // 8))
canvas = canvas.resize((SIZE, SIZE), Image.LANCZOS)
canvas.save(DST, optimize=True)
print(DST, canvas.size, "bg%:", round(bg.mean()*100, 1))
