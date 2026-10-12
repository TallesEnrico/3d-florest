# Auditoria: Step 8

Revisão de estrutura, nomes, duplicações, documentação, pontos de configuração, contexto do Cursor e aderência ao objetivo. Inclui revisão independente de código (agente revisor) e testes ponta a ponta no Chrome headless.

## O que foi validado automaticamente

| Verificação | Como | Resultado |
|---|---|---|
| Tipos, lint, build | `bun run typecheck` · `bun run lint` · `bun run build` | Sem erros nem avisos de lint |
| Neutro = referência (fg + mid) | Screenshot via CDP em `?view=0,0` vs `scene-reference-01.png` | Correlação de bordas 0,987 no deslocamento zero |
| Moldura parada, mundo se move | Diff da região sólida do foreground nos 4 cantos | 0,00 na moldura; ~40/255 atrás dela |
| Nenhuma borda revelada | Cantos `?view=±1,±1` em 16:9, 4:3, 21:9 | Nenhuma faixa ou borda |
| Tracking real | Webcam falsa (`.y4m` com rosto em movimento) | `calibrating → tracking`, offset acompanha, parado = +0,00 |
| Fallbacks | Permissão negada · sem câmera | `denied` / `unavailable` + mouse + "Tentar de novo" |
| Ciclo de vida | Aba oculta/visível, track `ended`, retry, desligar | Câmera liberada (0 `<video>`), retomada automática, fallback correto |
| Recalibrar | Clique durante o tracking | Novo neutro em ~0,5 s |
| Privacidade | Requisições de rede durante o uso | Zero domínios de terceiros |
| Chunk do MediaPipe | Saída do build | `vision_bundle` separado (154 kB / 45 kB gzip) |
| Funções puras | Testes ad hoc (Bun) | Mediana robusta, zona morta, sinais, `softLimit` 0,93, One Euro, mola sem overshoot e independente de fps |
| Regressão visual da refatoração | Diff de render step 7 × step 8 | 0,04/255 |

## Problemas encontrados e corrigidos

| # | Severidade | Problema | Correção |
|---|---|---|---|
| 1 | Média | Religar a câmera durante o carregamento do modelo criava um 2º FaceLandmarker (vazamento de wasm/WebGL) | Promessa de carga compartilhada (`loadTracker`) |
| 2 | Média | Câmera desconectada ou revogada deixava o status preso em `tracking`, com o mouse ignorado | Listener `ended` nas tracks → `unavailable` + mouse |
| 3 | Média | Voltar à aba com o pedido de permissão pendente deixava a tela sem botão e o mouse ignorado | Aba oculta devolve o controle ao mouse; `requesting` ganhou "Cancelar" |
| 4 | Baixa | Permissão concedida com a aba oculta deixava o LED aceso em segundo plano | Cancelamento do início em andamento + fechar stream se `document.hidden` |
| 5 | Baixa | "Tentar de novo" reusava um landmarker quebrado | Landmarker descartado quando `detect()` falha |
| 6 | Baixa | `PerformanceMonitor` podia alternar o DPR indefinidamente | `flipflops={3}` + `onFallback` → DPR 1 |
| 7 | Baixa | `smoothstep` com bordas invertidas (indefinido pela spec GLSL ES) | `1.0 − smoothstep(a, b, x)` |
| 8 | Docs | 6 afirmações desatualizadas (overscan do midground, `damping`, "idêntico à referência", plano de implementação) | Corrigidas; ADR-05 revisto, ADR-11 a 13 adicionados |
| 9 | Duplicação | Vertex shader idêntico em 3 arquivos; cálculo de cover em 4 componentes | `utils/shaders.ts` e `hooks/useViewCover.ts` |

## Pontos fortes (manter)

- Fronteira clara entre `scene` e `headTracking`, ligadas só pelo `App` via `getViewInput`.
- Toda a afinação em dois arquivos (`sceneConfig.ts`, `trackingConfig.ts`), com unidade e efeito comentados.
- Limites de movimento calculados (a borda nunca aparece por construção) e medidos onde a geometria seria conservadora demais.
- Privacidade verificável: opt-in por clique, auto-hospedagem, nenhuma requisição externa.

## Pendências conhecidas

Ver [roadmap → Checklist de melhorias futuras](../product/roadmap.md#checklist-de-melhorias-futuras). As principais:

- **Validação manual em hardware real** (webcam física, GPU real, Safari/Firefox): ver o checklist de validação no fim da resposta do step 8 e [testing-checklist.md](./testing-checklist.md).
- Sem testes automatizados versionados: os scripts de validação desta auditoria rodaram fora do repositório.
- Sem repositório git inicializado.
- `public/assets/environment` publica os PNG master e derivados que não são carregados em runtime (~11 MB a mais no deploy, não baixados pelo usuário).
- Nome `headTracking` cobre também o mouse. Avaliado e mantido: renomear para `viewerInput` não compensa agora.
