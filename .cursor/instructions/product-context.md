# Briefing: Contexto do Produto

> Resumo para o agente. Fonte da verdade: `docs/product/` ([vision](../../docs/product/vision.md), [scope](../../docs/product/scope.md), [roadmap](../../docs/product/roadmap.md)).

## O que é

Uma página web em que **a tela vira uma janela** para um vale fantástico de ilhas flutuantes. A webcam acompanha a cabeça do usuário (MediaPipe, 100% local) e a câmera 3D muda a perspectiva como numa janela real: o mundo atrás da moldura de selva se desloca junto com a cabeça. Sem câmera, o mouse faz o mesmo papel.

## O que importa (em ordem)

1. **Ilusão intacta:** nada de bordas reveladas, tremor parado ou saltos. Uma regressão aqui é bug crítico.
2. **Privacidade:** câmera só após clique, nada sai do navegador, sem requisições a terceiros.
3. **Degradação elegante:** webcam → mouse → cena estática. Erros viram mensagens calmas, nunca tela quebrada.
4. **Fluidez:** 60 fps em notebook moderno; MediaPipe carregado sob demanda.
5. **Acabamento:** respeitar a direção de arte ([briefing](./art-direction.md)).

## Fora do escopo (não implementar sem pedido)

Mobile/giroscópio, eixo Z, rotação da cabeça, áudio, múltiplas cenas, backend, analytics, gravação.

## Tom da interface

- Textos curtos, calmos e em **pt-BR** (decisão provisória, ver Q1 em `scope.md`).
- Sem jargão técnico fora do painel de debug. Diga "câmera", não "getUserMedia"; "rosto", não "landmarks".
- A cena é a protagonista: a UI fica discreta na parte de baixo da tela e some quando não é necessária.

## Como trabalhar neste projeto

- O trabalho acontece em **steps numerados**. Faça só o step pedido e termine com a lista de arquivos alterados, como rodar e o que foi verificado. Status dos steps: `docs/product/roadmap.md`.
- Na dúvida sobre escopo, pergunte em vez de expandir.
