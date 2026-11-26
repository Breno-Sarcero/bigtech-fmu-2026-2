# Modelo de mesas e pessoas

Detector de pessoas treinado com quadros das câmeras cedidas pela Bovinu's. Os quadros e os vídeos completos **não** estão no repositório.

Ordem dos scripts:

| Script | Para quê |
|---|---|
| `achar_quadro.py` | Escolhe quadros dos vídeos (1 a cada 10 s) |
| `pseudo_label.py` | Gera as caixas de "pessoa" com o YOLOv8l (pseudo-rótulos) |
| `train.py` | Ajusta (fine-tune) um YOLOv8 nano e exporta para ONNX |
| `medir_cortes.py` | Mede mesas e pessoas nos 4 cortes de 2 min e grava `site/data/medicao-cortes.json` |
| `anotar_passo1.py`, `anotar_passo2.py`, `anotar_passo3.py` | Desenham as marcações das imagens dos passos do site |

Resultado: mAP50 de 0,88 no teste. É a concordância com o modelo grande, não com a verdade absoluta. O modelo final roda no navegador (`site/models/mesas-yolov8n.onnx`).
