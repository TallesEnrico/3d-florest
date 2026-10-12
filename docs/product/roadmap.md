# Roadmap

O projeto avança em **steps numerados**, um por vez, com revisão entre eles. Esta é a fonte da verdade do status. O detalhamento técnico está em [.cursor/instructions/implementation-plan.md](../../.cursor/instructions/implementation-plan.md).

## Steps

| Step | Entrega | Status |
|---|---|---|
| 1 | Direção de arte ([visual-direction.md](../art/visual-direction.md), [prompting-guide.md](../art/prompting-guide.md)) | ✅ |
| 2 | Camadas 2.5D tratadas para paralaxe ([asset-spec.md](../art/asset-spec.md), `public/assets/environment/`) | ✅ |
| 3 | Scaffold técnico: Bun + Vite 8 + React 19.3 + TS 6 + R3F 9 | ✅ |
| 4 | Contexto para agentes: `.cursor/` (rules, instructions, skills), `docs/product`, `docs/engineering`, `docs/qa` | ✅ |
| 5 | Cena 2.5D em camadas: canvas fullscreen, 3 camadas em profundidade, câmera off-axis, névoa leve, pronta para receber tracking | ✅ |
| 6 | Head tracking: webcam + MediaPipe Face Landmarker, calibração, suavização, limites, fallback para mouse, painel de debug | ✅ |
| 7 | Refinamento: suavização, transições de estado, composição, partículas sutis, performance, acessibilidade, mensagens | ✅ |
| 8 | Auditoria final: estrutura, nomenclatura, documentação, contexto do Cursor, prontidão para demo ([relatório](../qa/audit-step-8.md)) | ✅ |
| — | **Landing page**: [plano](./landing-page-plan.md), [inventário](./section-inventory.md), [arquitetura](../engineering/landing-page-architecture.md), [critérios](../qa/landing-page-acceptance-criteria.md) | ✅ Aprovada |
| L1 | Landing: estrutura global (layout, header, menus, rodapé, hero adaptado, slots das seções) | ✅ |
| N1 | Navegar com a cabeça: inclinação + gesto "inclinar e segurar" para mudar de seção (D10) | ✅ |
| C1 | Jornada cinematográfica, Etapa 1: arquitetura da cena compartilhada (`ForestScene`, `SceneController`, scroll → câmera, camada de parallax) com floresta provisória ([forest-journey.md](../engineering/forest-journey.md)) | ✅ |
| C2 | Floresta procedural: coníferas naturais instanciadas (abetos, pinheiros, jovens, secas), chão com relevo e vegetação, névoa gradual, luz e clareira no fim da trilha; paralaxe do mouse e caminhos por duplo clique | ✅ |
| C3 | Floresta fotorrealista: abetos, samambaias, pedras, troncos e solo escaneados (Poly Haven, CC0), HDRI, sombras do sol, LOD por instância, qualidade adaptativa | ✅ |
| C4 | Rio entre os capítulos 3 e 4 (pedras de travessia) e cabana de toras na clareira final, que surge da névoa conforme a câmera se aproxima e está 100% visível ao chegar no rio, com fogueira acesa; luz da floresta na paleta do hero | ✅ |
| L2–L7 | Landing: seções 03 a 07 como capítulos da jornada, com conteúdo factual (status no [inventário](./section-inventory.md)) | 🟨 Implementadas; texto em revisão |
| L8 | Landing: revisão integrada | — |

## Checklist de melhorias futuras

Evolução técnica detalhada (depth map, shaders, ambiente 3D real): [evolution.md](../engineering/evolution.md).

**Produto e UX**
- [ ] Deploy em HTTPS (a webcam exige contexto seguro fora de `localhost`)
- [ ] Decidir idioma e nome público (Q1, Q2 em [scope.md](./scope.md))
- [ ] Onboarding visual curto (ilustração de "mova a cabeça") na primeira visita
- [ ] Indicador de progresso da calibração

**Cena e arte**
- [ ] Upscale 2–3× das camadas + entrega em KTX2 ([asset-spec §5](../art/asset-spec.md#5-transparência-limitações-e-contornos))
- [ ] Regerar o midground sem o céu pintado entre as ilhas
- [ ] Eixo Z (aproximar a cabeça amplia a janela) com overscan próprio ([scene-logic](../engineering/scene-logic.md#eixo-z-aproximação))
- [ ] Shaders com as máscaras existentes: água e névoa do midground ([evolution §2](../engineering/evolution.md#2-shaders-vida-na-pintura))
- [ ] Depth map por camada para relevo interno ([evolution §1](../engineering/evolution.md#1-depth-map-relevo-dentro-de-cada-camada))
- [ ] Máscaras novas: cachoeiras e cipós

**Engenharia**
- [ ] Scripts de tratamento de arte em `scripts/art/` (hoje o step 2 está só documentado)
- [ ] Testes automatizados: unitários das funções puras (`projection`, `calibration`, `smoothDamp`, `oneEuroFilter`) e e2e com webcam falsa (Playwright)
- [ ] three.js em chunk próprio; MediaPipe em Web Worker se a inferência pesar ([performance.md](../engineering/performance.md#próximas-otimizações-por-impacto))
- [ ] Medir fps e inferência em GPU real e em máquina modesta
