# Guia de Prompts — Geração de Imagens

> Como gerar imagens que respeitam a [direção de arte](./visual-direction.md) e encaixam nas camadas definidas em [asset-spec.md](./asset-spec.md).
> Prompts são escritos **em inglês** (os modelos respondem melhor). A documentação fica em português.

---

## 1. Como usar este guia

1. Comece sempre pelo **prompt mestre v2** (seção 3). Ele descreve a cena aprovada.
2. Para variações, altere **um bloco por vez** (seção 2) e registre no **log** (seção 9).
3. Para gerar ou substituir uma camada isolada, use os **templates por camada** (seção 6), que herdam luz e paleta do mestre.
4. Valide toda imagem com o **checklist** (seção 8) antes de salvar no projeto.

---

## 2. Anatomia do prompt

O prompt mestre é montado em blocos, sempre nesta ordem. Manter a ordem facilita comparar versões.

| # | Bloco | Função | Trecho no prompt mestre v2 |
|---|-------|--------|----------------------------|
| 1 | **Formato + cena** | O que é a imagem | *Widescreen 16:9 cinematic matte painting of a pristine fantasy valley…* |
| 2 | **Moldura (foreground)** | Arco de selva que emoldura a "janela" | *…seen through a natural archway of ancient jungle trees…* |
| 3 | **Acentos mágicos** | Bioluminescência nos cantos | *…glow with iridescent indigo, violet, magenta and hot-pink…* |
| 4 | **Plano médio (midground)** | Ilhas, cachoeiras, lago | *…a towering floating limestone mountain… a calm turquoise lake…* |
| 5 | **Fundo + céu (background)** | Céu, sol, ilhas distantes | *…a vast sky glows at sunrise… golden sun just right of center…* |
| 6 | **Profundidade** | Perspectiva atmosférica explícita | *Strong atmospheric perspective…* |
| 7 | **Luz** | Direção, hora, qualidade | *Soft backlit golden-hour lighting…* |
| 8 | **Estilo + técnica** | Acabamento, câmera, foco | *Hyper-detailed photorealistic digital matte painting… sharp focus throughout…* |

**Regras de escrita:**
- Descrever **posições** explicitamente (*on the left*, *at the center*, *just right of center*, *lower left corner*). Os modelos atuais respeitam bem layout descrito em linguagem natural.
- Preferir **frases descritivas** a listas de palavras-chave soltas.
- Exclusões em modelos sem negative prompt: escrever **na positiva** (*pristine valley untouched by humans* em vez de *no people*). Citar "no X" pode induzir X.
- Nunca citar franquias, filmes ou artistas vivos (ver [direção de arte §3](./visual-direction.md#3-referência-e-originalidade)).

---

## 3. Prompt mestre

### v2 (atual): alinhado às camadas aprovadas

Descreve a cena de `scene-reference-01.png`. Use-o para gerar variações, upscales guiados ou camadas substitutas coerentes.

```text
Widescreen 16:9 cinematic matte painting of a pristine fantasy valley untouched by humans, seen through a natural archway of ancient jungle trees. In the foreground, massive moss-covered trunks and twisted roots frame the top, left and right edges, with hanging vines and heart-shaped leaves dangling from above, large monstera leaves and lush ferns on the sides, and mossy boulders along the bottom edge; in the lower left and lower right corners, ferns and bromeliads glow with iridescent indigo, violet, magenta and hot-pink bioluminescent light. Beyond the archway, a calm turquoise lake stretches toward the horizon. On the left, a towering floating limestone mountain covered in dense emerald jungle pours several long, slender waterfalls into white mist; at the center, a large floating rock island hangs in the air trailing long vines and roots; smaller floating islands and karst cliffs with thin waterfalls fill the right side, with low clouds drifting between them. Behind everything, a vast sky glows at sunrise: saturated blue at the top fading into pink and peach clouds, and a bright golden sun just right of center, low near the horizon, with distant floating islands and hazy mountain ranges fading into the light. Strong atmospheric perspective: colors become paler and softer with distance, with clear separation between foreground, midground and background. Soft backlit golden-hour lighting with warm rim light on leaves and rocks. Hyper-detailed photorealistic digital matte painting, premium feature-film concept art, serene and magical mood, sharp focus throughout, level eye-level camera.
```

> **Status:** escrito a partir das camadas aprovadas, **ainda não testado** num gerador. Registrar no log o primeiro uso.

### v1 (histórico): prompt do step 1

Moldura em gruta de pedra, formato 21:9. Substituído pela v2 porque as camadas aprovadas usam arco de selva e 16:9.

```text
Ultra-wide cinematic panoramic matte painting of a pristine fantasy valley untouched by humans, viewed from inside the mouth of a dark mossy cave that frames the whole scene like a natural window. The cave's rough stone arch wraps the top, left and right edges of the image, covered in thick green moss, with hanging vines, lush tropical ferns and broad jungle leaves spilling in from the corners; in the lower left and lower right corners a few fern fronds glow softly with violet and cobalt bioluminescent light. Beyond the cave opening lies a calm turquoise lagoon with mirror-like reflections, bordered by mossy rocks and small bushes on the near shore. In the midground, colossal floating limestone mountains hover above the water: tall karst pinnacles with jagged rocky undersides and dense emerald jungle on top, roots and vines dangling beneath them. The largest floating mountain sits left of center with several long, slender waterfalls pouring from its edges and dissolving into white mist; a second floating mountain balances the right third with its own thin waterfall. In the far background, many smaller floating islands and stone pinnacles fade into soft layers of lavender haze and low clouds. The sun rises behind the mist just right of center, filling the sky with peach, rose and lavender pastel light that blends into pale blue at the top, with subtle volumetric light rays. Strong atmospheric perspective: colors become paler, softer and more lavender-blue with distance, with clear separation between foreground, midground and background. Soft backlit golden-hour lighting with gentle rim light on the leaves. Color palette of emerald and moss greens, turquoise and aqua water, peach, rose and lavender sky, tiny violet accents. Hyper-detailed photorealistic digital matte painting, premium feature-film concept art, serene and magical mood, sharp focus throughout, natural high dynamic range, wide-angle 24mm lens, level eye-level camera.
```

### Negative prompt (para modelos que suportam)

Para SDXL, Flux dev e similares. Em modelos destilados (Z-Image Turbo, FLUX schnell/klein) e geradores de chat, as exclusões já estão embutidas na positiva.

```text
people, person, human figure, animals, birds, buildings, ruins, boats, bridges, text, letters, watermark, signature, logo, frame border, cartoon, anime, illustration brush strokes, low poly, oversaturated, neon, harsh shadows, lens flare streaks, depth of field, bokeh, blurry, motion blur, fisheye distortion, dutch angle, duplicated islands, symmetrical composition, jpeg artifacts
```

---

## 4. Parâmetros de geração

| Versão | Ferramenta | Parâmetros | Resultado |
|--------|-----------|------------|-----------|
| v1 | Z-Image Turbo fp8 via Ollama (local, macOS) | 1792 × 768, seed 42, steps padrão | **Não executado.** O Ollama 0.34.0 recusa modelos de imagem ("image generation models are not currently supported"). |
| Camadas aprovadas | **Externa, gerada pelo usuário** | **A registrar:** ferramenta, prompt, seed, resolução | 3 camadas 1672 × 941 já separadas (`assets/`) |

> **Pendência:** registrar aqui a ferramenta e o prompt usados nas camadas aprovadas. Sem isso, não dá para reproduzir variações com o mesmo "DNA".

---

## 5. Vocabulário controlado

Use estes termos para manter consistência entre gerações.

| Conceito | ✅ Usar | ❌ Evitar |
|----------|--------|----------|
| Ilhas | *floating limestone mountains*, *karst cliffs*, *floating rock island* | nomes de franquias, *sky castles*, *asteroids* |
| Moldura | *natural archway of ancient jungle trees*, *moss-covered trunks and twisted roots*, *mossy boulders* | *portal*, *ring*, *frame* (gera molduras literais) |
| Vegetação | *monstera leaves*, *lush ferns*, *hanging vines*, *heart-shaped leaves*, *thick moss* | *alien plants*, *giant mushrooms* |
| Magia | *ferns and bromeliads glow with iridescent indigo, violet, magenta and hot-pink bioluminescent light* | *neon*, *magic sparkles*, *glowing runes* |
| Água | *calm turquoise lake*, *mirror-like reflections* | *ocean*, *waves*, *river rapids* |
| Céu | *saturated blue at the top fading into pink and peach clouds*, *golden sun just right of center* | *orange sunset*, *dramatic storm* |
| Névoa | *white mist*, *low clouds drifting*, *hazy mountain ranges* | *fog wall*, *smoke* |
| Luz | *soft backlit golden-hour*, *warm rim light* | *lens flare*, *harsh sunlight*, *HDR* |
| Estilo | *photorealistic digital matte painting*, *feature-film concept art* | *wallpaper*, *4k 8k trending*, *octane render* |
| Técnica | *sharp focus throughout*, *level eye-level camera* | *bokeh*, *tilt-shift*, *fisheye* |

---

## 6. Templates por camada

Todos os templates terminam com o **sufixo de consistência**:

```text
Soft backlit golden-hour lighting from a golden sun just right of center, low near the horizon. Warm rim light, strong atmospheric perspective. Hyper-detailed photorealistic digital matte painting, premium feature-film concept art, serene and magical mood, sharp focus throughout, level eye-level camera, widescreen 16:9.
```

| Camada | Template (início do prompt) | Fundo para recorte |
|--------|-----------------------------|--------------------|
| **background** | *Sky plate at sunrise over a sea of clouds: saturated blue sky at the top fading into pink and peach clouds, a bright golden sun just right of center low near the horizon, distant hazy mountain ranges and small floating limestone islands silhouetted in soft haze. Nothing in the foreground.* | Nenhum (opaco) |
| **midground** | *A towering floating limestone mountain on the left covered in dense emerald jungle with long slender waterfalls falling into white mist, a large floating rock island at the center trailing long vines and roots, smaller floating islands and karst cliffs with thin waterfalls on the right, low clouds between them, above a calm turquoise lake that fills the lower part of the image.* | Transparente nativo ou **magenta chapado `#FF00FF`** |
| **foreground** | *A natural archway of ancient jungle trees seen from below: massive moss-covered trunks and twisted roots framing the top, left and right edges, hanging vines and heart-shaped leaves dangling from above, large monstera leaves and lush ferns on the sides, mossy boulders along the bottom edge, ferns and bromeliads glowing with iridescent indigo, violet, magenta and hot-pink bioluminescent light in the lower corners. The opening in the center is completely empty.* | Transparente nativo ou **ciano chapado `#00FFFF`** |

**Transparência: o que funciona na prática**
1. **Melhor:** gerar a **cena completa** com o prompt mestre e separar as camadas por segmentação e *matting* (BiRefNet, rembg, Photoshop "Remover fundo"), fazendo *inpainting* das áreas ocultas. As camadas aprovadas parecem ter sido feitas assim, porque se encaixam perfeitamente.
2. **Bom:** geradores com **fundo transparente nativo** (ex.: GPT Image com `background: transparent`). Funciona bem para o foreground. Para névoas semitransparentes do midground, o resultado é irregular.
3. **Contorno:** fundo **chapado numa cor ausente da camada**, seguido de *chroma key*. Foreground → ciano (a camada é verde, violeta, magenta e marrom). Midground → magenta (a camada é verde, turquesa, branco e rosa dessaturado). **Nunca** usar verde chroma no foreground, que é majoritariamente verde.
4. Depois de qualquer recorte, aplicar o tratamento de alfa do [asset-spec.md §2](./asset-spec.md#2-origem-e-tratamento): núcleo 100%, limpeza < 6%, *edge padding*.

---

## 7. Adaptação por ferramenta

| Ferramenta | Como adaptar |
|------------|--------------|
| **GPT Image** | Prompt mestre como está, formato horizontal. Para camadas, `background: transparent` em PNG. |
| **Gemini / Imagen** | Prompt mestre como está, pedindo "16:9". Sem transparência nativa: usar fundo chapado (§6). |
| **Midjourney** | Prompt mestre + `--ar 16:9 --style raw --s 150`. |
| **FLUX.2 / FLUX.1** | Prompt mestre como está. Em Flux dev, guidance ~3,5. Dimensões 16:9 múltiplas de 16 (ex.: 1824 × 1024). |
| **SDXL** | Encurtar para ~75 tokens por chunk ou usar prompt weighting. Usar o negative prompt da seção 3. |
| **Z-Image Turbo (local)** | Prompt mestre como está, sem negative prompt. Requer runtime com suporte a imagem (o Ollama 0.34 não tem). |

---

## 8. Checklist de aprovação

Antes de salvar qualquer imagem em `public/assets/environment/`:

- [ ] Moldura de selva presente nas bordas (topo, laterais, base) e abertura central ampla
- [ ] Ilha herói à esquerda com cachoeiras visíveis; ilha flutuante central com cipós
- [ ] Planos separáveis: dá para traçar background / midground / foreground sem ambiguidade
- [ ] Perspectiva atmosférica clara (mais distante = mais claro e suave)
- [ ] Paleta dentro da [direção de arte §6](./visual-direction.md#6-paleta), acentos bioluminescentes ≤ 5% da tela e só nos cantos inferiores
- [ ] Sol à direita do centro, baixo; contraluz coerente em todas as camadas
- [ ] Foco nítido em todos os planos, sem DOF ou bokeh
- [ ] Sem pessoas, construções, texto, marcas d'água ou artefatos óbvios (ilhas duplicadas, cachoeiras subindo, folhas derretidas)
- [ ] Proporção 16:9, mesma resolução e alinhamento das camadas existentes
- [ ] Camadas com alfa passaram pelo checklist do [asset-spec.md §10](./asset-spec.md#10-checklist-para-substituir-ou-adicionar-uma-camada)

---

## 9. Log de gerações

| Data | Asset | Origem | Prompt | Notas |
|------|-------|--------|--------|-------|
| 2026-10-10 | `scene-reference-01.png` (tentativa) | Z-Image Turbo fp8 / Ollama 0.34.0, local | v1 | Falhou: o runtime não suporta geração de imagem. Nenhuma imagem produzida. |
| 2026-10-11 | `assets/background.png`, `assets/floresta-flutuante.png`, `assets/floresta-frontal.png` | Externa, fornecidas pelo usuário | **a registrar** | 1672 × 941. Camadas já separadas, alfa com núcleo em ~98%. Adotadas como fonte. |
| 2026-10-11 | `background/`, `midground/`, `foreground/*.png` | Tratamento das fontes acima | — | Alfa remapeado, limpeza, *edge padding*, névoa suavizada, lago estendido ([asset-spec §2](./asset-spec.md#2-origem-e-tratamento)) |
| 2026-10-11 | `concept/scene-reference-01.png` | Composto das 3 camadas tratadas | — | Referência mestre na posição neutra. O prompt v2 foi escrito a partir dela. |
| 2026-10-11 | `masks/*.png`, `depth/layer-depth.png` | Derivados automaticamente das camadas | — | Ver [asset-spec §6–7](./asset-spec.md#6-máscaras-auxiliares-masks) |
| 2026-10-11 | `background/`, `midground/`, `foreground/*.webp` | Derivados dos PNG master (step 7) | — | `cwebp -q 90 -alpha_q 100 -exact -sharp_yuv -m 6`; entrega de 1,2 MB ([asset-spec §3](./asset-spec.md#3-especificação-por-camada)) |
| 2026-10-12 | Limpeza | — | — | Fora do projeto: PNG master, `concept/`, `masks/`, `depth/` e a arte anterior em `assets/`. Só os WebP de entrega ficam; o resto pode ser recuperado do commit `e8aee56`. |
