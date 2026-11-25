"""Mede ocupação de mesas nos cortes de 2 min (pico e pós-pico) das câmeras da Bovinu's.
Usa o modelo de pessoas treinado (ONNX) e as mesas calibradas (as mesmas do site, em 960x540).
Uso: python medir_cortes.py <modelo.onnx> <pasta_dos_cortes> <saida.json>"""
import sys, json, cv2, numpy as np
from ultralytics import YOLO

modelo, pasta, saida = sys.argv[1:4]
# mesas calibradas por câmera: x, y, largura, altura (igual ao site/js/mesas.js)
MESAS = {
    "buffet1": [(560,115,80,60),(690,130,75,60),(800,125,95,60),(608,185,140,70),(785,280,170,85),(600,270,180,95),(690,430,260,110)],
    "buffet2": [(40,130,75,60),(90,235,100,70),(135,430,250,110),(35,445,95,95)],
}
CORTES = [("buffet1","pico","b1-pico.mp4","13:14:45"),("buffet1","apos","b1-fim.mp4","13:54:45"),
          ("buffet2","pico","b2-pico.mp4","13:14:52"),("buffet2","apos","b2-fim.mp4","13:54:52")]
PASSO_S = 5
m = YOLO(modelo, task="detect")
res = {"passo_s": PASSO_S, "series": []}
for cam, janela, arq, inicio in CORTES:
    cap = cv2.VideoCapture(f"{pasta}/{arq}"); fps = cap.get(cv2.CAP_PROP_FPS) or 15
    mesas = MESAS[cam]; ocupadas, pessoas = [], []
    for t in range(0, 120, PASSO_S):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps)); ok, fr = cap.read()
        if not ok: break
        fr = cv2.resize(fr, (960, 540))
        r = m.predict(fr, imgsz=960, conf=0.35, iou=0.5, verbose=False, device="cpu")[0]
        c = [((x1+x2)/2, (y1+y2)/2) for x1,y1,x2,y2 in r.boxes.xyxy.tolist()]
        # pessoa conta na mesa se o centro da caixa estiver na zona (com folga de 15 px)
        occ = sum(any(zx-15 <= px <= zx+zw+15 and zy-15 <= py <= zy+zh+15 for px,py in c) for zx,zy,zw,zh in mesas)
        ocupadas.append(occ); pessoas.append(len(c))
    res["series"].append({"camera": cam, "janela": janela, "inicio": inicio, "mesas": len(mesas), "ocupadas": ocupadas, "pessoas": pessoas})
    print(cam, janela, "ocupadas média %.1f/%d" % (np.mean(ocupadas), len(mesas)), "pessoas média %.1f" % np.mean(pessoas), flush=True)
json.dump(res, open(saida, "w"), indent=1)
