# Inventário de Seções da Landing Page

> **Status: APROVADO (2026-10-11)** com os padrões D1–D9. Plano geral: [landing-page-plan.md](./landing-page-plan.md).
> Textos marcados **(rascunho)** são sugestões para revisão, não conteúdo final. Marque uma seção como ✅ só quando os [critérios de aceite](../qa/landing-page-acceptance-criteria.md) forem atendidos.

> **D11 (2026-10-11):** as seções 03–07 agora são os **capítulos da jornada pela floresta** (uma cena compartilhada, câmera conduzida pelo scroll; ver [forest-journey.md](../engineering/forest-journey.md)). As propostas visuais individuais abaixo (ex.: CSS 3D na 04, faixa horizontal na 06) ficam como referência de objetivo e conteúdo, não de layout.

> **Conteúdo implementado (2026-10-12):** as seções 03–07 são painéis translúcidos sobre a floresta, alternando de lado. Os textos estão em `src/features/landing/config/landingContent.ts` (fonte única); os números da seção 04 são calculados do `sceneConfig`. Mudanças em relação aos rascunhos abaixo:
>
> - **04:** passos (olhos → ponto no espaço → projeção) + as três profundidades com barras.
> - **05:** 6 cards em vez de 4 (+ navegar com a cabeça, passear pela floresta, movimento reduzido).
> - **06:** 4 imagens reais em `public/assets/landing/` (referência, camadas, máscaras e um quadro da floresta).
> - **07:** dicas de uso da câmera.
>
> **Hero novo (2026-10-12):** em "Como funciona", as camadas agora são moldura, vale e céu ao pôr do sol. Bastidores mostra 3 imagens geradas da arte atual: as camadas, a janela montada e a floresta. A referência e as máscaras da arte antiga saíram.
>
> Tudo descreve funções existentes no projeto. Falta só a sua revisão de redação para virar ✅.
>
> **Perguntas e Créditos (2026-10-12):** duas seções novas antes do rodapé, capítulos 6 e 7 da jornada. A câmera contorna a cabana e entra pela janela esquerda (ver [forest-journey.md](../engineering/forest-journey.md#entrada-pela-janela)). O rodapé passou de 08 a 10.

## Resumo

| # | Seção | ID | Status |
|---|---|---|---|
| 01 | Header (global) | (sem ID; *skip link* → `#conteudo`) | ✅ Implementado (L1) |
| 02 | Hero: a janela | `inicio` | ✅ Adaptado à página (L1); texto em rascunho aprovado |
| 03 | Manifesto / introdução | `manifesto` | 🟨 Implementado; texto aguarda revisão |
| 04 | Como funciona | `como-funciona` | 🟨 Implementado; texto aguarda revisão |
| 05 | Recursos | `recursos` | 🟨 Implementado (6 cards); texto aguarda revisão |
| 06 | Bastidores (showcase) | `bastidores` | 🟨 Implementado; texto aguarda revisão |
| 07 | CTA final | `experimente` | 🟨 Implementado; texto aguarda revisão |
| 08 | Perguntas (FAQ) | `perguntas` | 🟨 Implementado; texto aguarda revisão |
| 09 | Créditos | `creditos` | 🟨 Implementado; texto aguarda revisão |
| 10 | Rodapé | `rodape` | 🟨 Estrutura implementada (L1); refinamento pendente |

Legenda: 🔲 slot reservado (âncora real, conteúdo pendente) · 🟨 aprovada / parcial · ✅ implementada e aceita.

---

## 01 · Header

- **Objetivo:** orientar e oferecer o CTA sem roubar a cena.
- **Conteúdo:** wordmark + símbolo (D3) → `#inicio`; links: Manifesto, Como funciona, Recursos, Bastidores; botão **Ativar câmera**.
- **Comportamento:**
  - No topo: transparente, sobre um degradê escuro no alto do hero, para legibilidade sobre o céu claro.
  - Após ~80 px de rolagem: fundo sólido translúcido com *blur* e sombra.
  - Item ativo sublinhado conforme a seção visível.
- **Mobile (< 768 px):** logo + botão de menu; o menu abre em painel de tela cheia com os links e o CTA. Fecha com Esc, clique em link ou clique fora; foco preso enquanto aberto; o foco volta ao botão ao fechar.
- **Assets:** símbolo/wordmark em SVG (**falta**, D3); fontes (**faltam**, D8).
- **Movimento reduzido:** troca de estado sem transição.

## 02 · Hero (`#inicio`)

- **Objetivo:** a experiência. Em segundos a pessoa entende que a cena responde a ela.
- **Conteúdo (rascunho):**
  - `h1`: "Brasil."
  - Linha de apoio: "Mova a cabeça e o vale responde. Sem óculos, sem instalar nada: só a sua câmera, e o vídeo nunca sai do seu navegador."
  - O prompt da câmera atual (Ativar câmera / estados / Recentralizar / Desligar) fica **dentro do hero**.
  - Indicador de rolagem discreto.
- **Layout:**
  ```
  ┌───────────────────── cena 3D (100svh) ─────────────────────┐
  │ [header transparente]                                      │
  │                                                            │
  │                     (vale, protagonista)                   │
  │                                                            │
  │   Brasil.                                     │
  │   Mova a cabeça e o vale responde…        ┌──────────────┐ │
  │                                           │ prompt câmera│ │
  │                       ⌄                   └──────────────┘ │
  └──────────────────── degradê para a página ─────────────────┘
  ```
  O texto fica sobre a base escura (musgo e rochas), com *scrim* sutil. Quando o tracking está estável, o texto esmaece junto com o prompt (modo discreto já existente).
- **Interações:** cabeça (webcam) ou ponteiro **sobre o hero** controlam a perspectiva. Fora do hero, o ponteiro não move a cena.
- **Assets:** todos existem (camadas WebP, máscara emissiva, MediaPipe).
- **Já implementado:** cena, tracking, fallback, estados. **Falta:** adaptar à página (rolagem, canvas pausando fora da tela, D6, ponteiro restrito ao hero, prompt e texto posicionados no hero).

## 03 · Manifesto / introdução (`#manifesto`)

- **Objetivo:** dar sentido ao que a pessoa acabou de sentir.
- **Conteúdo (rascunho):**
  - `h2`: "Interfaces que respondem ao corpo"
  - Parágrafo: "Quase toda experiência 3D na web pede clique, arraste ou rolagem. Aqui não há o que aprender: você se move como se move diante de uma janela de verdade, e a perspectiva acompanha. É a mesma física da paralaxe que seus olhos usam o dia inteiro, trazida para a tela."
  - Frase de destaque: "Nenhum gesto para aprender. Só olhar."
- **Layout:** coluna estreita (~60ch), tipografia grande; frase de destaque em serifa display, em largura total. Diferente do hero: sem imagem, só tipografia e respiro.
- **Interações:** *fade-up* ao entrar na tela.
- **Assets:** nenhum além das fontes.

## 04 · Como funciona (`#como-funciona`): seção visual interativa

- **Objetivo:** mostrar a técnica de forma visual: a cena são **três pinturas em profundidades diferentes**.
- **Conteúdo (rascunho):**
  - `h2`: "Três camadas, uma janela"
  - Legendas por camada:
    - **Moldura**, no plano da tela: "a janela, parada como o vidro"
    - **Ilhas**, 4,7 alturas de tela atrás: "se movem 65% do seu movimento"
    - **Céu**, 50 alturas atrás: "quase infinito, se move 95%"
  - Nota curta: "Seu rosto vira um ponto no espaço; a câmera 3D se coloca nesse ponto."
- **Interação principal:** seção "presa" (*sticky*, ~250 vh de rolagem).
  - Começa com as 3 camadas compostas, como no hero.
  - Conforme a rolagem, elas **se separam em perspectiva 3D** (CSS `transform`), com legendas entrando uma a uma.
  - No fim, recompõem.
  - Bônus opcional: leve inclinação seguindo o ponteiro.
- **Sem WebGL:** imagens `<img>` WebP + CSS 3D, sem segundo canvas.
- **Movimento reduzido / mobile:** diagrama estático (camadas separadas lado a lado em perspectiva, com legendas), sem *sticky*.
- **Assets:** camadas WebP (**existem**). Talvez versões menores, 960 px, para esta seção (**faltam**, derivação simples).

## 05 · Recursos (`#recursos`)

- **Objetivo:** responder "e se eu…?" com fatos verificáveis do projeto (D5).
- **Conteúdo (rascunho), 4 cards:**

  | Título | Texto |
  |---|---|
  | Privado por desenho | "O rastreamento roda no seu navegador. Nenhum frame é gravado ou enviado; a câmera só liga quando você pede." |
  | Uma janela de verdade | "Projeção fora do eixo, a mesma de simuladores e da realidade virtual: a perspectiva se ajusta à posição dos seus olhos." |
  | Arte em camadas | "Uma pintura digital separada em profundidades, com névoa, luz e pólen que vivem entre elas." |
  | Funciona sem câmera | "Sem permissão ou sem webcam, o mouse assume. A cena nunca para." |

- **Layout:** grade 4×1 (desktop), 2×2 (tablet), 1 coluna (mobile); ícones SVG lineares simples. Ritmo diferente da seção 04: estática e informativa.
- **Interações:** entrada escalonada (*stagger*) curta; sem *hover* chamativo.
- **Assets:** 4 ícones SVG inline (**faltam**, simples, desenhados no código).

## 06 · Bastidores (`#bastidores`): showcase

- **Objetivo:** mostrar o processo com os **assets reais**: da referência à cena viva.
- **Conteúdo (rascunho):**
  - `h2`: "Da pintura à profundidade"
  - Etapas com imagem + legenda:
    1. **Referência**: `concept/scene-reference-01`, a composição aprovada.
    2. **Camadas**: as 3 camadas lado a lado sobre fundo escuro, mostrando a transparência.
    3. **Máscaras**: água, névoa e brilho (`masks/*`) como "radiografias" em monocromático.
    4. **Cena viva**: um *still* do hero com efeitos ligados e o link "Ver ao vivo ↑" para `#inicio`.
- **Layout:** faixa horizontal com *scroll-snap* (desktop) ou empilhada (mobile). Diferente da 04 (vertical/3D) e da 05 (grade).
- **Interações:** *snap* + setas acessíveis por teclado; imagens `lazy`.
- **Assets:**
  - WebP da referência e das máscaras (**faltam**, derivação com `cwebp`).
  - *Still* do hero (**falta**, captura do render).
  - O resto **existe**.

## 07 · CTA final (`#experimente`)

- **Objetivo:** levar de volta à experiência (D2).
- **Conteúdo (rascunho):**
  - `h2`: "Volte à janela"
  - Linha: "Ative a câmera e mova a cabeça devagar. Ou use o mouse, se preferir."
  - Botão primário **Ativar câmera**: sobe ao hero e liga o tracking.
  - Botão secundário **Usar o mouse**: só sobe ao hero.
- **Layout:** faixa larga com recorte da cena (foreground escurecido) ao fundo, como uma "segunda janela" estática; texto centralizado.
- **Interações:** o clique do CTA primário chama `start()` no mesmo gesto (a permissão exige gesto do usuário) e rola até o hero.
- **Assets:** recorte do foreground (**existe**: `foreground.webp`).

## 08 · Perguntas (`#perguntas`)

- **Objetivo:** responder às dúvidas práticas antes de a pessoa sair da página.
- **Conteúdo:** seis perguntas, cada resposta um fato do projeto: instalação, privacidade do vídeo, celular, recentralizar, tempo de carregamento da floresta e teclado.
- **Layout:** painel à esquerda; `<details>` nativos, um aberto por vez (`name="faq"`), o primeiro aberto. O painel fica baixo para a janela da cabana aparecer ao lado.
- **Câmera:** diante da parede esquerda da cabana, com o cômodo iluminado visível pela janela.

## 09 · Créditos (`#creditos`)

- **Objetivo:** dar crédito a quem fez cada asset (CC0 não exige; é cortesia) e registrar a tecnologia.
- **Conteúdo:** os autores do `public/assets/forest/LICENSE.md` agrupados (floresta, cabana, terreiro, interior), a arte do hero (três pinturas digitais em camadas), bibliotecas e fontes.
- **Layout:** painel à esquerda, grupos em duas colunas (uma no celular).
- **Câmera:** dentro da cabana, depois de passar pela janela.

## 10 · Rodapé (`#rodape`)

- **Objetivo:** fechar com informação real (D9).
- **Conteúdo:**
  - Wordmark + descrição curta (rascunho): "Uma janela para um vale que não existe."
  - Âncoras da página.
  - Nota de privacidade: "processamento local, nada é gravado ou enviado".
  - Créditos de tecnologia: React Three Fiber, three.js, MediaPipe. Fatos.
  - © ano.
  - **Contato, redes e repositório: só com dados reais** (D9). Até lá, ficam fora, não como placeholder.
- **Layout:** 3 colunas (desktop) → empilhado (mobile); fundo `#0B0F14`.
- **Assets:** nenhum além do wordmark.

---

## Assets: o que existe e o que falta

| Asset | Status | Usado em |
|---|---|---|
| Camadas WebP (`background`, `midground`, `foreground`) | ✅ existe | 02, 04, 07 |
| Máscara emissiva | ✅ existe | 02 |
| Referência, máscaras de água e névoa (PNG) | ✅ existe, **falta WebP** | 06 |
| *Still* do hero com efeitos | ❌ falta (captura do render) | 06 |
| Camadas em 960 px para a seção 04 | ❌ falta (derivação) | 04 |
| Wordmark + símbolo SVG | ❌ falta (D3) | 01, 08 |
| Fontes woff2 auto-hospedadas | ❌ falta (D8) | todas |
| Ícones SVG dos recursos | ❌ falta (desenho simples) | 05 |
| Imagem de compartilhamento (Open Graph, 1200×630) | ❌ falta (recorte da referência) | `<head>` |

Nenhum asset novo exige geração de imagem: todos derivam da arte existente, salvo o símbolo do logo (D3).
