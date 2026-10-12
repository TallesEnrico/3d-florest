---
name: scene-composition
description: Ajustar ou estender a composição da cena 2.5D em React Three Fiber (profundidade e escala das camadas, câmera off-axis, limites de movimento, névoa, partículas, novas camadas). Use ao mexer em src/features/scene ou quando algo "revela borda", "parece chapado" ou "não bate com a referência".
paths: "src/features/scene/**"
---

# Composição da cena 2.5D

Referência matemática: `docs/engineering/scene-logic.md`. Todos os números ficam em `src/features/scene/config/sceneConfig.ts`.

## Modelo em 30 segundos

- 1 unidade = altura da tela. A tela é o plano z = 0. Olho em `(ex, ey, D)`, com `D = camera.eyeDistance`.
- Camada em `z = −depth`, com tamanho `cover × (D + depth)/D × overscan`. No neutro, foreground e midground coincidem com a referência (o background tem +12% de overscan).
- Deslocamento na tela de uma camada = `e · depth/(D + depth)`. O foreground (depth 0) não se move: é a janela.
- O olho vai até `min(motion.maxEye, orçamento geométrico)`. O orçamento é **calculado** (`getMotionBudget` em `utils/projection.ts`) a partir do overscan, da `edgeMargin` medida e da profundidade, com `safety` de folga.

## Receitas

### "Quero mais sensação de profundidade"
1. Aumente `motion.maxEye.x` / `.y`. O orçamento geométrico (`getMotionBudget`) limita sozinho. Em 16:9 o teto é ≈ { x: 0,101, y: 0,057 }.
2. Se o teto geométrico já limita: aumente o `overscan` do background (+0,04 de cada vez). O orçamento cresce, mas a nitidez cai e o céu se afasta da pintura. O midground usa `edgeMargin` medida, não overscan.
3. Não reduza `depth` do background abaixo de ~20·D: a camada deixa de parecer "infinita".

### "Apareceu borda"
1. Rode com `?debug` e leve o mouse aos 4 cantos em 16:9 e em 4:3.
2. Confira se o `overscan` do background não ficou abaixo de 1,12 e se o `edgeMargin` do midground não foi aumentado sem nova medição.
3. Confira se ninguém somou offset depois do clamp (o clamp é a última etapa em `WindowCamera`).

### "Não bate com a referência no neutro"
1. A camada precisa usar `coverSize(...) × depthScale(depth, D) × overscan` (`utils/projection.ts`), e não um tamanho fixo.
2. As texturas de cor devem estar em `SRGBColorSpace` e o canvas em `flat`.
3. Use `?view=0,0` na URL: fixa a entrada no neutro e desliga a deriva.

### Adicionar uma camada (ex.: névoa intermediária, nova pintura)
1. Entrada em `sceneConfig.layers` (ou em `haze`) com `depth` entre os vizinhos, `overscan` e `renderOrder` entre os vizinhos.
2. Se for pintura: mesma resolução e alinhamento das demais (asset-spec). Se for efeito procedural: largo o bastante (overscan ≥ 1,3) ou com bordas que esmaecem.
3. Material `transparent`, `depthWrite: false`, `toneMapped: false`.
4. Valide o neutro e os 4 extremos.

### Partículas e efeitos 3D
- Posicione em z entre as camadas. A paralaxe sai da câmera, sem código extra.
- Mantenha as posições dentro do frustum na profundidade: `|x| ≤ cover_w/2 · (D + depth)/D`.
- Sem alocação em `useFrame`; atualize atributos ou uniforms. Respeite `prefers-reduced-motion`.

## Checklist de saída

- [ ] Neutro = referência · [ ] 4 extremos sem borda em 16:9 e 4:3 · [ ] 60 fps · [ ] números novos só no config, com unidade
