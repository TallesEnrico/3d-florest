# Especificação de Assets — Camadas 2.5D do Ambiente

> Define o papel, o formato e as regras de uso de cada camada da cena parallax.
> Direção visual: [visual-direction.md](./visual-direction.md) · Prompts: [prompting-guide.md](./prompting-guide.md)
>
> **Arte atual (2026-10-12):** as três camadas foram trocadas pela arte enviada pelo cliente, com a mesma estrutura e o mesmo tamanho (1672×941):
> - `foreground`: moldura de selva com o centro transparente;
> - `midground`: vale de floresta tropical com cachoeiras, rio e montanhas na névoa, recortado, com o céu transparente;
> - `background`: céu e vale ao pôr do sol, opaco.
>
> Muda em relação a este documento:
> - não há bioluminescência na moldura, e a máscara emissiva não é mais usada;
> - os ajustes medidos na arte nova (sol, faixas de névoa, margens do vale) estão em `src/features/scene/config/sceneConfig.ts`.
>
> **Limpeza (2026-10-12):** só os WebP de entrega ficam no projeto (`<camada>/<camada>.webp`). Saíram, por não serem usados: os PNG master das camadas, as máscaras (`masks/`), o mapa de profundidade (`depth/`), a referência (`concept/`), um backup `_midground.webp` e a arte anterior em `assets/` na raiz. Tudo pode ser recuperado do commit `e8aee56` (`git checkout e8aee56 -- <caminho>`). As seções abaixo descrevem o pipeline original.

---

## 1. Visão geral

A cena é uma pilha de **3 camadas** com a mesma resolução e o mesmo enquadramento. Na posição neutra (cabeça centralizada), sobrepostas na ordem abaixo, elas reproduzem exatamente a [imagem de referência](../../public/assets/environment/concept/scene-reference-01.png).

```
  olho do usuário
        │
        ▼
 ┌───────────────┐  foreground.png   fator 1.00  ← moldura de selva (maior paralaxe)
 │ ▓▓▓       ▓▓▓ │
 │ ▓▓  ┌───┐  ▓▓ │  midground.png    fator 0.35  ← ilhas, cachoeiras, lago
 │ ▓▓  │   │  ▓▓ │
 │ ▓▓▓ └───┘ ▓▓▓ │  background.png   fator 0.05  ← céu, sol, ilhas distantes (quase sem paralaxe)
 └───────────────┘
```

| Ordem (de trás p/ frente) | Arquivo | Planos da direção de arte |
|---|---|---|
| 1 | `background/background.png` | P0 céu + P1 fundo distante |
| 2 | `midground/midground.png` | P2 plano médio + P3 lago (+ parte de P4) |
| 3 | `foreground/foreground.png` | P5 moldura (+ rochas e plantas de P4) |

---

## 2. Origem e tratamento

As três camadas-fonte foram **fornecidas pelo usuário** em `assets/` (raiz do projeto). Elas foram geradas externamente, e a ferramenta e o prompt usados ainda não foram registrados (ver [log](./prompting-guide.md#9-log-de-gerações)). Os arquivos originais **não foram alterados**. Os assets em `public/` são versões tratadas.

| Fonte (`assets/`) | Destino (`public/assets/environment/`) |
|---|---|
| `background.png` | `background/background.png` |
| `floresta-flutuante.png` | `midground/midground.png` |
| `floresta-frontal.png` | `foreground/foreground.png` |

### Problemas encontrados nas fontes e correções aplicadas

| # | Problema | Camada | Correção |
|---|---|---|---|
| 1 | Áreas "sólidas" com alfa ≈ 98% (250–252), não 100%: o fundo vazaria por toda a camada | mid, fg | Remapeamento do alfa: ≥ 96% vira 100%, ≤ 6% vira 0%, rampa de antialias preservada |
| 2 | Lixo de recorte quase invisível (alfa ~2%) com RGB vermelho no topo da moldura | fg | Corte de alfa ≤ 6% + remoção de partículas isoladas < 24 px |
| 3 | RGB preto (0,0,0) sob pixels transparentes, o que gera halo escuro com filtragem bilinear e mipmaps no WebGL | mid, fg | *Edge padding*: RGB das áreas transparentes preenchido com a cor do pixel sólido mais próximo |
| 4 | Névoa e nuvens recortadas com borda dura ("papel recortado") e furos em forma de bolha no céu central | mid | Alfa da névoa esmaecido numa faixa de 56 px a partir do recorte, só em pixels claros, dessaturados e sem textura acima da linha do lago. Rochas, árvores, cachoeiras e água mantêm borda nítida. Ilhas flutuantes isoladas ficam 100% sólidas. |
| 5 | Borda inferior do lago irregular, que poderia aparecer com o movimento da cabeça | mid | Lago estendido para baixo com **reflexo espelhado** da água acima, só onde o foreground não garante cobertura (orçamento de 120 px) |

O background não precisou de correção. Ele é opaco por definição.

---

## 3. Especificação por camada

Todas as camadas: **1672 × 941 px (16:9)**, sRGB, alfa *straight* (não pré-multiplicado).

- **Master:** `<camada>.png` (PNG 8 bits). É o arquivo editável e a referência de qualidade.
- **Entrega (step 7):** `<camada>.webp` gerado do master com `cwebp -q 90 -alpha_q 100 -exact -sharp_yuv -m 6 <camada>.png -o <camada>.webp`. `-exact` preserva o RGB sob as áreas transparentes (*edge padding*) e `-alpha_q 100` deixa o alfa idêntico. Total: 6,9 MB → 1,2 MB, PSNR 36–41 dB. **Ao alterar um master, regenere o WebP.**

### 3.1 `background/background.png`

| Campo | Valor |
|---|---|
| Conteúdo | Céu pastel (azul no topo → pêssego/rosa → dourado no horizonte), **sol em (1210, 465)**, nuvens, montanhas e ilhas flutuantes distantes, mar de nuvens |
| Alfa | Nenhum (RGB opaco). É a camada que garante que nunca haja buraco. |
| Fator de paralaxe | **0,05** (quase infinito) |
| Overscan (escala) | **≥ 1,01** com background ancorado · **≥ 1,12** com foreground ancorado (§4) |
| Papel | Dar profundidade infinita e a fonte de luz. É o que aparece entre as ilhas e através das névoas do midground. |
| Observações | Foi pintado com ponto de vista aéreo: tem lago e ilhas na metade de baixo. Essa área fica quase toda coberta pelo midground e pelo foreground. Não usar essa metade como conteúdo visível. |

### 3.2 `midground/midground.png`

| Campo | Valor |
|---|---|
| Conteúdo | Ilha herói com cachoeiras (esquerda), ilha flutuante central com cipós, ilhas secundárias à direita, **lago turquesa** (linha d'água em y ≈ 760), névoa nas bases das cachoeiras, céu pintado entre as ilhas centrais |
| Alfa | 53% opaco · 38% transparente · 9% parcial (névoas suaves e bordas) |
| Fator de paralaxe | **0,35** |
| Overscan (escala) | **1,00 na implementação** (step 5): a moldura cobre as bordas, medido até 120 × 67 px de deslocamento. Cálculo conservador sem considerar a moldura: ≥ 1,05 (bg ancorado) · ≥ 1,09 (fg ancorado) (§4) |
| Papel | É a "cena" principal, o que o usuário está olhando pela janela. Carrega o ponto focal (ilha herói) e a água. |
| Observações | As névoas semitransparentes dependem do background atrás para ficarem corretas. Ver [limitações](#5-transparência-limitações-e-contornos). |

### 3.3 `foreground/foreground.png`

| Campo | Valor |
|---|---|
| Conteúdo | Moldura orgânica: troncos com musgo no topo e nas laterais, monsteras, samambaias, cipós pendentes, rochas com musgo na base, **samambaias e bromélias bioluminescentes** (violeta, magenta, vermelho) nos cantos inferiores |
| Alfa | 46% opaco · 48% transparente (abertura central) · 6% parcial (folhas finas, cipós) |
| Fator de paralaxe | **1,00** (referência) |
| Overscan (escala) | **≥ 1,13** com background ancorado · **1,00** com foreground ancorado (§4) |
| Papel | Vender a ilusão de janela. É o que mais se move, revela e esconde o mundo atrás e tem o maior contraste e saturação da cena. |
| Observações | Os cipós finos do topo são semitransparentes nas pontas. Evitar escalar essa camada abaixo de 100%, porque a borda da imagem apareceria. |

---

## 4. Orçamento de paralaxe e overscan

Os fatores descrevem o deslocamento **relativo** entre camadas. Os assets foram validados para um deslocamento relativo máximo de **D = 60 px** entre foreground e background (na resolução da fonte; ≈ 3,6% da largura e 6,4% da altura), em qualquer direção.

**Qual camada fica parada na tela (plano de paralaxe zero) é decisão da implementação**, e isso muda quem precisa de mais overscan:

- **Background ancorado** (paralaxe clássica): cabeça para a direita → foreground vai para a esquerda.
- **Foreground ancorado** ("janela" física: a moldura fica no plano da tela): cabeça para a direita → midground e background vão para a direita, o fundo mais.

**Escala mínima de cada camada** (para a borda da imagem nunca aparecer), com Δ = deslocamento da camada em relação à tela:

```
escala ≥ 1 + 2 · Δ / altura      (usar a menor dimensão, aqui 941 px)
```

| Camada | Fator | Bg ancorado: Δ → escala | Fg ancorado: Δ → escala |
|---|---|---|---|
| background | 0,05 | 3 px → **1,01** | 57 px → **1,12** |
| midground | 0,35 | 21 px → **1,05** | 39 px → **1,09** (implementado: 1,00 + margem medida, ver abaixo) |
| foreground | 1,00 | 60 px → **1,13** | 0 px → **1,00** |

- A extensão do lago no midground cobre deslocamentos relativos de **até 120 px** entre foreground e midground. Com D = 60 px esse deslocamento relativo é de 39 px, o que dá folga de 3×.
- **Refinamento (step 5):** a análise acima ignora que a moldura do foreground cobre as bordas da tela. Medindo a cobertura real, a abertura só toca a borda superior, e o midground (céu vazio no topo) **não precisa de overscan**: continua sem borda visível até 120 × 67 px de deslocamento. A implementação usa midground com overscan 1,00 (pixel-alinhado à moldura) e background com 1,12. Ver [scene-logic.md](../engineering/scene-logic.md#posicionamento-das-camadas).
- Acima de D = 60 px, aumentar as escalas e revalidar visualmente os quatro extremos (esquerda, direita, cima, baixo).
- **Se a implementação usar planos 3D reais em profundidades diferentes com projeção off-axis** (head-coupled perspective), os fatores ficam implícitos na distância Z de cada plano. Nesse caso, dimensionar cada plano para cobrir o frustum no seu Z com margem equivalente às escalas acima, preservando a proporção 16:9 e o alinhamento da posição neutra.
- **Viewport mais larga que 16:9** (ex.: 21:9): enquadrar em modo *cover*, que corta ~12% em cima e ~12% embaixo. O topo da ilha herói e a base do foreground ficam levemente cortados, e o ponto focal e o lago permanecem.

---

## 5. Transparência: limitações e contornos

| Limitação | Impacto | Contorno atual | Solução definitiva (futuro) |
|---|---|---|---|
| O midground tem **céu pintado opaco** entre as ilhas centrais (veio assim da fonte) | Esse trecho de céu se move a 0,35 em vez de 0,05 | Bordas desse céu esmaecidas e cores quase idênticas às do background, o que torna o efeito imperceptível nos testes | Regerar o midground sobre fundo chroma ou fazer *inpainting* para remover o céu |
| Névoas semitransparentes | Mudam de aparência se o fundo atrás mudar | O background tem tons compatíveis em toda a área | Animar a névoa em engine (máscara `midground-mist-mask.png`) |
| O conteúdo atrás da moldura **não é infinito** | Deslocamentos muito grandes revelariam bordas do midground | Lago estendido (120 px). Os cantos estão sempre sob a moldura. | Outpainting do midground se o orçamento de paralaxe aumentar |
| Recorte do foreground feito por ferramenta automática | Folhas e cipós finos com antialias de 1–2 px, sem *motion blur* | Alfa limpo e *edge padding* | Recorte manual ou matting com IA em resolução maior |
| Resolução de 1672 × 941 | Fica suave em telas 4K/Retina, principalmente o foreground escalado a 1,13 | — | Upscale de 2–3× (Real-ESRGAN, Topaz, Magnific) **antes** de converter para o formato de entrega |
| PNG pesado (~6,9 MB nas 3 camadas) | Tempo de carregamento | **Resolvido no step 7:** entrega em WebP (1,2 MB) | KTX2/Basis quando houver upscale |

**Regras de alfa para a implementação:**
- O alfa é **straight**. O RGB sob as áreas transparentes já está preenchido (padding), então tanto o modo straight quanto o pré-multiplicado funcionam sem halo.
- Ordem de desenho fixa: background → midground → foreground. Nada de ordenação por profundidade entre essas camadas.
- Não usar *alpha test* (corte binário) no midground, porque destrói as névoas suaves. No foreground, só se for necessário por performance, com limiar baixo (~0,1).

---

## 6. Máscaras auxiliares (`masks/`)

Escala de cinza 8 bits, 1672 × 941, **mesmo espaço de pixels da camada indicada** (branco = área ativa).

| Arquivo | Camada | O que marca | Precisão | Uso previsto |
|---|---|---|---|---|
| `midground-water-mask.png` | midground | Superfície do lago, incluindo o reflexo do sol | Boa (automática; vaza levemente na base de 2 ilhotas à direita) | Shader de água: ondulação sutil, brilho especular reagindo à posição da cabeça |
| `midground-mist-mask.png` | midground | Névoas, nuvens baixas e trechos de céu do midground | Aproximada (suave) | Névoa animada (deriva lenta), variação de densidade |
| `foreground-emissive-mask.png` | foreground | Samambaias e bromélias bioluminescentes (azul-violeta → magenta → vermelho) | Boa | Pulso de brilho (*bloom* seletivo), resposta à aproximação do rosto |

Máscaras que ainda **não existem** e podem ser criadas depois: cachoeiras (para animar o fluxo), sol (*god rays*) e cipós (balanço com vento).

---

## 7. Profundidade (`depth/`)

| Arquivo | Conteúdo |
|---|---|
| `layer-depth.png` | Mapa de profundidade **por camada** da cena composta: background = 8%, midground = 45%, foreground = 100% (branco = perto), misturado pelo alfa |

- **Convenção:** branco = perto, preto = longe. Escala de cinza 8 bits, mesma resolução do composto.
- É um mapa **plano por camada**, útil como alternativa de técnica (uma única textura + displacement) e para efeitos que dependem de distância (névoa, DOF).
- **Expansão futura:** gerar profundidade **por pixel dentro de cada camada** (ex.: Depth Anything V2) para deslocar levemente o relevo interno das ilhas e da moldura. Nomenclatura: `depth/<camada>-depth.png` (ex.: `midground-depth.png`).

---

## 8. Como cada camada será usada depois

> Orientação para os próximos steps. Nada disso está implementado.

- **Background:** plano mais distante, quase imóvel. É a referência de cor da luz: o sol e o céu definem o tom de névoa, bloom e *color grading* da cena. Pode receber um leve deslocamento de nuvens no futuro.
- **Midground:** plano principal. Recebe paralaxe moderada e, no futuro, os efeitos vivos da cena: água (máscara de água), névoa à deriva (máscara de névoa) e, quando houver, fluxo das cachoeiras.
- **Foreground:** plano mais próximo, com o maior deslocamento. Faz a "janela" funcionar. Bons candidatos para efeitos: balanço leve dos cipós, brilho pulsante das plantas bioluminescentes (máscara emissiva) e desfoque de profundidade de campo quando o usuário foca o fundo.
- **Mapeamento da cabeça:** o deslocamento relativo entre camadas segue os fatores (§4), nos dois eixos. A escolha do plano de paralaxe zero define o sentido aparente do movimento e as escalas de overscan. A posição neutra deve reproduzir `scene-reference-01.png`.
- **Cor:** texturas em sRGB. Manter o *tone mapping* neutro para não deslocar a paleta da direção de arte.

---

## 9. Estrutura de arquivos

```
assets/                                   ← fontes originais do usuário (não servidas)
  background.png
  floresta-flutuante.png
  floresta-frontal.png
public/assets/environment/
  background/background.png (.webp)      ← camada 1 (opaca); PNG = master, WebP = entrega
  midground/midground.png (.webp)        ← camada 2 (alfa)
  foreground/foreground.png (.webp)      ← camada 3 (alfa)
  masks/
    midground-water-mask.png
    midground-mist-mask.png
    foreground-emissive-mask.png
  depth/
    layer-depth.png
  concept/
    scene-reference-01.png                ← composto na posição neutra (referência mestre)
```

---

## 10. Checklist para substituir ou adicionar uma camada

- [ ] Mesma resolução e enquadramento das demais (sobreposição na posição neutra sem desalinhamento)
- [ ] Alfa: núcleo = 255, sem lixo < 6%, RGB preenchido sob áreas transparentes
- [ ] Sem bordas duras em névoa ou nuvem; rochas e folhas com antialias de 1–2 px
- [ ] Luz vinda do sol em (1210, 465): contraluz quente da direita
- [ ] Testada nos 4 extremos do orçamento de paralaxe (§4), sem buracos ou bordas visíveis
- [ ] Máscaras e `layer-depth.png` regenerados se o alfa mudou
- [ ] `scene-reference-01.png` atualizado e o [log de gerações](./prompting-guide.md#9-log-de-gerações) registrado
