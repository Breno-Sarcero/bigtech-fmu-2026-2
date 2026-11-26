"""Imagem do passo 02: foto do prato (gerada por IA, sem marcações) com a leitura de cores REAL do site por cima.
Porta para Python a função classify() de site/js/prato.js e aplica no prato; as porcentagens da legenda saem desse cálculo.
Uso: python anotar_passo2.py <foto.png> <saida.jpg>"""
import sys, cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont
foto, saida = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(foto).convert("RGB")).astype(np.float32); H, W = im.shape[:2]
# acha o prato: maior círculo claro (Hough)
g = cv2.medianBlur(cv2.cvtColor(im.astype(np.uint8), cv2.COLOR_RGB2GRAY), 7)
c = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=1.5, minDist=W, param1=120, param2=60, minRadius=int(W * 0.30), maxRadius=int(W * 0.55))
assert c is not None, "prato não encontrado"
cx, cy, r = c[0][0]; r *= 0.92                                   # mesma ideia do RAIO_PCT = 92% do site
print("prato:", int(cx), int(cy), int(r))
R, G, B = im[..., 0] / 255, im[..., 1] / 255, im[..., 2] / 255
mx = np.maximum(np.maximum(R, G), B); mn = np.minimum(np.minimum(R, G), B); d = mx - mn
h = np.zeros_like(mx); nz = d > 0
rm = nz & (mx == R); gm = nz & (mx == G) & ~rm; bm = nz & ~rm & ~gm
h[rm] = ((G - B)[rm] / d[rm]) % 6; h[gm] = (B - R)[gm] / d[gm] + 2; h[bm] = (R - G)[bm] / d[bm] + 4
h = (h * 60) % 360; s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0); v = mx
cls = np.full(mx.shape, -1)
cls[(s > .22) & (h >= 70) & (h <= 170)] = 2
m = (cls == -1) & (h >= 260) & (h < 345); cls[m] = 3
m = (cls == -1) & (h >= 36) & (h < 70) & (s > .18); cls[m] = 1
m = (cls == -1) & ((h < 36) | (h >= 345)) & (s > .3); cls[m & (v < .62)] = 0; cls[m & (v >= .62)] = 3
m = (cls == -1) & (s > .2); cls[m & (v < .7)] = 0; cls[m & (v >= .7)] = 3     # resto do ramo final do classify()
cls[v < 0.12] = -1; cls[(s < .12) & (v > .62)] = -1
yy, xx = np.mgrid[0:H, 0:W]; dentro = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r
cls[~dentro] = -1
CORES = np.array([[196, 85, 45], [233, 196, 106], [61, 174, 106], [192, 86, 128]], np.float32)
out = im.copy()
for k in range(4):
    mk = cls == k; out[mk] = im[mk] * 0.45 + CORES[k] * 0.55
n = np.array([(cls == k).sum() for k in range(4)], float); share = n / max(n.sum(), 1)
print("carne %.0f%% carboidrato %.0f%% salada %.0f%% outros %.0f%%" % tuple(share * 100))
img = Image.fromarray(out.astype(np.uint8)); dr = ImageDraw.Draw(img)
dr.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 90, 31), width=5)
f = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", int(H * 0.034)); bar = Image.new("RGB", (W, int(H * 0.09)), (18, 18, 18)); db = ImageDraw.Draw(bar); x = 24
for k, nome in enumerate(("Carne", "Carboidrato", "Salada", "Sobremesa/outros")):
    db.rectangle([x, bar.height * 0.3, x + 30, bar.height * 0.7], fill=tuple(int(c) for c in CORES[k])); t = f"{nome} {share[k]*100:.0f}%"
    db.text((x + 40, bar.height * 0.22), t, font=f, fill=(235, 235, 235)); x += 40 + int(db.textlength(t, font=f)) + 36
# recorte 4:3 no total (foto + barra), tirando o excesso do topo (só madeira)
alvo = int(W * 3 / 4) - bar.height; corte = max(0, H - alvo)
img = img.crop((0, corte, W, H)); final = Image.new("RGB", (W, img.height + bar.height)); final.paste(img, (0, 0)); final.paste(bar, (0, img.height)); final.save(saida, quality=92); print(final.size)
