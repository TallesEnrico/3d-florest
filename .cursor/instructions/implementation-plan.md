# Briefing: Plano de Implementação

> O status oficial está em [roadmap.md](../../docs/product/roadmap.md). Este briefing diz **o que existe** (para não refazer) e **o que vem depois**. Ao concluir um step, atualize os dois.

## Já implementado (steps 5–7): não recriar

| Área | Onde | Observações |
|---|---|---|
| Canvas e câmera off-axis | `features/scene/components/SceneCanvas.tsx`, `WindowCamera.tsx` | `manual` camera; mola `smoothDamp`; deriva idle; limites `min(maxEye, orçamento)` |
| Camadas em profundidade | `LayeredEnvironment.tsx` (+ `LayerGlowMaterial.tsx` no foreground) | WebP de entrega; midground com `edgeMargin` medida; bg overscan 1,12 |
| Efeitos | `AtmosphericHaze`, `SunGlow`, `FloatingMotes`, `SceneClock` | Relógio único `sceneTime`; congelam com movimento reduzido |
| Matemática | `features/scene/utils/projection.ts`, `smoothDamp.ts` | Funções puras |
| Tracking | `features/headTracking/hooks/useHeadTracking.ts` + `services/` + `utils/` | Webcam → MediaPipe (import dinâmico, GPU → CPU) → calibração → One Euro → store |
| Fallback e UI | `useMouseFallback.ts`, `HeadTrackingPrompt.tsx`, `HeadTrackingDebugPanel.tsx` | Estados: `idle/requesting/active/denied/unavailable/insecure/error` × `idle/loading/calibrating/tracking/searching` |
| Assets do MediaPipe | `scripts/setup-mediapipe.ts` (postinstall) → `public/mediapipe/` | Gitignored |
| Ponte entre features | `src/app/App.tsx` | `readHeadView` sem alocação; `?view=x,y` para QA |

## Como estender (receitas curtas)

- **Novo efeito visual:** componente em `features/scene/components/`, números em `sceneConfig`, tempo de `sceneTime`, `renderOrder` entre as camadas vizinhas. Skill `scene-composition`.
- **Nova fonte de entrada** (ex.: giroscópio): hook em `features/headTracking/hooks/` que escreve `offset`/`active` no store quando `source` for a dela. A cena não muda.
- **Novo asset:** pipeline do asset-spec (PNG master → WebP com `-exact` → derivados). Skill `image-generation`.

## Próximos passos

Backlog priorizado em [roadmap.md → Checklist de melhorias futuras](../../docs/product/roadmap.md#checklist-de-melhorias-futuras). Evolução técnica (depth map, shaders, 3D real) em [evolution.md](../../docs/engineering/evolution.md).
