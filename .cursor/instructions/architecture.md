# Briefing: Arquitetura

> Resumo para o agente. Fonte da verdade: [architecture.md](../../docs/engineering/architecture.md) · [folder-structure.md](../../docs/engineering/folder-structure.md) · [scene-logic.md](../../docs/engineering/scene-logic.md) · [head-tracking.md](../../docs/engineering/head-tracking.md).

## Mapa mental

```
src/app/App.tsx  (raiz de composição: liga as features)
 ├─ features/landing       SiteLayout ─► HeroSection (cena + tracking) + seções/slots + rodapé
 ├─ features/headTracking  webcam/MediaPipe/mouse ─► headTrackingStore (zustand) ─► offset x/y ∈ [−1, 1]
 └─ features/scene         SceneCanvas(getViewInput) ─► WindowCamera (off-axis) + LayeredEnvironment (camadas em Z)
```

## Invariantes (não quebrar)

1. **Fronteira entre features:** `scene` não importa `headTracking` nem MediaPipe; `headTracking` não importa `three`/R3F. `landing` compõe a página e pode importar as duas; nenhuma delas importa `landing`. O `getViewInput` chega à cena por prop.
2. **Nada por frame no React:** valores por frame (offset, câmera) nunca passam por `useState` ou re-render. Leitura com `useHeadTrackingStore.getState()` dentro de `useFrame`; escrita com `setState` fora do React.
3. **A tela é o plano z = 0:** câmera off-axis com `manual: true`, recalculada a cada frame. O foreground fica em z = 0 e o resto atrás. Não troque por `OrbitControls`, `lookAt` ou FOV fixo.
4. **Limites:** o olho vai até `min(motion.maxEye, orçamento geométrico)`. O orçamento é calculado do overscan, da `edgeMargin` medida e da profundidade (`utils/projection.ts`). Nunca use constantes em pixels.
5. **Ajustes centralizados:** números de cena só em `sceneConfig.ts`; números de tracking só em `trackingConfig.ts`. Nada de números mágicos em componentes.
6. **MediaPipe:** auto-hospedado em `/mediapipe/` (gerado no `postinstall`), carregado com `import()` dinâmico após o clique e liberado ao parar ou desmontar.
7. **Movimento:** a câmera segue o alvo com a mola `smoothDamp`; todo shader animado usa o relógio `sceneTime`; `prefers-reduced-motion` congela o relógio, tira a deriva e reduz a amplitude.

## Stack e restrições

React `~19.3` (peer do R3F 9.8) · three `0.186.x` · R3F 9 · drei 10 · zustand 5 · @mediapipe/tasks-vision 1.1 · Vite 8 (Node ≥ 22.12) · TypeScript 6 (strict) · Bun como gerenciador.

**Nova dependência só com justificativa explícita no PR/resposta.** Prefira escrever 20 linhas a adicionar um pacote.

## Comandos

`bun install` · `bun run dev` · `bun run build` · `bun run typecheck` · `bun run lint` · `bun run preview`
