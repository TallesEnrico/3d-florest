# Arquitetura da Landing Page

> **Status: APROVADO (2026-10-11)** com os padrões D1–D9. Produto: [landing-page-plan.md](../product/landing-page-plan.md) · Seções: [section-inventory.md](../product/section-inventory.md).
> Mantém as invariantes de [architecture.md](./architecture.md): fronteira `scene` ↔ `headTracking`, nada por frame no React, um único canvas.

## 1. Árvore de componentes

```
App (src/app/App.tsx)
└─ SiteLayout                      skip link · <header> · <main id="conteudo"> · <footer>
   ├─ SiteHeader                   estado transparente/sólido, item ativo
   │  ├─ DesktopNavigation         ≥ 768 px
   │  └─ MobileNavigation          < 768 px: botão + painel (diálogo acessível)
   ├─ <main>
   │  ├─ HeroSection        #inicio          SceneCanvas + HeadTrackingController (já existem)
   │  ├─ ManifestoSection   #manifesto
   │  ├─ HowItWorksSection  #como-funciona   camadas em CSS 3D (sem WebGL)
   │  ├─ FeaturesSection    #recursos
   │  ├─ ShowcaseSection    #bastidores
   │  ├─ FinalCtaSection    #experimente
   │  ├─ FaqSection         #perguntas
   │  └─ CreditsSection     #creditos
   └─ SiteFooter            #rodape
```

`SectionContainer` (opcional, só se repetir em ≥ 3 seções): `<section id aria-labelledby>` + largura máxima + espaçamento vertical padrão.

## 2. Pastas (nova feature `landing`)

```
src/features/landing/
├── components/      SiteLayout, SiteHeader, DesktopNavigation, MobileNavigation, SiteFooter, SectionContainer
├── sections/        HeroSection, ManifestoSection, HowItWorksSection, FeaturesSection, ShowcaseSection, FinalCtaSection
├── config/
│   └── landingContent.ts   ÚNICA fonte de seções (id, rótulo de navegação, ordem) e textos
├── hooks/           useActiveSection (IntersectionObserver), useScrolledPast, useInView
└── styles/          tokens.css (cores, tipografia, espaços), landing.css
```

- `landing` pode importar `scene` e `headTracking` (é composição de página). `scene` e `headTracking` **não** importam `landing`.
- O `App` passa a renderizar `SiteLayout`. O hero recebe o mesmo `getViewInput` de hoje.

### Fonte única de seções

```ts
// landingContent.ts (forma proposta)
export const sections = [
  { id: 'inicio', nav: null },              // logo aponta aqui
  { id: 'manifesto', nav: 'Manifesto' },
  { id: 'como-funciona', nav: 'Como funciona' },
  { id: 'recursos', nav: 'Recursos' },
  { id: 'bastidores', nav: 'Bastidores' },
  { id: 'experimente', nav: null },
  { id: 'perguntas', nav: null },
  { id: 'creditos', nav: null },
] as const
export type SectionId = (typeof sections)[number]['id']
```

Menu, rodapé e o `id` de cada `<section>` usam `SectionId`. Um link para uma seção inexistente vira **erro de TypeScript**.

## 3. Mudanças no código existente

| Onde | Hoje | Na landing | Por quê |
|---|---|---|---|
| `src/index.css` | `overflow: hidden` em html/body/#root; `user-select: none` | Rolagem normal; seleção de texto liberada (exceto no hero) | É uma página |
| `.scene` | `position: fixed; inset: 0` | `position: absolute` dentro do hero (100svh) | A cena é a primeira seção, não um fundo fixo |
| `HeadTrackingPrompt` (CSS) | `position: fixed` na base da tela | Absoluto **dentro do hero** | Não pode flutuar sobre as outras seções |
| `useMouseFallback` | Escuta `pointermove` na janela | Escuta só o elemento do hero (`ref` passado pelo hero) | O ponteiro em outras seções não move a cena |
| `SceneCanvas` | `frameloop` sempre ativo | `frameloop="never"` quando o hero sai da tela (IntersectionObserver), volta para `always` ao reentrar | Zero GPU fora do hero |
| `useHeadTracking` | Libera a câmera com a aba oculta | Suporta `inView` (pausa e libera após 5 s fora), mas a landing mantém o tracking ligado na página toda (D6, revista em 2026-10-12) | A cabeça olha ao redor também na floresta |
| `HeadTrackingController` | Monta prompt + debug | Expõe `start()` para o CTA do header e da seção 07 | O CTA externo precisa ligar o tracking no mesmo gesto |
| `App` | `h1` oculto | `h1` visível no hero (texto do hero) | Hierarquia real de títulos |

Para expor `start()` sem *prop drilling* nem Context por frame: um pequeno módulo `headTracking/controls.ts` em que o controller registra `{ start, stop }` ao montar e o CTA chama `requestCamera()`. Alternativa: Context estável (só funções, sem re-render).

## 4. Comportamentos-chave

### Rolagem e âncoras
- `scroll-behavior: smooth` em `html`, desligado com `prefers-reduced-motion`.
- `scroll-margin-top` = altura do header em todas as `section[id]`.
- Os links do menu são `<a href="#id">` nativos (funcionam sem JS e com o histórico). O menu mobile fecha no clique.

### Header
- `useScrolledPast(80)`: sentinela + IntersectionObserver, sem listener de `scroll` → classe `site-header--solid`.
- `useActiveSection()`: IntersectionObserver com `rootMargin` centrado na tela → `aria-current="location"` no link ativo.

### Menu mobile
- Botão com `aria-expanded` / `aria-controls`. Painel como `<dialog>` modal nativo, que já entrega foco preso, Esc e `inert` no resto.
- Ao fechar, o foco volta ao botão. Bloqueio de rolagem do `body` enquanto aberto.

### CTA "Ativar câmera"
1. Chama `requestCamera()` **no mesmo handler do clique** (gesto do usuário).
2. Rola até `#inicio`.
3. Se o tracking já estiver ativo, só rola.

### Animações de entrada
- `useInView` (IntersectionObserver, dispara uma vez) adiciona `is-visible`; CSS faz *fade/translate* curtos (≤ 400 ms).
- Com `prefers-reduced-motion`: conteúdo já visível, sem transição.

### Seção 04 (CSS 3D)
- Contêiner `position: sticky` com `perspective`; 3 `<img>` com `transform: translateZ(...)` controlado por uma variável CSS `--progress` (0–1).
- `--progress` é calculado por um único `scroll` listener passivo + `requestAnimationFrame`, só enquanto a seção está visível.
- Mobile/movimento reduzido: layout estático.

## 5. Tokens visuais (`styles/tokens.css`)

```css
:root {
  --color-bg: #0b0f14;          /* fundo da página */
  --color-bg-raised: #13302a;   /* jungle shadow */
  --color-text: #f4ece4;
  --color-text-muted: rgb(244 236 228 / 0.7);
  --color-accent: #f6c9a8;      /* peach glow: CTA */
  --color-highlight: #fdfbc8;   /* sun core */
  --font-display: 'Display escolhida (D8)', Georgia, serif;
  --font-body: 'Sans escolhida (D8)', system-ui, sans-serif;
  --space-section: clamp(96px, 14vh, 180px);
  --content-width: 72rem;
  --header-height: 64px;
}
```

As cores vêm da paleta de [visual-direction.md §6](../art/visual-direction.md#6-paleta). A UI atual do head tracking passa a consumir os mesmos tokens.

## 6. Performance

| Regra | Implementação |
|---|---|
| Um canvas WebGL | Só no hero; a seção 04 é CSS 3D |
| MediaPipe sob demanda | Já é assim (import dinâmico após o clique) |
| GPU parada fora do hero | `frameloop="never"` via IntersectionObserver |
| Imagens abaixo da dobra | `<img loading="lazy" decoding="async" width height>` em WebP |
| Fontes | woff2 com subset latino, `font-display: swap`, `preload` só da fonte do `h1` |
| Sem listener de `scroll` contínuo | IntersectionObserver para header, item ativo e entradas; o único `scroll` (seção 04) é passivo, com rAF, e só ativo com a seção visível |
| Rolagem fluida com a cena | O canvas não intercepta a roda do mouse; `touch-action: pan-y` no hero |

## 7. SEO e metadados

`<title>`, `meta description`, Open Graph (imagem 1200×630 derivada da referência), `lang="pt-BR"`, `theme-color` `#0b0f14`. Sem dependências de SEO.

## 8. O que não muda

Cena (`features/scene`), pipeline de tracking, estados, privacidade, auto-hospedagem do MediaPipe, `sceneConfig` e `trackingConfig`. A landing só envolve e reposiciona.

## 9. Estado da implementação

### L1: estrutura global (2026-10-11) ✅

| Peça | Arquivo | Notas |
|---|---|---|
| Fonte única de seções e textos | `landing/config/landingContent.ts` | `sections` (`as const`) → `SectionId`; `navSections`, `contentSections`, `sectionHref()`; textos do hero e do rodapé (rascunhos aprovados) |
| Layout | `components/SiteLayout.tsx` | *Skip link* → `#conteudo`, sentinela de rolagem, header, `<main tabIndex=-1>`, rodapé |
| Header | `components/SiteHeader.tsx`, `DesktopNavigation.tsx`, `MobileNavigation.tsx`, `BrandMark.tsx`, `CameraCta.tsx` | Transparente → sólido (sentinela a 80 px); `aria-current="location"`; menu mobile em `<dialog>` modal (Esc, backdrop, foco devolvido, trava de rolagem); CTA vira "Voltar à janela" com a câmera ligada |
| Rodapé | `components/SiteFooter.tsx` | Só dados reais (D9). Refinamento visual fica para a seção 08. |
| Seções | `components/SectionContainer.tsx`, `SectionSlot.tsx`, `LandingSections.tsx`, `sections/index.ts` | **Mecanismo de slots:** cada seção do conteúdo que não está em `sectionComponents` vira um `SectionSlot` explícito ("Seção NN · em implementação"), com `id` real, então os links nunca apontam para o vazio. Para entregar uma seção: criar `sections/<Nome>Section.tsx` e registrá-la em `sections/index.ts`. |
| Hero | `sections/HeroSection.tsx` | Cena + tracking existentes; `h1` e texto; `useInView` → `SceneCanvas paused` (`frameloop="never"`) e `HeadTrackingController inView`; ponteiro restrito ao hero; indicador de rolagem para a próxima seção |
| CTA externo | `headTracking/controls.ts` | `registerHeadTrackingControls` (o controller registra) + `requestCamera()` (não reinicia se já está ativa ou pedindo) |
| D6 (revista) | `HeroSection` → `HeadTrackingController` sem `inView`; `ForestJourney` | O tracking não pausa fora do hero. Na floresta, com a câmera ligada, a cabeça tem precedência sobre o mouse |
| D7 | classe `.camera-only` | Oculta CTA e prompt da câmera em `(hover: none) and (pointer: coarse)` |
| Tokens e fontes | `styles/tokens.css`, `public/fonts/` | Fraunces 600 + Inter 400/600, subset latino, **66 kB**, licenças OFL ao lado |
| Âncoras | `src/index.css` | `scroll-padding-top` no `html` (em vez de `scroll-margin` por seção) + `scroll-behavior: smooth` (auto com movimento reduzido) |

**Validado (Chrome headless, webcam falsa):**
- Ordem das seções; 17 links com destino real; landmarks e `h1` único; um canvas.
- Header transparente → sólido; item ativo correto; primeiro Tab no *skip link*.
- Sem rolagem horizontal em 360/768/1024/1440/1920 px.
- Menu mobile: abre, foco interno, Esc fecha e devolve o foco, link navega e fecha, trava liberada.
- CTA do header (abaixo da dobra) liga a câmera e sobe ao hero.
- D6: câmera mantida a 1,5 s, liberada a 6,5 s, retomada ao voltar.
- Ponteiro só no hero; câmera negada mantém mouse e navegação.
- Nenhuma requisição externa (fontes incluídas); nenhum erro no console.

**Pendente de verificação manual:** fluidez da rolagem com a cena ativa em GPU real (LP-H6), contraste medido (LP-G9), leitor de tela, Safari e Firefox.

### N1: navegar com a cabeça (D10) ✅

| Peça | Arquivo |
|---|---|
| Inclinação + gesto | `headTracking/services/mediapipe.ts` (pitch da matriz de pose), `utils/headGesture.ts` (`HoldGesture`), `hooks/useHeadTracking.ts` (publica `pitch`, `gesture`, `lastGesture`) |
| Liga/desliga | `headTracking/controls.ts` → `setHeadNavigation()`; botão "Navegar com a cabeça" no prompt do hero (`aria-pressed`) |
| Rolagem + trilho | `landing/components/HeadNavigation.tsx`: loop rAF enquanto o modo está ligado; lê o gesto do store, escreve `--gesture-progress`/`data-engaged` no trilho e rola continuamente (`scrollBy`, velocidade em telas/s) enquanto engatado; anuncia início e fim em `aria-live` |
| Câmera na página toda | `HeroSection` monta o controller sempre "em vista" (D6, revista) |

Validado com vídeo sintético (limite reduzido temporariamente, já restaurado): cabeça mantida para baixo → +1351 px contínuos; para cima → −1456 px; neutro → 0 px; desligar pelo trilho interrompe a rolagem; câmera mantida fora do hero.
