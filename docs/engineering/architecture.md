# Arquitetura

## Visão geral

```
 Webcam ──► MediaPipe Face Landmarker ──► medida do rosto ──► calibração ──► filtro ──┐
 (local)    (wasm + modelo auto-hospedados)  (centro dos olhos, IPD)  (neutro)  (One Euro) │
                                                                                         ▼
 Mouse ────────────────────────────────────────────────────────────────────► headTrackingStore
 (fallback)                                                                   offset x/y ∈ [-1, 1]
                                                                                         │ leitura por frame
                                                                                         ▼ (getState, sem re-render)
                                                   SceneCanvas ──► WindowCamera (projeção off-axis)
                                                               └─► LayeredEnvironment (camadas em Z)
```

Duas features independentes, ligadas só pelo `App` (raiz de composição):

| Feature | Responsabilidade | Não pode |
|---|---|---|
| `features/scene` | Renderizar o ambiente em profundidade e posicionar a câmera a partir de um **offset normalizado** | Importar MediaPipe, acessar webcam ou conhecer a origem do offset |
| `features/headTracking` | Produzir o offset normalizado (webcam ou mouse), gerenciar permissões, estados e calibração | Importar `three` ou R3F |

O contrato entre elas é uma função `getViewInput(): ViewInput` passada como prop ao `SceneCanvas` (ver [scene-logic.md](./scene-logic.md#contrato-de-entrada)).

## Decisões (ADRs)

| # | Decisão | Motivo | Alternativa descartada |
|---|---|---|---|
| ADR-01 | **Bun** gerencia pacotes e roda scripts. O Vite roda em **Node ≥ 22.12** (`engines`). | Bun é o padrão pedido. O Vite 8 tem o Node como alvo principal. | Vite no runtime do Bun (`bun --bun`): menos testado |
| ADR-02 | React fixado em **`~19.3`** | O peer do `@react-three/fiber` 9.8 é `react <19.4` | `^19`: um install futuro quebraria o R3F |
| ADR-03 | **Câmera off-axis** (*head-coupled perspective*): a tela é o plano z = 0 e a câmera é o olho do usuário | É a física de uma janela real; partículas e efeitos 3D ganham paralaxe correta de graça | Deslocar planos em 2D: equivalente para offsets pequenos, mas não escala para efeitos 3D |
| ADR-04 | Foreground no plano da tela (z = 0); midground e background atrás | A moldura de selva é a "janela": fica parada e o mundo se move atrás dela | Background ancorado: a moldura "flutua" e parece overlay |
| ADR-05 | Olho limitado a `min(amplitude de projeto, orçamento geométrico)`. O orçamento vem de overscan × profundidade, mais a **margem medida** de camadas cuja borda a moldura esconde. | Sensação igual em qualquer tela; nenhuma borda aparece por construção; midground pixel-alinhado à moldura | Limites fixos em pixels (quebram em 21:9/4:3); só geometria (4:3 teria 3× mais movimento que 16:9) |
| ADR-06 | **zustand** para o estado do tracking. O offset é lido por frame com `getState()` dentro de `useFrame`. | Atualizações a 30–60 Hz sem re-render do React | Context/useState: re-render por frame |
| ADR-07 | MediaPipe **Face Landmarker** (`@mediapipe/tasks-vision`) em modo `VIDEO`, `numFaces: 1`, delegate GPU com fallback para CPU | Precisão e íris (IPD) para normalizar distância; roda no navegador | Face Detector: sem landmarks de íris |
| ADR-08 | **wasm e modelo auto-hospedados** em `public/mediapipe/`, gerados por `scripts/setup-mediapipe.ts` no `postinstall` | Privacidade (nenhuma requisição a terceiros), versão travada, funciona offline após o build | CDN jsDelivr + Google Storage |
| ADR-09 | MediaPipe carregado com **`import()` dinâmico** só após o clique em "Ativar câmera" | Bundle inicial menor; câmera é opt-in | Import estático |
| ADR-10 | Canvas `flat` (sem tone mapping) e materiais sem iluminação nas camadas | Preserva a paleta aprovada em `docs/art` | Iluminação/PBR: não se aplica a pintura 2.5D |
| ADR-11 | Câmera com **mola criticamente amortecida** (`smoothDamp`) | Velocidade contínua quando o alvo salta (amostras de 30 Hz, troca de fonte, rosto perdido); independente de fps | Amortecimento exponencial: "tranco" a cada mudança de alvo |
| ADR-12 | Camadas entregues em **WebP q90 com alfa exato**; PNG fica como master | 6,9 MB → 1,2 MB, sem diferença visível | PNG em produção (lento); KTX2 (só compensa com upscale) |
| ADR-13 | Efeitos (névoa, sol, pólen, brilho) em shaders próprios com **relógio único** `sceneTime` | Um uniform por frame; congelar tudo com movimento reduzido é uma linha | Pós-processamento: 1 passe de tela cheia por efeito |
| ADR-14 | **Landing de página única** (feature `landing`): a cena é o hero; seções por âncoras; IDs de uma fonte única tipada; slots explícitos para seções pendentes | Links nunca quebram (erro de tipo); entrega seção a seção sem buracos | Router/múltiplas páginas: desnecessário para uma página |
| ADR-15 | CTA externo liga a câmera via **registro de controles** (`headTracking/controls.ts`) | Mantém o gesto do usuário; sem Context nem *prop drilling* | Context: re-render e acoplamento à árvore |
| ADR-16 | Canvas com `frameloop="never"` quando o hero sai da tela. O tracking segue ligado na página toda (revisto em 2026-10-12, D6: a cabeça olha ao redor na floresta). Medido: ~14 ms de inferência por quadro de vídeo, rolagem a 60 fps | Zero GPU no canvas do hero fora da tela; a cabeça funciona em toda a página | Pausar o tracking e liberar a câmera após 5 s fora do hero (o comportamento anterior) |
| ADR-17 | Navegação pela cabeça: **segurar para engatar, manter para rolar** (histerese, velocidade pela inclinação), opt-in, inclinação vinda da matriz de pose do MediaPipe | O "segurar" evita inícios acidentais; manter a cabeça inclinada continua a rolagem (pedido do produto), o que combina com a jornada contínua da floresta | Uma seção por gesto (1ª versão); rolagem proporcional sem "segurar"; inclinação estimada só por landmarks 2D |
| ADR-18 | **Jornada pela floresta**: as 5 seções de conteúdo viram capítulos de uma única cena (`ForestScene`) num palco sticky; scroll → objeto mutável `journey` → `SceneController` (planos por capítulo + mola) | Uma cena contínua, zero re-render no scroll, seções e IDs preservados | Uma cena por seção; GSAP/ScrollTrigger já nesta etapa (ver [forest-journey.md](./forest-journey.md)) |
| ADR-19 | Dois canvases (hero e floresta), nunca renderizando juntos fora da transição | Desacopla câmera off-axis da câmera de scroll; simples | Um contexto com `View` do drei (evolução registrada) |

## Ciclo de vida da experiência

```
 load ─► cena estática (deriva lenta) ─► mouse controla a perspectiva
              │
              └─ clique "Ativar câmera" ─► permissão ─► carregar modelo ─► calibrar ─► rastreando
                                              │              │                          │   ▲
                                              ▼              ▼                          ▼   │
                                           negada        erro/sem câmera          rosto perdido
                                              └──────────────┴──► fallback: mouse    (volta ao neutro)
```

- Aba oculta: a câmera é liberada; ao voltar, o tracking retoma sozinho se estava ativo.
- Desmontagem: tracks da câmera parados, loop cancelado, landmarker fechado.

## Privacidade e segurança

- `getUserMedia` só depois de gesto do usuário. Exige contexto seguro (`localhost` ou HTTPS).
- Nenhum frame é armazenado, desenhado fora do modo debug ou enviado pela rede.
- Nenhuma requisição a domínios de terceiros em runtime (wasm e modelo são servidos pelo próprio site).

## Restrições de versão

| Pacote | Restrição | Motivo |
|---|---|---|
| `react`, `react-dom` | `~19.3` | Peer do R3F 9.8 |
| `three` | `^0.186` (equivale a `0.186.x`) | `0.x`: minors podem quebrar a API |
| `typescript` | `~6.0` | Versão do template oficial do Vite |
| Node | `>=22.12` | Vite 8 |

Detalhes: [scene-logic.md](./scene-logic.md) · [head-tracking.md](./head-tracking.md) · [folder-structure.md](./folder-structure.md)
