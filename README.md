# Floresta 3D: 3D Webcam

Landing page de uma experiência imersiva em que a tela vira uma **janela** para um vale fantástico de ilhas flutuantes. A cena é o hero da página. A cena 2.5D (React Three Fiber) muda de perspectiva conforme a cabeça do usuário se move, detectada pela webcam com MediaPipe e processada só no navegador. Sem câmera, o mouse faz o mesmo papel.

---

## Requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| [Bun](https://bun.sh) | ≥ 1.4 | Gerenciador de pacotes e executor de scripts |
| Node.js | ≥ 22.12 | Runtime usado pelo Vite 8. Declarado em `engines` e `.nvmrc` (`nvm use`). |
| Navegador | com WebGL 2 | Chrome, Edge, Firefox ou Safari recentes |
| Conexão | internet no 1º `bun install` | O `postinstall` baixa o modelo do MediaPipe (3,7 MB) |

> A webcam só funciona em **contexto seguro**: `http://localhost` ou HTTPS. Pelo IP da rede em http, a página mostra que a câmera exige https e segue com o mouse.

---

## Rodando localmente

```bash
bun install      # instala dependências e prepara public/mediapipe (wasm + modelo)
bun run dev      # http://localhost:5173
```

Clique em **Ativar câmera** e permita o acesso. Ou apenas mova o mouse. Com a câmera ligada, **Navegar com a cabeça** permite rolar a página com a cabeça: incline para baixo (ou para cima) e segure meio segundo; mantendo a cabeça inclinada, a rolagem continua; volte ao centro para parar.

### Scripts

| Comando | O que faz |
|---|---|
| `bun run dev` | Servidor de desenvolvimento com HMR em http://localhost:5173 |
| `bun run build` | Checagem de tipos + build de produção em `dist/` |
| `bun run preview` | Serve o build de `dist/` em http://localhost:4173 |
| `bun run typecheck` | Só a checagem de tipos (`tsc -b`) |
| `bun run lint` | Lint com [oxlint](https://oxc.rs) |
| `bun run setup:mediapipe` | Copia o wasm e baixa o modelo do MediaPipe para `public/mediapipe/` (roda sozinho no `postinstall`) |

### Parâmetros de URL

| Parâmetro | Efeito |
|---|---|
| `?debug` | Mostra o painel de debug (oculto por padrão). A tecla **D** alterna. |
| `?view=x,y` | Fixa a vista (QA): `?view=0,0` é o neutro, `?view=1,-1` um canto. Desliga a câmera e a deriva. |

---

## Como funciona

```
webcam → MediaPipe Face Landmarker → centro das íris + IPD → calibração (neutro) → filtro One Euro ─┐
mouse (fallback) ────────────────────────────────────────────────────────────────────────────────┤
                                                                     headTrackingStore (zustand) ◄┘
                                                                              │ offset x/y ∈ [−1, 1]
SceneCanvas ─► WindowCamera: o olho do usuário diante da tela (projeção off-axis, mola)
           └─► camadas pintadas em profundidade + névoa, brilho do sol, pólen, plantas que pulsam
```

- A **tela é o plano z = 0**. A moldura de selva fica nele, parada; o vale atrás se desloca com a cabeça, como numa janela real.
- **Ao rolar a página**, o hero ganha parallax: a moldura acompanha a página, as ilhas e o céu ficam para trás.
- Os limites de movimento são **calculados** para que nenhuma borda das camadas apareça, em qualquer proporção de tela.
- **Privacidade:** a câmera só liga com um clique; o vídeo nunca sai do navegador; wasm e modelo são servidos pelo próprio site.

---

## Stack

| Pacote | Papel |
|---|---|
| `react`, `react-dom` 19.3 | UI. Fixado em `~19.3` porque o R3F 9.8 aceita React < 19.4. |
| `vite` 8 + `@vitejs/plugin-react` | Dev server e build |
| `typescript` 6.0 | Tipagem (`strict`) |
| `three` 0.186 · `@react-three/fiber` 9 · `@react-three/drei` 10 | Renderização WebGL declarativa |
| `@mediapipe/tasks-vision` 1.1 | Face Landmarker (head tracking), carregado sob demanda |
| `zustand` 5 | Estado do tracking lido por frame sem re-render |

---

## Estrutura

```
├── assets/                          fontes originais da arte (não servidas)
├── docs/                            produto, arte, engenharia, QA
├── public/
│   ├── assets/environment/          camadas (PNG master + WebP de entrega), máscaras, depth, referência
│   └── mediapipe/                   GERADO no postinstall (gitignored): wasm + modelo
├── scripts/setup-mediapipe.ts
├── src/
│   ├── main.tsx · index.css
│   ├── app/App.tsx                  raiz de composição: liga headTracking → scene
│   └── features/
│       ├── landing/                 página: header, menus, rodapé, hero, seções; config/landingContent.ts
│       ├── forest/                  jornada pela floresta: cena compartilhada dos capítulos; config/forestConfig.ts
│       ├── scene/                   canvas, câmera off-axis, camadas, efeitos; config/sceneConfig.ts
│       └── headTracking/            webcam, MediaPipe, calibração, mouse, UI; config/trackingConfig.ts
└── .cursor/                         contexto do Cursor Agent (rules, instructions, skills)
```

**Ajustes ficam em dois arquivos:** `src/features/scene/config/sceneConfig.ts` (profundidade, escala, amplitude, suavidade, efeitos) e `src/features/headTracking/config/trackingConfig.ts` (sensibilidade, filtro, calibração, MediaPipe).

---

## Documentação

| Área | Documentos |
|---|---|
| Produto | [Visão](docs/product/vision.md) · [Escopo](docs/product/scope.md) · [Roadmap e melhorias futuras](docs/product/roadmap.md) |
| Arte | [Direção de arte](docs/art/visual-direction.md) · [Guia de prompts](docs/art/prompting-guide.md) · [Spec dos assets](docs/art/asset-spec.md) |
| Engenharia | [Arquitetura](docs/engineering/architecture.md) · [Estrutura](docs/engineering/folder-structure.md) · [Lógica da cena](docs/engineering/scene-logic.md) · [Head tracking](docs/engineering/head-tracking.md) · [Performance](docs/engineering/performance.md) · [Evolução](docs/engineering/evolution.md) |
| QA | [Critérios de aceite](docs/qa/acceptance-criteria.md) · [Checklist de testes](docs/qa/testing-checklist.md) |
| Landing page | [Plano](docs/product/landing-page-plan.md) · [Inventário de seções](docs/product/section-inventory.md) · [Arquitetura](docs/engineering/landing-page-architecture.md) · [Jornada pela floresta](docs/engineering/forest-journey.md) · [Critérios](docs/qa/landing-page-acceptance-criteria.md) |
| Agentes (Cursor) | [.cursor/README.md](.cursor/README.md) |

---

## Notas conhecidas

- O build avisa que o chunk principal passa de 500 kB (≈ 1,16 MB, 321 kB gzip), principalmente por causa do three.js. O MediaPipe já fica em chunk separado.
- O console mostra `THREE.Clock: This module has been deprecated` (vem de dentro do R3F 9.8 com three r186) e logs internos do MediaPipe ao ligar a câmera (`gl_context.cc`, `XNNPACK`). São inofensivos.
