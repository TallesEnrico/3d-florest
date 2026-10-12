# Estrutura de Pastas

Organização **por feature**: cada feature tem seus componentes, configuração, tipos e utilitários, e só a raiz de composição (`src/app`) conhece as duas.

```
.
├── assets/                         fontes originais da arte (não servidas, não editar)
├── docs/
│   ├── art/                        direção de arte, prompts, spec dos assets
│   ├── product/                    visão, escopo, roadmap
│   ├── engineering/                arquitetura, estrutura, lógica da cena, head tracking, performance
│   └── qa/                         critérios de aceite, checklist de testes
├── public/
│   ├── assets/environment/         camadas, máscaras, depth, referência (servidos em /assets/environment/…)
│   ├── fonts/                      Fraunces + Inter (woff2, OFL) + licenças
│   ├── favicon.svg                 símbolo da marca
│   └── mediapipe/                  GERADO por scripts/setup-mediapipe.ts (gitignored): wasm/ e models/
├── tools/
│   ├── perf/scroll-audit.ts    auditoria de scroll (Chrome headless): tarefas longas, quadros, shaders compilados no scroll
│   └── forest-assets/          pipeline OFFLINE dos assets da floresta (Poly Haven → GLB/WebP); package.json próprio
├── scripts/
│   └── setup-mediapipe.ts          copia o wasm e baixa o modelo (roda no postinstall)
├── src/
│   ├── main.tsx                    entrada: monta <App/>
│   ├── index.css                   reset global e tokens visuais da UI
│   ├── app/
│   │   └── App.tsx                 raiz de composição: liga headTracking → scene
│   └── features/
│       ├── forest/                 jornada cinematográfica (cena compartilhada dos capítulos)
│       │   ├── components/         ForestScene, SceneController, ForestAtmosphere, SunLight, RealisticForest (lazy), LightShafts
│       │   ├── config/forestConfig.ts  planos de câmera, caminhos, layout, LOD, assets, paleta do chão, atmosfera
│       │   ├── models/             bakeParts (glTF → partes), lodBatches (BatchedMesh + LOD), buildRealisticForest
│       │   ├── procedural/         distribuição com semente (layout), relevo/chão/trilha (terrain), random, geometry
│       │   ├── hooks/              useIdleReady (adia os downloads pesados)
│       │   ├── journey/            journeyState.ts (estado do scroll), useJourneyTracking.ts
│       │   └── types/index.ts
│       ├── scene/
│       │   ├── components/         SceneCanvas, WindowCamera, SceneClock, LayeredEnvironment,
│       │   │                       LayerGlowMaterial, AtmosphericHaze, SunGlow, FloatingMotes
│       │   ├── hooks/              useLayerTextures, useViewCover, usePrefersReducedMotion
│       │   ├── config/sceneConfig.ts   profundidades, overscan, câmera, movimento, névoa (único lugar de ajuste)
│       │   ├── types/index.ts      LayerConfig, ViewInput, …
│       │   └── utils/              projection.ts (cover, profundidade, orçamento, off-axis),
│       │                           smoothDamp.ts (mola), sceneTime.ts (relógio dos shaders),
│       │                           shaders.ts (vertex shader comum dos planos)
│       ├── landing/                página: layout, header, menus, rodapé, seções
│       │   ├── components/         SiteLayout, SiteHeader, Desktop/MobileNavigation, SiteFooter,
│       │   │                       SectionContainer, SectionSlot, LandingSections, BrandMark, CameraCta,
│       │   │                       HeadNavigation (modo navegar com a cabeça), ForestJourney (palco + capítulos)
│       │   ├── sections/           HeroSection + index.ts (registro das seções implementadas)
│       │   ├── config/landingContent.ts  fonte única de seções (ids, navegação) e textos
│       │   ├── hooks/              useInView, useScrolledPast, useActiveSection
│       │   ├── utils/              scrollToSection
│       │   └── styles/             tokens.css (cores, fontes, espaços), landing.css
│       └── headTracking/
│           ├── components/         HeadTrackingController, HeadTrackingPrompt, HeadTrackingDebugPanel (+ CSS)
│           ├── config/trackingConfig.ts  sensibilidade, filtro, calibração, MediaPipe (único lugar de ajuste)
│           ├── hooks/              useHeadTracking (webcam + MediaPipe), useMouseFallback, useDebugToggle
│           ├── services/           webcam.ts (getUserMedia), mediapipe.ts (Face Landmarker)
│           ├── store/              headTrackingStore.ts (zustand)
│           ├── controls.ts         requestCamera() e setHeadNavigation() para a UI fora do hero
│           ├── types/index.ts      status, offsets, medidas
│           └── utils/              calibration.ts, oneEuroFilter.ts, headGesture.ts (inclinar e segurar)
├── .cursor/                        contexto do Cursor Agent (ver .cursor/README.md)
└── index.html · vite.config.ts · tsconfig*.json · package.json · bun.lock
```

## Regras de dependência

| De → Para | Permitido? |
|---|---|
| `app` → qualquer feature | ✅ (é a raiz de composição) |
| `features/landing` → `scene`, `headTracking`, `forest` | ✅ (compõe a página) |
| `features/forest` → `scene` (utils e tipos) | ✅ |
| `features/forest` → `landing` / `headTracking` | ❌ (recebe ids e entrada por props) |
| `scene` / `headTracking` → `landing` | ❌ |
| `features/scene` → `features/headTracking` | ❌ A cena recebe `getViewInput` por prop. |
| `features/headTracking` → `three` / `@react-three/*` | ❌ |
| `features/scene` → `@mediapipe/*` | ❌ |
| `utils/` → React | ❌ Funções puras, testáveis isoladamente. |
| `services/` → store | ❌ O hook orquestra; services só fazem I/O. |

## Convenções de nomes

| Tipo | Padrão | Exemplo |
|---|---|---|
| Pasta de feature | camelCase | `headTracking/` |
| Componente React | PascalCase, export nomeado | `LayeredEnvironment.tsx` → `export function LayeredEnvironment` |
| Hook | `useX.ts` | `useHeadTracking.ts` |
| Config de feature | `<feature>Config.ts`, objeto `as const` | `sceneConfig.ts` |
| Tipos da feature | `types/index.ts` | — |
| Utilitário | camelCase, funções puras | `projection.ts` |
| Assets | inglês, kebab-case | `midground-water-mask.png` |

O único `export default` é `App` (ponto de entrada importado por `main.tsx`).

## Onde colocar coisas novas

| Preciso de… | Vai em… |
|---|---|
| Uma nova camada ou efeito visual | `features/scene/components/` + entrada em `sceneConfig.ts` |
| Ajustar profundidade, escala ou movimento | `features/scene/config/sceneConfig.ts` |
| Ajustar sensibilidade, filtro ou calibração | `features/headTracking/config/trackingConfig.ts` |
| UI de estado (botões, mensagens) | `features/headTracking/components/` |
| Estado compartilhado novo | Store da feature dona do dado. Se for global de verdade, `src/app/`. |
| Nova fonte de entrada (ex.: giroscópio) | `features/headTracking/hooks/`, publicando no mesmo store |
