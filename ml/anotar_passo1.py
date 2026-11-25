"""Gera a imagem do passo 01: quadro real da câmera com cada mesa marcada (verde livre, amarelo ocupada, azul atendida) e legenda.
É uma montagem: o estado de cada mesa vem do modelo no quadro; a imagem não é uma captura do painel."""
import sys, cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont
from ultralytics import YOLO
video, modelo, t, saida = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
CORRIGE = {int(a.split("=")[0]): a.split("=")[1] for a in sys.argv[5:]}   # correção manual de mesa (índice=estado), declarada na legenda da imagem
Z = [(560,115,80,60),(690,130,75,60),(800,125,95,60),(608,185,140,70),(785,280,170,85),(600,270,180,95),(690,430,260,110)]
cap = cv2.VideoCapture(video); cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000); ok, fr = cap.read(); assert ok
H, W = fr.shape[:2]; k = W / 960
r = YOLO(modelo).predict(cv2.resize(fr, (960, 540)), imgsz=960, conf=0.35, iou=0.5, verbose=False, device="cpu")[0]
P = r.boxes.xyxy.tolist()
COR = {"livre": (96, 220, 61), "ocupada": (46, 190, 255), "atendida": (255, 176, 90)}   # BGR
NOME = {"livre": "livre", "ocupada": "ocupada", "atendida": "atendida"}
TXT = []
for i, (zx, zy, zw, zh) in enumerate(Z):
    dentro = lambda b, mg: zx-mg <= (b[0]+b[2])/2 <= zx+zw+mg and zy-mg <= b[1]+(b[3]-b[1])*0.75 <= zy+zh+mg
    sent = [b for b in P if dentro(b, 15) and (b[3]-b[1])/max(1, b[2]-b[0]) < 2.0]
    pe = [b for b in P if dentro(b, 40) and (b[3]-b[1])/max(1, b[2]-b[0]) >= 2.0]
    est = "livre" if not [b for b in P if dentro(b, 15)] else ("atendida" if sent and pe else "ocupada")
    est = CORRIGE.get(i, est)
    x, y, w, h = [int(v * k) for v in (zx, zy, zw, zh)]
    cv2.rectangle(fr, (x, y), (x + w, y + h), COR[est], 6)
    TXT.append((x + 4, y - 40, NOME[est], COR[est]))
# recorte 4:3 sobre as mesas; textos com acento via PIL
cx0 = int(360 * k); cw = W - cx0; ch = int(cw * 3 / 4) - 80; cy0 = max(0, min(H - ch, int(90 * k)))
crop = Image.fromarray(cv2.cvtColor(fr[cy0:cy0 + ch, cx0:cx0 + cw], cv2.COLOR_BGR2RGB)); d = ImageDraw.Draw(crop)
fonte = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 34); peq = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 30)
for x, y, txt, bgr in TXT:
    x -= cx0; y -= cy0; rgb = bgr[::-1]
    d.rectangle([x - 2, y - 2, x + d.textlength(txt, font=fonte) + 8, y + 40], fill=(15, 15, 15)); d.text((x + 4, y), txt, font=fonte, fill=rgb)
bar = Image.new("RGB", (crop.width, 80), (18, 18, 18)); db = ImageDraw.Draw(bar); x = 24
for est, txt in (("livre", "mesa livre"), ("ocupada", "ocupada, sem atendimento"), ("atendida", "atendida (alguém em pé junto)")):
    db.rectangle([x, 26, x + 36, 56], fill=COR[est][::-1]); db.text((x + 48, 22), txt, font=peq, fill=(235, 235, 235)); x += 48 + int(db.textlength(txt, font=peq)) + 36
out = Image.new("RGB", (crop.width, crop.height + 80)); out.paste(crop, (0, 0)); out.paste(bar, (0, crop.height)); out.save(saida, quality=92); print(out.size)
