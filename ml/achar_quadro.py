"""Procura um quadro dos cortes em que apareçam mesa livre, ocupada e atendida ao mesmo tempo (para a imagem do passo 01)."""
import sys, cv2, json
from ultralytics import YOLO
modelo, pasta = sys.argv[1:3]
Z = [(560,115,80,60),(690,130,75,60),(800,125,95,60),(608,185,140,70),(785,280,170,85),(600,270,180,95),(690,430,260,110)]
m = YOLO(modelo); best = []
for arq in ("b1-pico.mp4", "b1-fim.mp4"):
    cap = cv2.VideoCapture(f"{pasta}/{arq}"); fps = cap.get(cv2.CAP_PROP_FPS) or 15
    for t in range(0, 118, 2):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps)); ok, fr = cap.read()
        if not ok: break
        r = m.predict(cv2.resize(fr, (960, 540)), imgsz=960, conf=0.35, iou=0.5, verbose=False, device="cpu")[0]
        P = [(x1, y1, x2, y2) for x1, y1, x2, y2 in r.boxes.xyxy.tolist()]
        est = []
        for zx, zy, zw, zh in Z:
            def dentro(b, mg): cx, cy = (b[0]+b[2])/2, b[1]+(b[3]-b[1])*0.75; return zx-mg <= cx <= zx+zw+mg and zy-mg <= cy <= zy+zh+mg
            sent = [b for b in P if dentro(b, 15) and (b[3]-b[1])/max(1, b[2]-b[0]) < 2.0]
            pe = [b for b in P if dentro(b, 40) and (b[3]-b[1])/max(1, b[2]-b[0]) >= 2.0]
            est.append("livre" if not [b for b in P if dentro(b, 15)] else ("atendida" if sent and pe else "ocupada"))
        n = {k: est.count(k) for k in ("livre", "ocupada", "atendida")}
        best.append((min(n.values()) * 10 + sum(1 for v in n.values() if v), arq, t, n, est))
best.sort(key=lambda x: -x[0])
for b in best[:6]: print(b[1], b[2], b[3], b[4])
