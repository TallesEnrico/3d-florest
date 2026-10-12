# Briefing: Critério de Pronto (Definition of Done)

Vale para **qualquer** tarefa do agente neste repositório. Critérios de produto ficam em [acceptance-criteria.md](../../docs/qa/acceptance-criteria.md).

## Antes de dizer "pronto"

1. **Comandos verdes:** `bun run typecheck`, `bun run lint` e `bun run build` sem erros. Se algum falhar, diga qual e por quê. Não esconda falhas.
2. **Rodou de verdade:** para mudanças visuais ou de interação, abra a página (`bun run dev`) e verifique. Typecheck não prova que a cena renderiza.
3. **Sem regressão da ilusão:** nenhuma borda revelada nos extremos do movimento; o neutro continua igual à referência.
4. **Escopo:** só o que foi pedido no step. Mudanças oportunistas fora do escopo ficam como sugestão, não como código.
5. **Configuração centralizada:** números novos de ajuste vão para `sceneConfig.ts` ou `trackingConfig.ts`, com comentário de unidade e efeito.
6. **Docs atualizadas:** comportamento, arquitetura ou ajustes mudaram → atualize a seção correspondente em `docs/` e o status em `docs/product/roadmap.md`.
7. **Recursos liberados:** tudo que abre câmera, loop, listener ou contexto tem limpeza no unmount.
8. **Sem dependência nova** sem justificativa explícita.

## Formato da resposta final

- O que foi feito (curto) e decisões tomadas, com o porquê
- Lista de arquivos criados e alterados
- Como rodar e o que foi verificado (comandos + verificação manual)
- O que ficou pendente ou é limitação conhecida
- **Não** iniciar o próximo step
