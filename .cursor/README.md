# Contexto do Cursor Agent

Como o contexto deste repositório está organizado para o Cursor e por que alguns formatos diferem do pedido original.

```
.cursor/
├── rules/                     restrições imperativas: o Cursor injeta conforme o frontmatter
│   ├── 00-project-overview.mdc    sempre ativa: o que é, fluxo em steps, mapa das fontes da verdade
│   ├── 10-code-style.mdc          glob: src/**/*.ts(x), scripts/**, vite.config.ts
│   ├── 20-r3f-scene.mdc           glob: src/features/scene/**
│   ├── 30-head-tracking.mdc       glob: src/features/headTracking/**, scripts/setup-mediapipe.ts
│   ├── 40-asset-pipeline.mdc      glob: public/assets/**, assets/**, docs/art/**
│   ├── 50-docs-and-context.mdc    glob: docs/**, .cursor/**, README.md
│   ├── 60-landing-page.mdc        glob: src/features/landing/**, index.html
│   └── 70-forest-journey.mdc      glob: src/features/forest/**, ForestJourney.tsx
├── instructions/              briefings curtos; entram em contexto via @ nas rules
│   ├── product-context.md · art-direction.md · architecture.md
│   └── implementation-plan.md · done-criteria.md
└── skills/                    procedimentos sob demanda (automáticos pela descrição ou via /nome)
    ├── image-generation/SKILL.md
    ├── scene-composition/SKILL.md
    ├── mediapipe-head-tracking/SKILL.md
    └── performance-optimization/SKILL.md
```

## Decisões de formato

| Pedido original | Formato adotado | Motivo |
|---|---|---|
| `.cursor/rules/*.mdc` | Mantido | Formato nativo: frontmatter `description`, `globs` (string separada por vírgulas), `alwaysApply`. Arquivos `.md` em `rules/` são **ignorados** pelo Cursor. |
| `.cursor/skills/<nome>.md` | `.cursor/skills/<nome>/SKILL.md` | O Cursor só descobre skills em **pastas** com `SKILL.md` (padrão Agent Skills). Frontmatter `name` (kebab-case) + `description`; `paths` limita a skill a arquivos. |
| `.cursor/instructions/*.md` | Mantido, **referenciado pelas rules** | O Cursor não carrega essa pasta sozinho. Cada briefing é citado com `@.cursor/instructions/...` numa rule, e o agente o lê quando a rule se aplica. |
| — | `50-docs-and-context.mdc` (extra) | Regra para manter docs e contexto sem duplicação e no formato certo |
| — | Sem `AGENTS.md` | A rule `00` (sempre ativa) cumpre o papel. Vale criar `AGENTS.md` se outros agentes (Codex etc.) forem usados. |

## Hierarquia de informação

1. **`docs/`**: fonte da verdade, detalhada, para humanos e agentes.
2. **`instructions/`**: resumo orientado à ação + links para `docs/`.
3. **`rules/`**: o que **sempre/nunca** fazer em cada área, curto.
4. **`skills/`**: como executar tarefas recorrentes passo a passo.

Ao mudar uma decisão: atualize `docs/` → ajuste o briefing → ajuste a rule, se a restrição mudou.
