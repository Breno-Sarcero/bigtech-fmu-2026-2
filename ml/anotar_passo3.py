"""Imagem do passo 03: quadro real do buffet com quadrados nas seções onde mais gente se concentra (cubas que esvaziam mais rápido).
MONTAGEM ILUSTRATIVA: o nível de procura de cada seção foi marcado à mão (o detector de pessoas perde gente na fila densa),
só para mostrar a ideia. Não é medição do nível das cubas."""
import sys, cv2
from PIL import Image, ImageDraw, ImageFont
from ultralytics import YOLO
video, modelo, t, saida = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
cap = cv2.VideoCapture(video); cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000); ok, fr = cap.read(); assert ok
H, W = fr.shape[:2]; k = W / 960
# seções ao longo do balcão do buffet 1, em pixels do recorte 1280x960 (x, y, largura, altura)
SEC = [(560,270,260,230),(780,320,260,260),(640,560,260,250),(380,640,260,230),(280,420,260,260),(60,690,260,180)]
cx0, cw = 0, 1280; ch = 880
crop = Image.fromarray(cv2.cvtColor(fr[0:ch, 0:cw], cv2.COLOR_BGR2RGB)); d = ImageDraw.Draw(crop, "RGBA")
fonte = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 30); peq = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 30)
NIVEL = [0, 1, 2, 2, 0, 1]     # 0 pouca, 1 média, 2 muita procura (marcação manual)
for (x, y, w, h), c in zip(SEC, NIVEL):
    cor = (255, 77, 77) if c == 2 else (255, 176, 46) if c == 1 else (61, 220, 132)
    d.rectangle([x, y, x + w, y + h], outline=cor + (255,), width=6, fill=cor + (45,))
    txt = ("repor logo" if c == 2 else "atenção" if c == 1 else "ok"); d.rectangle([x, y - 38, x + d.textlength(txt, font=fonte) + 14, y], fill=(15, 15, 15, 230)); d.text((x + 7, y - 36), txt, font=fonte, fill=cor)
bar = Image.new("RGB", (crop.width, 80), (18, 18, 18)); db = ImageDraw.Draw(bar); x = 24
for cor, txt in (((255, 77, 77), "muita procura: possível reposição"), ((255, 176, 46), "procura média"), ((61, 220, 132), "pouca procura")):
    db.rectangle([x, 26, x + 36, 56], fill=cor); db.text((x + 48, 22), txt, font=peq, fill=(235, 235, 235)); x += 48 + int(db.textlength(txt, font=peq)) + 30
out = Image.new("RGB", (crop.width, crop.height + 80)); out.paste(crop, (0, 0)); out.paste(bar, (0, crop.height)); out.save(saida, quality=92); print(out.size)
