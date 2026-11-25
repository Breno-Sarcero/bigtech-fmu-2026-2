# Imagens da seção "Solução" — prompts para gerar no Google

A seção pinada da página (os passos 01 a 04) já tem espaço para 4 imagens. Enquanto o arquivo não existir, o desenho em SVG aparece no lugar; quando você colocar a imagem na pasta `site/img/`, ela cobre o desenho automaticamente (sem mexer no código).

## Como entregar

| Passo | Arquivo | O que mostra |
|---|---|---|
| 01 Mesas com relógio | `site/img/passo-1-mesas.webp` | Salão visto do alto, mesas marcadas por cor de espera |
| 02 Mix do prato | `site/img/passo-2-prato.webp` | Prato visto do alto dividido por categoria |
| 03 Buffet que se avisa | `site/img/passo-3-cubas.webp` | Buffet visto do alto com o nível de cada cuba |
| 04 Avaliação sem atrito | `site/img/passo-4-avaliacao.webp` | Mesa com adesivo QR e cartão de aproximação |

- Proporção **4:3**, de preferência 1600 × 1200 px.
- Formato **WebP**, no máximo uns 250 KB cada (para o site não ficar lento). Para converter: `ffmpeg -i entrada.png -quality 82 passo-1-mesas.webp`.
- Mesmo estilo nas quatro, para parecerem uma série.

## Estilo comum (cole no começo de cada prompt)

> Ilustração fotorrealista suave, estilo editorial de tecnologia, luz quente de restaurante à tarde, paleta de madeira escura, laranja-brasa e tons neutros, com realces em verde, amarelo e vermelho apenas onde indicado. Visão de cima, levemente inclinada. Sem logotipos, sem marcas, sem texto legível, sem rostos em destaque. Composição limpa com espaço livre nas bordas. Proporção 4:3.

## Prompts

**01 · Mesas com relógio**
> [estilo comum] Salão de um restaurante self-service rústico visto do alto, com cerca de dez mesas de madeira. Sobre algumas mesas, um contorno fino brilhante: verde nas mesas atendidas, amarelo nas que esperam há pouco tempo e vermelho em duas mesas esperando há muito. Pequenas figuras de pessoas sentadas, sem detalhes de rosto. Ao fundo, uma câmera de teto discreta com um leve feixe de luz apontando para o salão.

**02 · Mix do prato**
> [estilo comum] Prato branco de buffet por quilo visto de cima, com carne grelhada, arroz, salada verde e um pedaço de sobremesa. Sobre a comida, camadas translúcidas de cor separando as categorias: marrom-avermelhado para a carne, amarelo para o carboidrato, verde para a salada e rosa para a sobremesa, como uma análise de imagem. Uma balança digital aparece na borda inferior da imagem.

**03 · Buffet que se avisa**
> [estilo comum] Bancada de buffet self-service vista do alto com cinco cubas de inox em fila, cada uma com um alimento diferente em nível diferente (uma quase cheia, uma pela metade, uma quase vazia). Uma pequena marca luminosa amarela sobre a cuba quase vazia. Câmera de teto discreta acima, com feixe de luz suave sobre a bancada.

**04 · Avaliação sem atrito** *(a imagem que você pediu)*
> [estilo comum] Close de uma mesa de restaurante vista de cima, ao lado dos guardanapos: um pequeno adesivo quadrado com QR code genérico colado na mesa e, ao lado, um cartão de aproximação (NFC) com o desenho de cinco estrelas e uma seta para um celular. Um celular aproximando-se do cartão, com a tela mostrando cinco estrelas. Fundo de madeira desfocado com pratos e copos. Sem logotipo do Google e sem marca de restaurante.

## Cuidados

- **Não use logotipos** (nem o do Google, nem o da Bovinu's) nas imagens: pode parecer que a empresa endossa o projeto.
- Se alguma imagem mostrar pessoas reconhecíveis, peça ao gerador "figuras genéricas, sem rostos nítidos".
- As imagens são **ilustrativas e geradas por IA**. O site já avisa isso na seção; mantenha o aviso.
- Se o estilo variar muito entre as quatro, gere de novo usando a primeira como referência de estilo ("mesmo estilo da imagem anterior").
