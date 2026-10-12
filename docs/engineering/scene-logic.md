# Lógica da Cena

Como a cena 2.5D é montada, por que ela nunca revela bordas e onde ajustar cada coisa. Valores atuais em `src/features/scene/config/sceneConfig.ts`.

## Modelo: Brasil

- **Unidade de mundo:** 1 = altura da tela. A tela é o retângulo `aspect × 1` no plano **z = 0**, centrado na origem.
- **Olho (câmera):** em `(ex, ey, D)`. `D = camera.eyeDistance` (2,5 alturas de tela ≈ notebook a 50–60 cm). `ex`/`ey` vêm da entrada (cabeça ou mouse) × limites de movimento.
- **Camadas:** planos atrás da tela em `z = −depth`. A câmera olha para −z, sem rotação.
- **Projeção off-axis:** o frustum sempre passa pelas bordas da tela, de onde quer que o olho esteja. Assim o plano z = 0 nunca se move na tela, e o que está atrás se desloca **junto com a cabeça**, como numa janela real.

```
 near-plane bounds (n = near):
   left   = (−aspect/2 − ex) · n / D        right = ( aspect/2 − ex) · n / D
   bottom = (−1/2     − ey) · n / D        top   = ( 1/2     − ey) · n / D
 camera.position = (ex, ey, D)
 camera.projectionMatrix.makePerspective(left, right, top, bottom, n, far)
```

A câmera usa `manual: true` no `<Canvas>` para o R3F não sobrescrever a projeção no resize. A matriz é recalculada a cada frame em `WindowCamera`.

## Posicionamento das camadas

Cada plano é escalado pela profundidade para ocupar, na posição neutra, o mesmo lugar que ocupa na pintura:

```
 cover        = tamanho que cobre a tela mantendo 16:9 (como CSS object-fit: cover)
 planeSize_i  = cover × (D + depth_i) / D × overscan_i
```

O fator `(D + depth)/D` compensa a perspectiva: um plano 2× mais distante precisa ser 2× maior para ocupar o mesmo espaço na tela.

| Camada | `depth` | `overscan` | Desloc. na tela por unidade de olho `k = depth/(D+depth)` | `renderOrder` |
|---|---|---|---|---|
| foreground | 0 | 1,00 | 0: **parado, é a janela** | 4 |
| névoa próxima | 1,6 | 1,6 | 0,39 | 3 |
| midground | 4,67 | 1,00 (+ `edgeMargin` medida) | 0,65 | 2 |
| névoa distante | 12 | 1,6 | 0,83 | 1 |
| background | 50 | 1,12 | 0,95 | 0 |

- `depth` reproduz os fatores relativos do [asset-spec §4](../art/asset-spec.md#4-orçamento-de-paralaxe-e-overscan): com o foreground ancorado, o midground move 0,65 e o background 0,95 do deslocamento.
- **Por que só o background tem overscan.** A abertura da moldura só toca a borda **superior** da tela (378 px de largura). Laterais e base são sempre cobertas pelo foreground. O midground é céu vazio no topo, então suas bordas nunca aparecem. Medido: nenhuma borda visível até 120 px na horizontal e 67 px na vertical de deslocamento (arte de 941 px de altura). Isso entra como `edgeMargin`, e o midground fica **pixel-alinhado à moldura, como pintado**. O background precisa de 1,12 para não mostrar a borda superior pela abertura quando desce.
- **Consequência no neutro:** foreground e midground coincidem com `scene-reference-01.png`. O background (céu e ilhas distantes) aparece 12% maior que na pintura, o que é imperceptível como desalinhamento porque não há contato entre ele e a moldura.
- A névoa é um gradiente suave, larga (overscan 1,6) e com bordas esmaecidas: nunca mostra corte.
- Ordem de desenho explícita (`renderOrder`), materiais com `depthWrite: false`. Não há ordenação por distância.

## Limites de movimento

Dois limites por eixo; vale o **menor**:

1. **Amplitude de projeto** `motion.maxEye` (alturas de tela): igual em qualquer tela, para a sensação ser consistente. Atual: `{ x: 0,1, y: 0,055 }`, horizontal maior de propósito.
2. **Orçamento geométrico** (`getMotionBudget`): o máximo antes de alguma borda aparecer, calculado para o aspect atual:

```
 margem_i = max( (cover · overscan_i − tela) / 2 ,  edgeMargin_i · cover_h · overscan_i )
 orçamento = safety · min_i ( margem_i / k_i )          (safety = 0,9)
```

| Tela | Orçamento x | Orçamento y |
|---|---|---|
| 16:9 | 0,101 | 0,057 |
| 16:10 | 0,176 | 0,057 |
| 4:3 | 0,306 | 0,057 |
| 21:9 | 0,132 | 0,216 |

Em 16:9 os dois limites praticamente coincidem. Nas outras proporções o orçamento sobra e vale a amplitude de projeto. A entrada em ±1 leva o olho a ±limite; o clamp é a última etapa, depois do amortecimento.

## Contrato de entrada

```ts
interface ViewInput {
  x: number        // −1..1  (+ = usuário foi para a direita dele)
  y: number        // −1..1  (+ = usuário subiu)
  active: boolean  // há entrada real (webcam rastreando ou mouse recente)?
}
```

`SceneCanvas` recebe `getViewInput: () => ViewInput` e a chama dentro de `useFrame`. Ela não sabe se a origem é webcam ou mouse. Sem entrada (`active = false`), uma **deriva idle** lenta (Lissajous) mantém a cena viva e revela a profundidade. Ela some quando a entrada fica ativa e é desligada com `prefers-reduced-motion`.

## Suavização da câmera

1. A fonte (tracking) entrega o offset já filtrado (One Euro, ~30 Hz).
2. A câmera segue o alvo com uma **mola criticamente amortecida** (`utils/smoothDamp.ts`, `motion.smoothTime` = 0,22 s), a 60+ Hz. Diferente do amortecimento exponencial, a **velocidade é contínua** quando o alvo salta: entre amostras de 30 Hz, na troca mouse ↔ webcam e quando o rosto some e o alvo vira 0. Chega a 95% do alvo em ~0,5 s, sem overshoot, igual a 10 ou 100 fps.
3. Frames longos (aba trocada) são limitados a 0,1 s para a mola não disparar.

## Parallax de rolagem (hero)

Ao rolar a página, o olho "desce" proporcionalmente ao quanto o hero já saiu da tela:

```
 progressoScroll = clamp(−topoDoHero / alturaDoHero, 0, 1)       (HeroSection → getScrollProgress)
 olhoY_extra     = −progressoScroll × motion.scrollParallax        (somado depois do limite e da mola)
```

Como cada camada se desloca `olho × k`, a moldura (k = 0) acompanha a página e as camadas fundas ficam para trás. Com `scrollParallax = 0,5`, medido no navegador com rolagem de 150 px: **moldura −150 px (1,0×), ilhas −101 px (0,67×), céu −79 px (0,53×)**, exatamente o previsto.

- **Por que fora do orçamento de movimento:** a borda superior do fundo desce menos do que a página sobe (`0,95 × 0,5 < 1`), então ela fica sempre acima da viewport. A borda inferior fica escondida pelo recorte do hero (`overflow: hidden`) e pela moldura. Manter `scrollParallax ≤ ~1`.
- **Sem mola:** acompanha o scroll no mesmo frame, sem "nadar".
- **Movimento reduzido:** desligado (parallax de rolagem é um gatilho clássico de desconforto vestibular).
- Funciona com mouse, cabeça ou toque: só depende da rolagem.

## Efeitos atmosféricos

| Efeito | Componente | Onde fica | Ajuste em `sceneConfig` |
|---|---|---|---|
| Névoa em faixas | `AtmosphericHaze` | Planos entre bg↔mid (depth 12) e mid↔fg (depth 1,6) | `haze[*]` |
| Brilho do sol, respirando | `SunGlow` | Plano aditivo logo à frente do background, mesmo enquadramento | `sunGlow` (opacidade baixa: a área já é a mais clara da pintura) |
| Pólen flutuante | `FloatingMotes` | 140 pontos em 3D entre depth 0,35 e 4: paralaxe real | `motes` |
| Plantas bioluminescentes pulsando | `LayerGlowMaterial` | Material do foreground + `masks/foreground-emissive-mask.png` | `layers[foreground].glow` |
| Vinheta | CSS (`.scene__vignette`) | Sobre o canvas | `src/index.css` |

Todos os shaders usam o relógio compartilhado `sceneTime`, avançado pelo `SceneClock`.

## Movimento reduzido

Com `prefers-reduced-motion: reduce`: sem deriva idle, `sceneTime` congelado (névoa, sol, partículas e brilho param), amplitude da câmera × `motion.reducedMotionScale` (0,5) e sem fade-in. O controle pela cabeça ou pelo mouse continua.

## Eixo Z (aproximação)

Fora do MVP. Aproximar a cabeça (D menor) **encolhe** as camadas distantes na tela (mais campo de visão, como numa janela real), o que exigiria overscan extra. Exemplo: com D −10%, o background encolhe ~10%. Para habilitar: aumentar o overscan, recalcular o orçamento e limitar `D ∈ [0,9; 1,1] · D₀`.

## Onde ajustar

Tudo em `src/features/scene/config/sceneConfig.ts`:

| Quero… | Campo |
|---|---|
| Mais ou menos profundidade | `layers[*].depth` (mantenha a ordem bg > névoa > mid > névoa > fg) |
| Escala de uma camada | `layers[*].overscan`. Abaixo do necessário, revela bordas (o orçamento encolhe sozinho); acima, perde nitidez e se afasta da pintura. |
| Amplitude do movimento | `motion.maxEye.x` / `.y` (alturas de tela; o orçamento geométrico limita automaticamente) |
| Suavidade da câmera | `motion.smoothTime` (s; menor = responde mais rápido) |
| Amplitude com movimento reduzido | `motion.reducedMotionScale` |
| Parallax ao rolar o hero | `motion.scrollParallax` (0 = desligado; ≤ ~1) |
| Deriva idle | `idleDrift.amplitude` (fração do limite), `periodX/Y` (s), `fadeRate` |
| Névoa | `haze[*]`: `color`, `opacity`, `bandCenter`/`bandWidth` (altura na pintura, 0 = base), `speed`, `depth` |
| Brilho do sol | `sunGlow`: `centerPx`, `radius`, `opacity`, `period` |
| Pólen | `motes`: `count`, `depthMin/Max`, `size`, `opacity`, `riseSpeed`, `sway` |
| Pulso das plantas | `layers[foreground].glow`: `intensity`, `speed` |
| Arquivos das camadas | `layers[*].url` (WebP de entrega; o PNG ao lado é o master) |
| Perspectiva base | `camera.eyeDistance` (maior = mais teleobjetiva, menos paralaxe por unidade de olho) |

## Auxílio de QA

`?view=x,y` na URL fixa a entrada (ex.: `?view=0,0` neutro, `?view=1,-1` canto inferior direito), sem deriva. É útil para comparar com a referência e testar os extremos.
