# Critérios de Aceite: Landing Page

> **Status: APROVADO (2026-10-11)** com os padrões D1–D9. Complementa os [critérios do MVP](./acceptance-criteria.md), que continuam valendo para o hero.
> Uma seção só vira ✅ no [inventário](../product/section-inventory.md) quando os critérios globais (LP-G) e os dela (LP-S) passam.

## Globais (valem para a página toda)

| ID | Critério |
|---|---|
| LP-G1 | As seções aparecem na ordem 02 → 08 do inventário, sem seção duplicada nem espaço vazio inesperado |
| LP-G2 | Todo link interno aponta para um `id` que existe na página (garantido por `SectionId` + verificação manual) |
| LP-G3 | Header: transparente no topo e sólido após rolar; item ativo correto; CTA funcional |
| LP-G4 | Menu mobile abre e fecha (botão, Esc, clique em link e fora), prende o foco e devolve o foco ao botão |
| LP-G5 | Navegação completa por teclado: *skip link* → header → seções → rodapé, com foco visível |
| LP-G6 | Hierarquia: um `h1` (hero) e um `h2` por seção; landmarks `header`, `nav`, `main`, `footer` |
| LP-G7 | Responsivo em 360, 768, 1024, 1440 e 1920 px de largura, **sem rolagem horizontal** |
| LP-G8 | `prefers-reduced-motion`: sem rolagem suave, sem animações de entrada, seção 04 estática; o hero segue o AC-A3 |
| LP-G9 | Contraste AA em todo texto (incluindo o header transparente sobre o céu) |
| LP-G10 | Nenhum conteúdo fictício apresentado como final (textos aprovados; dados de negócio com fonte real) |
| LP-G11 | `bun run typecheck`, `lint` e `build` sem erros; console sem erros novos |

## Hero e head tracking (regressão)

| ID | Critério |
|---|---|
| LP-H1 | Todos os critérios AC-T*, AC-P* e AC-X* do MVP continuam passando dentro da página |
| LP-H2 | O ponteiro só move a cena quando está **sobre o hero** |
| LP-H3 | Fora do hero: o canvas do hero para de renderizar; com a câmera ligada, a detecção continua e a cabeça move a câmera da floresta, mesmo com o mouse parado sobre ela (D6, revista em 2026-10-12). Rolagem a 60 fps com a câmera ligada (`scroll-audit.ts --vsync --camera=rosto.y4m`) |
| LP-H4 | O CTA do header e o da seção 07 ligam a câmera no mesmo clique e rolam até o hero |
| LP-H5 | Câmera negada: a página inteira continua utilizável, com o mouse no hero |
| LP-H6 | Rolar a página com a cena ativa é fluido (sem *jank* perceptível; o canvas não captura a roda) |
| LP-H7 | Ao rolar, o hero tem parallax: a moldura acompanha a página, as ilhas e o céu ficam progressivamente para trás; nenhuma borda aparece; desligado com `prefers-reduced-motion` |

## Navegar com a cabeça (D10)

| ID | Critério |
|---|---|
| LP-N1 | O modo só liga por ação explícita (botão no prompt do hero); o trilho lateral aparece enquanto está ligado |
| LP-N2 | Inclinar a cabeça para baixo e segurar ~0,5 s começa a rolar para baixo; para cima, para cima. **Mantendo a cabeça inclinada, a rolagem continua** (mais rápida com mais inclinação); voltando ao centro, para |
| LP-N3 | Movimentos naturais (acenar, ler, pequenas inclinações) não iniciam a rolagem; a rolagem é suave (sem saltos) |
| LP-N4 | Com o modo ligado, a rolagem pela cabeça funciona na página toda, inclusive na floresta; desligar o modo mantém a câmera ligada (só para de rolar) |
| LP-N5 | O destino de cada gesto é anunciado a leitores de tela; o modo tem botão de desligar acessível por teclado |

## Jornada pela floresta (D11)

| ID | Critério |
|---|---|
| LP-J1 | Os capítulos (03–09) compartilham uma única cena; seções, ids e textos inalterados |
| LP-J2 | Com um capítulo centralizado, a câmera está no plano dele (`--chapter-progress` ≈ 0,5); entre capítulos, a câmera viaja sem saltos |
| LP-J3 | O canvas da floresta só existe a até uma tela de distância e não renderiza fora da viewport |
| LP-J4 | O palco termina com o último capítulo (não cobre o rodapé); âncoras do header continuam funcionando |
| LP-J5 | Na entrada pela janela (Perguntas → Créditos), a câmera passa pelo vão sem atravessar paredes nem a moldura, em qualquer caminho e com a paralaxe no máximo |

## Por seção

| ID | Seção | Critério |
|---|---|---|
| LP-S03 | Manifesto | Texto aprovado; leitura confortável (≤ 70 caracteres por linha); entrada suave e não bloqueante |
| LP-S04 | Como funciona | Passos do rastreamento e as 3 profundidades com valores calculados do `sceneConfig` (0%, 65%, 95%); legível sobre a floresta; **nenhum canvas extra** (a separação em CSS 3D do plano original foi substituída pela jornada, D11) |
| LP-S05 | Recursos | 6 cards com conteúdo verificável; grade 3 → 2 → 1 coluna; ícones com `aria-hidden` e texto acessível |
| LP-S06 | Bastidores | Imagens reais do projeto, `lazy`, WebP, com `width/height` (CLS < 0,1); navegável por teclado; legendas corretas |
| LP-S07 | CTA final | Primário liga a câmera e sobe ao hero; secundário só sobe; ambos com rótulos claros |
| LP-S08 | Rodapé | Só informações reais; âncoras válidas; nota de privacidade presente |

## Performance

| ID | Critério |
|---|---|
| LP-F1 | No máximo dois contextos WebGL: o do hero e **um** compartilhado pela jornada da floresta (D11). Fora da transição hero → capítulo 1, só um renderiza por vez; nenhuma seção cria canvas próprio |
| LP-F2 | MediaPipe (JS, wasm, modelo) só é requisitado após clicar em um CTA de câmera |
| LP-F3 | LCP < 2,5 s (desktop, conexão rápida); CLS < 0,1 |
| LP-F4 | Imagens abaixo da dobra só carregam perto da viewport |
| LP-F5 | Fontes ≤ 120 kB no total, auto-hospedadas |
| LP-F6 | Sem listeners vazando: abrir e fechar o menu 10× e rolar a página inteira 5× não aumenta listeners nem memória |

## Privacidade

| ID | Critério |
|---|---|
| LP-X1 | Nenhuma requisição a domínios de terceiros (inclui fontes, ícones e analytics) |
| LP-X2 | A câmera nunca liga sem clique explícito em um CTA de câmera |
