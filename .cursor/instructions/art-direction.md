# Briefing: Direção de Arte

> Resumo para o agente. Fonte da verdade: [visual-direction.md](../../docs/art/visual-direction.md) · [asset-spec.md](../../docs/art/asset-spec.md) · [prompting-guide.md](../../docs/art/prompting-guide.md).

## A cena

Vista de dentro de um **arco de selva** (troncos com musgo, monsteras, samambaias, cipós) para um **vale de ilhas flutuantes de calcário** com cachoeiras, sobre um **lago turquesa**, ao **nascer do sol**. O sol fica à direita do centro, baixo, em (1210, 465) na imagem de 1672 × 941. Clima: **mágica serena**, contemplativa, nunca ameaçadora.

## Camadas (não altere sem passar pelo asset-spec)

| Arquivo | Conteúdo | Papel |
|---|---|---|
| `background/background.png` | Céu, sol, ilhas distantes (opaco) | Profundidade infinita; fonte de luz |
| `midground/midground.png` | Ilhas, cachoeiras, lago (alfa) | A cena principal |
| `foreground/foreground.png` | Moldura de selva + plantas bioluminescentes (alfa) | A janela; maior contraste |

Máscaras auxiliares em `masks/` (água, névoa, emissivo) e depth em `depth/`. Composto neutro: `concept/scene-reference-01.png`.

## Paleta-chave

Céu `#5FA1E6` → `#F6C9A8` / `#E8A9B8`, sol `#FDFBC8` · Lago `#4FB8CF` · Verdes `#1F7A4D`, `#5E8C3A` · Sombra da moldura `#13302A` · Acentos bioluminescentes `#4D49BB`, `#9440C4`, `#CD43A1` (só nos cantos inferiores, ≤ 5% da tela).

## Regras para qualquer efeito visual novo

- **Sutileza:** névoa, partículas e brilhos complementam a arte, não competem. Se a ilha herói ou o lago perderem leitura, está forte demais.
- **Luz coerente:** brilhos e partículas são quentes (dourado/pêssego) e vêm da direita, a direção do sol.
- **Cores:** sem tone mapping (`flat`), texturas de cor em sRGB, máscaras como dados (sem conversão de cor).
- **Nada de:** neon dominante, lens flare com streaks, bloom estourado, DOF forte, grão pesado, pessoas, texto na cena, referências a franquias.
