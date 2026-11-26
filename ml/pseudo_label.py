"""Gera caixas de 'pessoa' com um modelo grande (professor) para treinar o YOLO pequeno (aluno).
Roda offline na GPU local. Uso: python pseudo_label.py <modelo.pt> <imgsz> <conf>"""
import sys, pathlib
from ultralytics import YOLO

model_name, imgsz, conf = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
root = pathlib.Path(__file__).resolve().parent   # frames/ e dataset/ ficam ao lado do script (fora do git)
model = YOLO(model_name)
for split in ("train", "val"):
    img_dir = root / "frames" / split
    lab_dir = root / "dataset" / "labels" / split
    out_img = root / "dataset" / "images" / split
    lab_dir.mkdir(parents=True, exist_ok=True); out_img.mkdir(parents=True, exist_ok=True)
    files = sorted(img_dir.glob("*.jpg"))
    total = 0
    for i in range(0, len(files), 8):
        batch = files[i:i + 8]
        res = model.predict([str(f) for f in batch], imgsz=imgsz, conf=conf, classes=[0], verbose=False, device=0)
        for f, r in zip(batch, res):
            lines = [f"0 {x:.6f} {y:.6f} {w:.6f} {h:.6f}" for x, y, w, h in r.boxes.xywhn.tolist()]
            (lab_dir / (f.stem + ".txt")).write_text("\n".join(lines))
            total += len(lines)
            link = out_img / f.name
            if not link.exists():
                link.write_bytes(f.read_bytes())
    print(split, len(files), "quadros", total, "pessoas", flush=True)
