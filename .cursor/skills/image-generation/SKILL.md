---
name: image-generation
description: Gerar, substituir ou tratar imagens do ambiente (camadas background/midground/foreground, variações de conceito, upscale) mantendo a direção de arte e as regras de transparência para paralaxe. Use quando a tarefa envolver criar prompts de imagem, receber imagens novas em assets/ ou atualizar public/assets/environment/.
---

# Gerar e tratar imagens do ambiente

## Antes de começar

Leia: `docs/art/visual-direction.md` (estética), `docs/art/prompting-guide.md` (prompt mestre v2, templates, log) e `docs/art/asset-spec.md` (formato e tratamento).

## 1. Definir o que muda

| Pedido | Saída |
|---|---|
| Variação de conceito | Fora do projeto (só os WebP de entrega ficam em `public/`) |
| Trocar uma camada | Master PNG fora do projeto → `public/assets/environment/<camada>/<camada>.webp` |
| Upscale | As 3 camadas na mesma escala (2× ou 3×), mantendo o alinhamento |

## 2. Prompt

- Comece pelo **prompt mestre v2** (prompting-guide §3). Para uma camada isolada, use o template da camada + o sufixo de consistência (§6).
- Altere **um bloco por vez** (§2) e não cite franquias, artistas ou filmes.
- Formato 16:9, sol à direita do centro e baixo, foco nítido em tudo, sem pessoas ou texto.

## 3. Gerar

- **Este ambiente não tem gerador de imagem configurado.** Se nenhuma ferramenta de imagem estiver disponível, entregue ao usuário o prompt final, a ferramenta sugerida e o nome de arquivo esperado em `assets/`, e pare.
- Transparência, por ordem de preferência (§6): cena completa + matting/segmentação → fundo transparente nativo → chroma (foreground em ciano `#00FFFF`, midground em magenta `#FF00FF`). Nunca verde chroma no foreground.

## 4. Tratar (asset-spec §2)

As fontes ficam em `assets/` (intocadas). Aplique em cópias:

| Etapa | Camadas | Parâmetros |
|---|---|---|
| Remapear alfa | mid, fg | `a' = clamp((a − 16/255) / (245/255 − 16/255))` |
| Remover partículas | mid, fg | componentes conectados com < 24 px |
| Suavizar névoa | mid | faixa de 56 px do recorte; só pixels claros, dessaturados e de baixo detalhe acima de y = 760; ilhas isoladas (< 30 000 px) protegidas |
| Estender o lago | mid | espelhar a água abaixo da borda onde o fg não cobre com 120 px de folga |
| *Edge padding* | mid, fg | RGB das áreas com alfa 0 = cor do pixel sólido mais próximo (+ blur 2 px) |

> Esse tratamento ainda não tem script versionado. Se precisar repetir, proponha criar `scripts/art/process-layers.ts` (Bun) e peça confirmação antes.

## 5. Derivados

Gere o WebP de entrega de cada camada alterada (`cwebp -q 90 -alpha_q 100 -exact -sharp_yuv -m 6 <camada>.png -o <camada>.webp`) a partir do master, que fica fora do projeto. Máscaras, mapa de profundidade e referência só se uma feature voltar a usá-los (os da arte anterior estão no commit `e8aee56`).

## 6. Validar

- [ ] Checklist do prompting-guide §8 e do asset-spec §10
- [ ] `bun run dev`: o neutro bate com a referência; nos 4 extremos do movimento nenhuma borda aparece (16:9 e 4:3)
- [ ] Linha nova no log (prompting-guide §9): data, asset, ferramenta, prompt e notas
