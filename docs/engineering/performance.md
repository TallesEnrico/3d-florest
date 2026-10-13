# Performance

Orçamentos, o que já foi feito, como medir e o que fazer depois. Critérios: [acceptance-criteria.md](../qa/acceptance-criteria.md) (AC-F*). Procedimento: skill `performance-optimization`.

## Orçamentos

| Item | Alvo | Medido (step 7) |
|---|---|---|
| Frame (desktop, tracking ativo) | 60 fps, p95 < 20 ms | 60 fps no Chrome headless (rAF); **falta medir em GPU real** com DevTools |
| Inferência MediaPipe (GPU) | < 15 ms por frame de vídeo | 10–15 ms (headless, SwiftShader). Em GPU real deve ser menor. |
| Primeiro carregamento (texturas da cena) | < 2 MB | **1,35 MB** (WebP) + 36 kB (máscara emissiva) |
| JS inicial | sem MediaPipe | 1,2 MB (336 kB gzip) em chunks: `three` 737 kB, `react` 219 kB, `index` 247 kB |
| Floresta (sob demanda) | celular < 8 MB | desktop 21 MB; celular e tablet **6,6 MB** (variantes `_lite` / `_512`, KTX2) + 250 kB do transcoder Basis (gzip) |
| Montagem da floresta (celular, CPU 4× mais lenta, build de produção) | sem tarefa > 200 ms | ~1,8 s após o download; maior tarefa 181 ms; hero pronto em 1,07 s |
| MediaPipe (sob demanda) | só após o clique | JS 154 kB (45 kB gzip) + wasm ~13 MB + modelo 3,7 MB |
| Draw calls | < 10 | 7 (bg, brilho do sol, névoa distante, mid, névoa próxima, partículas, fg) |

## O que já está feito

| Decisão | Ganho |
|---|---|
| Qualidade da floresta em 5 níveis (`forestConfig.quality`), nível inicial pela capacidade do aparelho (`utils/deviceQuality.ts`) e ajuste pelo fps (`PerformanceMonitor`) | Aparelho forte mantém tudo; aparelho fraco desenha ~60% menos triângulos (2,7 M → 1,1 M no celular), com sombra e resolução menores |
| Variantes leves da floresta (`LITE_ASSETS`: `max-width: 767px` ou `pointer: coarse`), geradas por `tools/forest-assets/make_lite.ts` | Cor e normal a 512 px, ARM a 256 px (GLB e avulsas), HDRI 512 × 256 e árvores sem o LOD 0 (os nós `_lod0` usam a malha do LOD 1): 24 MB → 7,5 MB de download, ~¼ da memória de GPU em texturas e ~4× menos triângulos nas árvores de perto |
| Texturas da floresta em **KTX2** (ETC1S/BasisLZ, `qlevel` 128, mipmaps no arquivo), avulsas e embutidas nos GLB (`KHR_texture_basisu`), geradas por `tools/forest-assets/make_ktx2.ts`. Transcodificação em 2 workers (`components/forestLoaders.ts`); o transcoder vem do `three` e é empacotado pelo Vite (mesma origem) | Ficam comprimidas na GPU (BC/ETC/ASTC): ~4–8× menos memória de textura e upload mais rápido, sem decodificar imagem nem gerar mipmaps. Download também menor: celular 7,0 → 6,1 MB, desktop 22,1 → 19,2 MB (modelos + texturas) |
| A cabana numa segunda etapa (`ForestCabin`): modelos e texturas da cabana só são pedidos depois que a floresta está montada e aquecida, e a cabana é aquecida à parte | A floresta fica pronta 2,9 MB antes no celular (9 MB no desktop); a cabana só aparece capítulos depois, velada pela névoa |
| No celular, a floresta monta logo que o hero termina de carregar (ou ao rolar, ou após 6 s), e modelos, texturas e HDRI são pedidos ao mesmo tempo | O hero não disputa banda com a floresta, e a floresta já está baixando antes da rolagem: início do download 6,7 s → 1,1 s (celular emulado, servidor local) |
| Folhas mais leves nos níveis baixos (`foliage`: `medium` sem o modelo próximo, `low` com o modelo distante até de perto, `minimum` sem textura de agulha: agulhas finas opacas de cor sólida, de `models/solidCrown.ts`) | Menos cartões e, no `minimum`, nada de textura, teste de alfa nem sobreposição de cartões nas copas: com o mesmo número de triângulos da copa texturizada, GPU por quadro ~15–25% menor (medianas 7,3–8,7 → 5,3–7,5 ms; pior quadro no scroll 15,5 → 9,4 ms) |
| three.js e React em chunks próprios (`build.rolldownOptions.output.codeSplitting`) | Download em paralelo e cache entre deploys |
| `public/.htaccess` (Apache): gzip para JS, CSS, wasm e HDR; cache imutável para chunks com hash | JS 1,2 MB → 336 kB e wasm do MediaPipe 13 MB → 3,8 MB, se o servidor aceitar `AllowOverride` |
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
| Ritmo por atividade (`scene/utils/activity.ts`, ajustes em `sceneConfig.activity`): ritmo cheio com interação (mouse, toque, tecla, rolagem ou câmera ligada); 30 fps após 4 s sem entrada; sem desenho contínuo após 45 s ou com a janela sem foco ou a aba oculta (`frameloop="demand"`: só redesenha em resize ou carga de conteúdo). Animações CSS pausadas (`:root[data-activity]`) quando parado ou fora da página. `PerformanceMonitor` só no ritmo cheio | Página parada aberta deixa de manter a GPU a 60–120 fps: 120 → 30 → 0 quadros/s (hero e floresta, medido no Chrome em tela de 120 Hz) |
| Sem `backdrop-filter` sobre os canvases (prompt da câmera e trilho da navegação pela cabeça usam fundo mais opaco) | O blur forçava recompor a área a cada quadro do WebGL |
| `prefers-reduced-motion` congela o relógio | Shaders param de animar |

## Como medir

1. **fps e tempo de frame:** DevTools → Performance, gravar 10 s com a câmera ativa e movimento de cabeça. Ver o p95 em "Frames".
2. **Inferência:** painel de debug (`?debug`), linha "Inferência" (média móvel + delegate).
3. **Rede:** DevTools → Network, cache desabilitado: conferir ~1,2 MB de imagens no carregamento e o MediaPipe só depois do clique.
4. **Memória:** DevTools → Memory, snapshot antes e depois de ligar/desligar a câmera 5×. O heap deve voltar ao patamar inicial.
5. **Bundle:** `bun run build` lista os chunks; `vision_bundle-*.js` precisa estar separado.

## Memória de GPU

Cada camada 1672×941 RGBA = 6,3 MB + mipmaps (×1,33) ≈ **8,4 MB** → ~25 MB nas 3 camadas, mais a máscara. Um upscale 2× quadruplica (~100 MB), e aí a entrega em **KTX2/Basis** (textura comprimida na GPU, como já é feito na floresta com `useKtx2Textures`) passa a ser obrigatória.

## Próximas otimizações (por impacto)

1. **Conferir o servidor**: o `.htaccess` só vale com `mod_deflate`, `mod_headers` e `AllowOverride` ligados.
2. **KTX2 nas camadas do hero** se houver upscale (hoje são WebP, 1,35 MB).
3. **Web Worker para o MediaPipe** se a inferência passar de ~12 ms em máquinas-alvo (libera a thread principal para o render).
4. **Pré-carregar** as texturas com `<link rel="preload" as="image">` no `index.html`.
