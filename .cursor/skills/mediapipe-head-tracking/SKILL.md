---
name: mediapipe-head-tracking
description: Implementar, ajustar ou depurar o head tracking com webcam e MediaPipe Face Landmarker (permissões, carregamento do wasm/modelo, calibração, sensibilidade, filtro One Euro, estados, fallback para mouse). Use quando o tracking treme, atrasa, perde o rosto, não inicia, ou ao mexer em src/features/headTracking.
paths: "src/features/headTracking/**, scripts/setup-mediapipe.ts"
---

# Head tracking com MediaPipe

Referência: `docs/engineering/head-tracking.md`. Números em `src/features/headTracking/config/trackingConfig.ts`.

## Setup dos arquivos do MediaPipe

```bash
bun install                      # o postinstall roda scripts/setup-mediapipe.ts
bun scripts/setup-mediapipe.ts   # manual: copia o wasm e baixa o modelo se faltar
```

O resultado fica em `public/mediapipe/wasm/*` e `public/mediapipe/models/face_landmarker.task` (gitignored). Se o MediaPipe for atualizado, rode o script de novo: o wasm precisa ser da mesma versão do pacote JS.

## Fluxo (onde fica cada coisa)

| Etapa | Arquivo |
|---|---|
| Abrir/fechar câmera, mapear erros | `services/webcam.ts` |
| Carregar o landmarker (import dinâmico, GPU → CPU), detectar | `services/mediapipe.ts` |
| Medida → neutro → offset | `utils/calibration.ts` |
| Suavização | `utils/oneEuroFilter.ts` |
| Loop, estados, ciclo de vida, aba oculta | `hooks/useHeadTracking.ts` |
| Mouse | `hooks/useMouseFallback.ts` |
| UI | `components/HeadTrackingPrompt.tsx`, `HeadTrackingDebugPanel.tsx` |

## Calibrar e ajustar (com `?debug`)

1. Sente na posição de uso e clique em **Recalibrar**. Durante ~20 amostras o status é `calibrating`.
2. **Sensibilidade:** mova a cabeça ~10 cm para cada lado. O offset X deve chegar perto de ±0,8. Se não chega, reduza `sensitivity.rangeX`; se satura cedo, aumente.
3. **Tremor:** parado, o offset deve oscilar < ±0,02. Se tremer, reduza `filter.minCutoff` (ex.: 1,0 → 0,6) ou aumente `deadZone`.
4. **Atraso:** em movimentos rápidos a cena deve acompanhar sem "arrasto". Se arrastar, aumente `filter.beta`.
5. Vertical mais contido: `sensitivity.rangeY` maior e/ou `sceneConfig.motion.maxEye.y` menor.

## Depuração

| Sintoma | Causa provável | Ação |
|---|---|---|
| `denied` imediato | Permissão bloqueada no site ou página em http com IP | Usar `localhost`/HTTPS; liberar a câmera no cadeado da barra de endereço |
| `unavailable` | Câmera em uso (Zoom/Meet) ou inexistente | Fechar o outro app; testar com câmera falsa (`docs/qa/testing-checklist.md`) |
| `error` ao carregar | `public/mediapipe/` ausente ou desatualizado | `bun scripts/setup-mediapipe.ts` |
| Erro de timestamp | Timestamp repetido ou decrescente | Sempre usar o helper `detect()` do service |
| Fica em `searching` | Pouca luz, rosto de perfil, longe demais | Melhorar a luz; reduzir `minFacePresenceConfidence` |
| Inferência > 20 ms | Delegate caiu para CPU | Ver o delegate no debug; checar se o WebGL2 está disponível |

## Não fazer

- Pedir câmera no mount, usar CDN, desenhar o vídeo fora do debug.
- Calcular pixels de tela ou mexer em câmera 3D aqui: o tracking só publica offset em [−1, 1].
- Trocar para o mouse sozinho quando o rosto some (só em `denied` / `unavailable` / `error` / câmera desligada).
