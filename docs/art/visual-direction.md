# Direção de Arte — Experiência "Janela" com Head Tracking

> Documento de referência visual do projeto. Toda imagem, camada, shader, partícula ou elemento de UI criado nos próximos steps deve seguir esta direção.
> Prompts e parâmetros de geração estão em [prompting-guide.md](./prompting-guide.md).

---

## 1. Conceito

**Brasil.** O usuário está de pé sob um **arco natural de selva**, formado por troncos antigos cobertos de musgo, cipós, rochas e samambaias, e olha para fora, para um vale de montanhas flutuantes sobre um lago azul-turquesa. Quando ele move a cabeça, a moldura de selva se desloca muito em relação ao resto, as ilhas do meio se deslocam menos e o céu quase não muda. É essa diferença de deslocamento entre planos que vende a ilusão de profundidade.

A moldura não é só estética, é o **dispositivo narrativo do efeito**: um primeiro plano orgânico e mais escuro torna a paralaxe óbvia e dá ao usuário a sensação de "espiar" pelas bordas para ver mais do mundo.

> **Revisão (step 2):** a primeira versão desta direção previa a boca de uma gruta de pedra. As camadas aprovadas usam um arco de selva com troncos e rochas, que cumpre a mesma função. As referências a "gruta" foram atualizadas para "moldura".

**Codinome do ambiente:** *Floresta 3D*.

**Sensação-alvo:** mágica serena, contemplativa, maravilhamento. Nada ameaçador e nada épico-bélico. É um lugar para respirar.

---

## 2. Pilares visuais

| # | Pilar | O que significa na prática |
|---|-------|----------------------------|
| 1 | **Profundidade legível** | Planos bem separados por valor, saturação e névoa. Sempre dá para dizer o que está perto e o que está longe. |
| 2 | **Natureza exuberante** | Vegetação densa, úmida e detalhada: samambaias, folhas largas, cipós, musgo. |
| 3 | **Luz atmosférica** | Contraluz suave de nascer do sol, névoa luminosa, raios volumétricos discretos. |
| 4 | **Magia contida** | Toques de bioluminescência violeta/cobalto em pontos pequenos. A mágica sussurra. |
| 5 | **Acabamento premium** | Qualidade de *matte painting* de cinema: texturas fotorreais, composição deliberada, sem cara de wallpaper genérico. |

---

## 3. Referência e originalidade

- A referência inicial (reel "Websites are getting real…") mostra uma gruta emoldurando um vale de ilhas flutuantes com cachoeiras, lago turquesa e céu pastel. **Absorvemos a gramática visual dela, não a propriedade intelectual.**
- O mundo é **original**. Não usar nomes, criaturas, personagens, flora icônica ou termos de franquias existentes (ex.: "Avatar", "Pandora", "Na'vi", "Hallelujah Mountains") em prompts, nomes de arquivo ou materiais de comunicação.
- As ilhas flutuantes são inspiradas na geologia real de pináculos de calcário cárstico (Zhangjiajie, Guilin, Ha Long). Esse é o vocabulário a usar.

---

## 4. Composição e enquadramento

**Formato mestre:** widescreen **16:9** (1672 × 941 nas camadas atuais). O **overscan** de paralaxe é obtido escalando cada camada em engine (ver [asset-spec.md §4](./asset-spec.md#4-orçamento-de-paralaxe-e-overscan)). Em viewports mais largas (21:9), a cena é enquadrada em modo *cover*.

> **Revisão (step 2):** a versão anterior pedia 21:9 com margem pintada nas laterais. As camadas aprovadas são 16:9, e a margem vem da escala por camada.

```
┌──────────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ troncos com musgo / cipós ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ 0–15%
│▓▓▓▓▓░░░░░░░░░░░░░ céu pastel + sol difuso ░░░░░░░░░░░░░░░░░░▓▓▓▓▓│
│▓▓▓▓░░  ilhas distantes (névoa)    ☼          ilhas distantes ░▓▓▓▓│
│▓▓▓▓░░░    ▲ ILHA HERÓI ▲          ▲ ilha secundária ▲       ░░▓▓▓▓│ ~35–55%
│▓▓▓░░░░     ║ cachoeiras ║            ║ cachoeira ║          ░░░▓▓▓│
│▓▓▓~~~~~~~~~~~~~~~~ lago turquesa (reflexos) ~~~~~~~~~~~~~~~~~~▓▓▓│ ~55–80%
│▓▓▓▓▓▒▒ margem/rochas ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ margem/rochas ▒▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓ samambaias + plantas bioluminescentes ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ 80–100%
└──────────────────────────────────────────────────────────────────┘
 ▓ moldura de selva (primeiro plano)   ░ ar/névoa   ~ água
```

- **Abertura da moldura:** forma orgânica, ocupando ~65–75% da largura e ~70% da altura, levemente descentralizada. Bordas irregulares com folhagem e cipós pendentes.
- **Ponto focal:** a **ilha herói** (a maior, com cachoeiras longas) fica no terço esquerdo-central. Uma ilha secundária equilibra no terço direito.
- **Sol:** atrás da névoa, à direita do centro. É a fonte de luz e o ponto mais claro da imagem.
- **Horizonte / linha d'água:** levemente abaixo do centro (~55–60% da altura), com o lago ocupando o terço inferior da abertura.
- **Safe area:** os ~70% centrais contêm tudo que é essencial. As bordas externas podem ser cortadas pelo overscan ou reveladas pela paralaxe, então precisam ter conteúdo coerente.
- **Câmera:** altura de pessoa em pé, lente equivalente a ~24–28 mm (amplo sem distorção de olho de peixe), câmera nivelada, sem *dutch angle*.

---

## 5. Planos de profundidade (base para separação de camadas)

A cena é pensada como uma pilha de planos. O fator de paralaxe é relativo (moldura = 1,0). Os planos P0–P5 estão agrupados em **3 camadas de arquivo**, especificadas em [asset-spec.md](./asset-spec.md).

| Plano | Conteúdo | Camada (arquivo) | Fator de paralaxe | Tratamento de cor/valor |
|-------|----------|------------------|-------------------|-------------------------|
| **P0 — Céu** | Gradiente azul → pêssego → rosa → dourado, sol, nuvens | `background` | 0,05 | Valores mais altos da cena |
| **P1 — Fundo distante** | Silhuetas de ilhas e pináculos distantes, mar de nuvens | `background` | 0,05 | Baixíssimo contraste, tingido de lavanda/azul |
| **P2 — Plano médio** | Ilha herói + ilhas secundárias, cachoeiras, névoa nas bases | `midground` | 0,35 | Contraste médio, verdes levemente dessaturados |
| **P3 — Lago** | Superfície turquesa, reflexos do céu e das ilhas | `midground` | 0,35 | Turquesa saturado perto, aqua claro ao longe |
| **P4 — Margem próxima** | Ilhotas e margens do lago · rochas e plantas da base | `midground` · `foreground` | 0,35 · 1,00 | Saturado, sombras definidas |
| **P5 — Moldura** | Troncos com musgo, cipós, monsteras, samambaias, flora bioluminescente | `foreground` | 1,00 | Valores mais escuros, máximo detalhe e contraste |
| **P6 — FX (em engine)** | Névoa animada, pólen, vaga-lumes, esporos, raios de luz, spray das cachoeiras | — (máscaras em `masks/`) | variável | **Não** deve ser "assado" na imagem. Gerado em runtime. |

**Regras de profundidade:**
1. Saturação e contraste **diminuem** com a distância.
2. A matiz **migra para lavanda/azul** com a distância (perspectiva atmosférica).
3. Entre planos deve existir **"ar"**: névoa ou espaço que separa silhuetas, facilitando o recorte.
4. Evitar elementos que atravessem vários planos (ex.: um cipó que vai da moldura até uma ilha distante).

---

## 6. Paleta

### Cores-chave

| Grupo | Nome | Hex | Uso |
|-------|------|-----|-----|
| Céu | Sun Core | `#FDFBC8` | Disco do sol, ponto mais claro da cena |
| Céu | Peach Glow | `#F6C9A8` | Halo do sol, horizonte |
| Céu | Rose Haze | `#E8A9B8` | Névoa quente, nuvens |
| Céu | Lavender Mist | `#C9B6E4` | Névoa média, ilhas distantes |
| Céu | Zenith Blue | `#5FA1E6` | Topo do céu (mais saturado que o previsto na v1) |
| Água | Lagoon Turquoise | `#4FB8CF` | Lago (mediana medida no midground) |
| Água | Aqua Light | `#7FE0DA` | Lago raso, espuma, reflexos |
| Água | Deep Teal | `#0E5E6F` | Lago profundo, sombras na água |
| Vegetação | Emerald | `#1F7A4D` | Folhagem principal |
| Vegetação | Moss | `#5E8C3A` | Musgo, topo das ilhas |
| Vegetação | Fern Light | `#9CCB6B` | Bordas de folhas com rim light |
| Vegetação | Jungle Shadow | `#13302A` | Sombras do primeiro plano |
| Rocha | Wet Stone | `#3B3A36` | Rochas e troncos na sombra da moldura |
| Rocha | Cliff Rose | `#C49A84` | Paredes iluminadas das ilhas |
| Acento | Indigo Glow | `#4D49BB` | Bioluminescência: samambaias azul-violeta (acento dominante) |
| Acento | Violet Glow | `#9440C4` | Bioluminescência |
| Acento | Magenta Glow | `#CD43A1` | Bioluminescência |
| Acento | Hot Pink | `#DB2862` | Bioluminescência: pontas das frondes, bromélias |
| Acento | Ember | `#EC5930` | Bromélias vermelho-alaranjadas (uso mínimo) |
| Acento | Cyan Spark | `#5EF0FF` | Partículas, brilhos pontuais (engine) |

> **Revisão (step 2):** os acentos foram medidos nas camadas aprovadas. A v1 previa só violeta e cobalto. O foreground também tem magenta, rosa-quente e vermelho-alaranjado. Eles continuam restritos aos cantos inferiores da moldura (≈ 2,6% da tela).

### Distribuição aproximada na tela

- **~35%** verdes e sombras do primeiro plano (moldura)
- **~30%** céu e névoa pastel
- **~20%** água turquesa
- **~12%** rochas e ilhas
- **≤ 3–5%** acentos bioluminescentes (são pontuação, não tema)

### Estrutura de valores

- Primeiro plano: **10–30%** de luminância (escuro, emoldurando).
- Plano médio: **40–65%**.
- Fundo e céu: **70–92%**.
- O ponto mais claro é o halo do sol. O mais escuro são os troncos e rochas nos cantos da moldura.

---

## 7. Luz

- **Momento:** nascer do sol / golden hour suave. Luz quente difusa pela névoa.
- **Direção:** fonte principal **atrás das ilhas, à direita do centro** (contraluz). O sol está em **(1210, 465)** no background. Gera *rim light* nas bordas das folhas, brilho nas cachoeiras e silhuetas suaves nas ilhas.
- **Primeiro plano:** mais escuro e mais contrastado que o resto (estamos sob a copa), com toques de luz quente nas folhas e os pontos bioluminescentes.
- **Sombras:** suaves e coerentes com a direção da luz. **Sem sombras duras projetadas atravessando planos** (quebram na separação de camadas).
- **Raios volumétricos:** sutis no asset. A versão forte e animada será feita em engine.
- **Nada de lens flare** com streaks ou artefatos de lente cruzando a imagem.

---

## 8. Atmosfera e elementos

- **Névoa:** camadas horizontais entre as ilhas, mais densa com a distância; névoa espessa na base das cachoeiras.
- **Cachoeiras:** longas e finas, caindo das bordas das ilhas e se dissolvendo em névoa antes de tocar o lago, ou caindo no lago com spray suave.
- **Ilhas flutuantes:** pináculos de calcário com topo coberto de selva densa, base rochosa irregular com raízes e cipós pendurados. Variar escala para reforçar profundidade.
- **Lago:** calmo, quase espelhado, com transição de turquesa saturado (perto) para aqua leitoso (longe).
- **Vegetação de primeiro plano:** troncos antigos com musgo, monsteras e folhas tropicais largas, samambaias, cipós pendentes, rochas com musgo espesso, frondes que brilham em azul-violeta e magenta nos cantos inferiores.
- **Sem presença humana:** sem pessoas, construções, barcos, pontes, texto ou logotipos. Fauna fica para elementos animados em engine (ex.: pássaros distantes), nunca assada no asset-base.

---

## 9. Estilo de render

- **Sim:** *digital matte painting* fotorreal, concept art de longa-metragem, texturas naturais, detalhe fino, HDR natural, foco nítido em todos os planos.
- **Não:** cartoon, anime, low-poly, pintura estilizada com pinceladas visíveis, "fantasy wallpaper" supersaturado, HDR exagerado com halos, aparência de render de jogo antigo, bokeh/DOF forte.

> **Por que foco nítido em tudo?** A profundidade de campo será aplicada por camada em engine, reagindo ao head tracking. Desfoque "assado" na imagem impede esse controle e dificulta o recorte.

---

## 10. Do / Don't

| ✅ Fazer | ❌ Evitar |
|---------|-----------|
| Moldura orgânica escura nas bordas | Abertura da moldura perfeitamente simétrica ou circular |
| Névoa separando planos | Planos colados, sem ar entre eles |
| Bioluminescência pontual nas bordas | Neon dominante ou "cyberpunk na floresta" |
| Ilhas em escalas variadas | Ilhas todas do mesmo tamanho e altura |
| Cachoeiras finas e elegantes | Cachoeiras largas tipo represa |
| Céu pastel quente com transição para azul | Céu azul chapado ou pôr do sol laranja saturado |
| Detalhe máximo no primeiro plano | Texturas borradas ou "plásticas" |
| Conteúdo coerente até as bordas (overscan) | Elementos importantes cortados na borda |

---

## 11. Requisitos técnicos dos assets visuais

- **Formato:** PNG sRGB, 8 bits por canal. Midground e foreground com canal alfa *straight* (detalhes em [asset-spec.md](./asset-spec.md)).
- **Proporção:** 16:9. As camadas atuais têm **1672 × 941**. A resolução-alvo final é **≥ 3840 px de largura** (upscale pendente).
- **Overscan:** obtido por escala de cada camada em engine, conforme o orçamento de paralaxe ([asset-spec.md §4](./asset-spec.md#4-orçamento-de-paralaxe-e-overscan)).
- **Nitidez:** sem DOF, sem motion blur, sem grão forte (grão é adicionado em pós no engine).
- **Silhuetas recortáveis:** bordas de folhagem e rocha contra a névoa devem ser claras. Evitar cabelos de cipó semitransparentes sobre o céu em excesso.
- **Áreas ocultas:** o que fica atrás da moldura será revelado pela paralaxe e precisará de *inpainting*. Manter o fundo simples e contínuo atrás das bordas da moldura ajuda.
- **Sem texto, marcas d'água ou assinaturas.**

---

## 12. Estrutura de arquivos e nomenclatura

```
docs/art/
  visual-direction.md        ← este documento
  prompting-guide.md         ← prompt mestre, parâmetros e templates
  asset-spec.md              ← papel, formato e uso de cada camada
public/assets/environment/
  background/background.png
  midground/midground.png
  foreground/foreground.png
  masks/                     ← máscaras auxiliares (água, névoa, emissivo)
  depth/                     ← mapas de profundidade
  concept/
    scene-reference-01.png   ← referência mestre (composto das 3 camadas)
```

Convenções:
- Nomes em inglês, `kebab-case`, numeração com dois dígitos (`-01`, `-02`).
- Novas variações de conceito: `scene-reference-02.png`, etc. Registrar origem e prompt no log do [prompting-guide.md](./prompting-guide.md#9-log-de-gerações).
- Camadas: uma pasta por camada (`background/`, `midground/`, `foreground/`). Máscaras: `<camada>-<conteúdo>-mask.png`. Profundidade: `<camada>-depth.png`.

---

## 13. Asset de referência mestre

| Campo | Valor |
|-------|-------|
| Arquivo | `public/assets/environment/concept/scene-reference-01.png` |
| Papel | Referência mestre de composição, luz, paleta e planos. Corresponde à posição neutra da cabeça. |
| Origem | Composto das 3 camadas tratadas (background + midground + foreground), 1672 × 941 |
| Fontes | Camadas fornecidas pelo usuário em `assets/`, geradas externamente. Ver [log de gerações](./prompting-guide.md#9-log-de-gerações). |

---

## 14. Histórico de revisões

| Data | Step | Mudança |
|------|------|---------|
| 2026-10-10 | 1 | Versão inicial: conceito, pilares, planos, paleta, luz, requisitos |
| 2026-10-11 | 2 | Alinhada às camadas aprovadas: moldura de selva (em vez de gruta), formato 16:9, acentos magenta/vermelho medidos, mapeamento planos → camadas, nova estrutura de pastas |
