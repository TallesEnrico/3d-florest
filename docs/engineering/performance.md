# Performance

Orçamentos, o que já foi feito, como medir e o que fazer depois. Critérios: [acceptance-criteria.md](../qa/acceptance-criteria.md) (AC-F*). Procedimento: skill `performance-optimization`.

## Orçamentos

| Item | Alvo | Medido (step 7) |
|---|---|---|
| Frame (desktop, tracking ativo) | 60 fps, p95 < 20 ms | 60 fps no Chrome headless (rAF); **falta medir em GPU real** com DevTools |
| Inferência MediaPipe (GPU) | < 15 ms por frame de vídeo | 10–15 ms (headless, SwiftShader). Em GPU real deve ser menor. |
| Primeiro carregamento (texturas da cena) | < 2 MB | **1,2 MB** (WebP) + 36 kB (máscara emissiva) |
| JS inicial | sem MediaPipe | 1,16 MB (321 kB gzip), dos quais three.js é a maior parte |
| MediaPipe (sob demanda) | só após o clique | JS 154 kB (45 kB gzip) + wasm ~13 MB + modelo 3,7 MB |
| Draw calls | < 10 | 7 (bg, brilho do sol, névoa distante, mid, névoa próxima, partículas, fg) |

## O que já está feito

| Decisão | Ganho |
|---|---|
| Camadas em **WebP q90** com alfa exato (`cwebp -q 90 -alpha_q 100 -exact -sharp_yuv -m 6`) | 6,9 MB → 1,2 MB de download, sem diferença visível (PSNR 36–41 dB, alfa idêntico) |
| MediaPipe com `import()` dinâmico após "Ativar câmera" | Bundle inicial sem o tracking; nenhum wasm ou modelo é baixado sem opt-in |
| Detecção por `requestVideoFrameCallback` | Inferência ≤ 30 Hz (frames reais da câmera), nunca por frame de render |
| Vídeo 640×480 | Decodificação e inferência baratas; landmarks sobram |
| `antialias: false` | Sem MSAA: as bordas dos planos ficam fora da tela |
| DPR até 1,75 + `PerformanceMonitor` (cai para 1× se o fps não se sustenta) | ~25% menos pixels que DPR 2 em Retina; degrada sozinho em máquinas fracas |
| Um relógio compartilhado (`sceneTime`) para todos os shaders | Um uniform atualizado por frame, em vez de um por material |
| Partículas animadas na GPU (vertex shader) | 140 pontos, zero trabalho de CPU por frame |
| Offset lido com `getState()` dentro de `useFrame` | Zero re-render do React por frame (só o painel de debug assina o offset) |
| Zero alocação no loop (`WindowCamera`, ponte do `App`) | Sem pressão de GC durante o movimento |
| Câmera liberada com a aba oculta; rAF pausado pelo navegador | Nada roda em segundo plano |
| `prefers-reduced-motion` congela o relógio | Shaders param de animar |

## Como medir

1. **fps e tempo de frame:** DevTools → Performance, gravar 10 s com a câmera ativa e movimento de cabeça. Ver o p95 em "Frames".
2. **Inferência:** painel de debug (`?debug`), linha "Inferência" (média móvel + delegate).
3. **Rede:** DevTools → Network, cache desabilitado: conferir ~1,2 MB de imagens no carregamento e o MediaPipe só depois do clique.
4. **Memória:** DevTools → Memory, snapshot antes e depois de ligar/desligar a câmera 5×. O heap deve voltar ao patamar inicial.
5. **Bundle:** `bun run build` lista os chunks; `vision_bundle-*.js` precisa estar separado.

## Memória de GPU

Cada camada 1672×941 RGBA = 6,3 MB + mipmaps (×1,33) ≈ **8,4 MB** → ~25 MB nas 3 camadas, mais a máscara. Um upscale 2× quadruplica (~100 MB), e aí a entrega em **KTX2/Basis** (textura comprimida na GPU, `useKTX2` do drei) passa a ser obrigatória.

## Próximas otimizações (por impacto)

1. **Separar three.js em chunk próprio** (`build.rolldownOptions.output`): não reduz o total, mas melhora o cache entre deploys.
2. **KTX2** quando houver upscale das camadas.
3. **Web Worker para o MediaPipe** se a inferência passar de ~12 ms em máquinas-alvo (libera a thread principal para o render).
4. **`frameloop="demand"`** com `prefers-reduced-motion` e sem entrada: hoje o loop roda sempre por causa da deriva e dos efeitos.
5. **Pré-carregar** as texturas com `<link rel="preload" as="image">` no `index.html`.
