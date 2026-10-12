---
name: performance-optimization
description: Medir e reduzir o custo de renderização e de tracking (fps, tempo de frame, inferência do MediaPipe, memória de texturas, tamanho do bundle). Use quando houver queda de fps, travadas, aquecimento, bundle grande ou antes de um deploy.
---

# Performance

Orçamentos e decisões: `docs/engineering/performance.md`. Critérios: `docs/qa/acceptance-criteria.md` (AC-F*).

## 1. Medir antes de mudar

| O quê | Como |
|---|---|
| fps / tempo de frame | DevTools → Performance (10 s com tracking) ou Rendering → Frame Rendering Stats |
| Inferência | Painel de debug (`?debug`): ms por detecção e delegate |
| Draw calls / texturas | `gl.info` (`render.calls`, `memory.textures`) via console ou debug |
| Bundle | `bun run build`: tamanho de cada chunk; o MediaPipe precisa estar separado |
| Memória | DevTools → Memory: snapshot antes e depois de ligar/desligar a câmera 5× |

Registre o número antes e depois de cada otimização.

## 2. Alavancas, em ordem de custo/benefício

1. **DPR:** limitado a 1,75 em `SceneCanvas`, com `PerformanceMonitor` derrubando para 1× quando o fps cai. É a maior alavanca em telas Retina.
2. **Antialias desligado:** as camadas são texturas e as bordas dos planos ficam fora da tela.
3. **Nada por frame no React:** procure `setState` ou subscriptions de offset fora do debug.
4. **Zero alocação em `useFrame`:** objetos reutilizados; sem `new Vector3()` no loop.
5. **Tracking:** vídeo 640×480; detecção por `requestVideoFrameCallback` (≤ 30 Hz), nunca por frame de render; delegate GPU.
6. **Partículas:** um único `Points`, contagem no config; atualizar no shader (uniform de tempo), não no CPU.
7. **Texturas:** entrega em WebP q90 com alfa exato (1,2 MB no total), mipmaps e anisotropia ≤ 8. Para upscale/4K, migrar para KTX2 (Basis) e carregar com `useKTX2`.
8. **Aba oculta:** câmera liberada e rAF pausado pelo navegador; não crie timers que continuem rodando.
9. **Bundle:** MediaPipe com `import()` dinâmico; evite helpers pesados do drei.

## 3. Sinais de alerta no código

- `useHeadTrackingStore((s) => s.offset)` em componente que não é o painel de debug
- `new THREE.*` dentro de `useFrame` ou do render de componente sem `useMemo`
- `detectForVideo` chamado dentro de `useFrame`
- Texturas carregadas sem `useTexture` (sem cache) ou recriadas a cada render

## Checklist de saída

- [ ] Números antes e depois registrados · [ ] AC-F1…F4 ok · [ ] sem regressão visual (neutro = referência)
