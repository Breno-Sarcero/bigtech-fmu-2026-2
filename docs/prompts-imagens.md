# Imagens que faltam — prompts para gerar no Gemini

Os passos **01 (mesas)** e **03 (buffet)** da seção "Solução" já usam quadros reais das câmeras da Bovinu's com marcações por cima (scripts em `ml/anotar_passo1.py` e `ml/anotar_passo3.py`). Faltam quatro imagens, todas **hiper-realistas**, para gerar no Gemini. Enquanto o arquivo não existir, o site usa o desenho de fallback; ao colocar o arquivo na pasta `site/img/`, ele aparece sozinho (sem mexer no código).

## Arquivos

| Onde aparece | Arquivo | Proporção |
|---|---|---|
| Passo 02 da sequência (mix do prato, com camadas de cor) | `site/img/passo-2-prato.webp` | 4:3 |
| Passo 04 da sequência (QR e NFC na mesa) | `site/img/passo-4-avaliacao.webp` | 4:3 |
| Demo "O que o peso não conta" (prato de exemplo, **sem** marcações) | `site/img/prato-exemplo.webp` | 1:1 |
| Demo "Cuba quase no fim?" (4 cubas lado a lado, **sem** marcações) | `site/img/cubas-exemplo.webp` | 16:9 |

- Formato **WebP**, uns 250 KB cada. Para converter: `ffmpeg -i entrada.png -quality 82 saida.webp`.
- Mesmo estilo nas quatro, para parecerem uma série. Se variar muito, gere de novo pedindo "mesmo estilo da imagem anterior".

## Tag de estilo (cole no começo de cada prompt)

> Fotografia hiper-realista, resolução 8K, iluminação natural quente de restaurante ao meio-dia, profundidade de campo suave, cores naturais, sem texto legível, sem logotipos, sem marcas, sem rostos em destaque.

## Prompts

**Passo 02 · Mix do prato** (`passo-2-prato.webp`, 4:3)
> [tag de estilo] Prato branco de buffet por quilo visto de cima, com carne grelhada em fatias, arroz branco, feijão, salada verde e um pedaço de sobremesa, bem separados no prato. Sobre a comida, camadas translúcidas de cor separando as categorias como em uma análise de imagem: marrom-avermelhado para a carne, amarelo para o arroz e carboidratos, verde para a salada e rosa para a sobremesa. Uma balança digital aparece na borda inferior, com o prato sobre ela. Proporção 4:3.

**Demo do prato** (`prato-exemplo.webp`, 1:1, **sem** camadas de cor por cima)
> [tag de estilo] Foto de cima de um prato branco redondo de buffet por quilo, ocupando quase toda a imagem, em fundo escuro de madeira. No prato, em porções bem separadas: carne grelhada (picanha em fatias) do lado esquerdo, arroz branco e farofa amarela no lado direito, salada verde e tomate na parte de baixo, e um pedaço pequeno de sobremesa rosa no canto. Sem talheres. Proporção 1:1.

**Passo 04 · Avaliação sem atrito** (`passo-4-avaliacao.webp`, 4:3)
> [tag de estilo] Close de uma mesa de restaurante vista de cima, ao lado dos guardanapos: um pequeno adesivo quadrado com QR code genérico colado na mesa e, ao lado, um cartão de aproximação NFC com cinco estrelas e uma seta indicando um celular. Um celular se aproximando do cartão, com a tela mostrando cinco estrelas. Fundo de madeira desfocado com pratos e copos. Sem logotipo do Google nem da Bovinu's. Proporção 4:3.

**Demo das cubas** (`cubas-exemplo.webp`, 16:9, **sem** marcações)
> [tag de estilo] Quatro cubas retangulares de inox (Gastronorm 1/1) de buffet, vistas diretamente de cima, lado a lado em quatro colunas de mesma largura que ocupam toda a imagem, sem banho-maria visível. Da esquerda para a direita: picanha quase acabada (só uma faixa de carne no fundo da cuba, o resto é inox à mostra); arroz com cenoura pela metade; farofa quase cheia; feijão bem cheio. A comida ocupa a cuba de cima para baixo, com o inox visível onde acabou. Proporção 16:9.

## Cuidados

- **Não use logotipos** (nem o do Google, nem o da Bovinu's): pode parecer que a empresa endossa o projeto.
- Se aparecerem pessoas reconhecíveis, peça "figuras genéricas, sem rostos nítidos".
- As imagens são **geradas por IA**: o site avisa isso nas legendas das imagens; mantenha o aviso.
