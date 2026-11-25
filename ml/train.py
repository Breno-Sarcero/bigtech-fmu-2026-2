from ultralytics import YOLO
m = YOLO("yolov8n.pt")
m.train(data=r"E:\Codigos\HACKATHON-BOVINUS\ml\data.yaml", imgsz=960, epochs=40, batch=8, workers=0, device=0,
        project=r"E:\Codigos\HACKATHON-BOVINUS\ml\runs", name="mesas-n", exist_ok=True, amp=False, plots=False, patience=15)
