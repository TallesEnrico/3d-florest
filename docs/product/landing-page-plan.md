# Plano da Landing Page

> **Status: APROVADO (2026-10-11)** com os padrões D1–D9. Escopo, roadmap e contexto do Cursor já atualizados.
>
> Documentos irmãos: [section-inventory.md](./section-inventory.md) (seção por seção) · [landing-page-architecture.md](../engineering/landing-page-architecture.md) (como implementar) · [landing-page-acceptance-criteria.md](../qa/landing-page-acceptance-criteria.md) (como aprovar)

## 1. Objetivo

Transformar a experiência atual (uma cena em tela cheia) numa **página de uma rolagem só**:

- A **cena com head tracking é o hero**, a primeira coisa que se vê.
- As seções abaixo **explicam a ideia, mostram como foi feita e convidam a voltar à janela**.

**Princípio:** a página não compete com a cena. O hero continua sendo a experiência; o resto é contexto, em ritmo mais calmo, com a mesma linguagem visual.

## 2. Decisões para aprovar

Cada item tem um **padrão recomendado**. **Aprovados sem alterações em 2026-10-11.**

| # | Decisão | Padrão recomendado | Alternativas |
|---|---|---|---|
| D1 | **Propósito da página** | Vitrine da experiência: mostrar, explicar e fazer a pessoa experimentar | Portfólio de estúdio; página de produto ou serviço (aí a seção 05 vira "Serviços") |
| D2 | **Ação principal (CTA)** | "Ativar câmera": rola até o hero e liga o tracking | Contato, lista de espera, link externo (precisa de destino real) |
| D3 | **Nome e logo** | Wordmark tipográfico "Floresta 3D" + símbolo SVG simples de arco/janela | Nome público definitivo (Q2 em `scope.md`) |
| D4 | **Idioma** | pt-BR | EN, ou bilíngue (dobra o conteúdo) |
| D5 | **Seção 05** | "Recursos" da experiência (fatos verificáveis) | "Serviços" (exige conteúdo real do negócio) |
| D6 | **Câmera ao rolar para fora do hero** (revista em 2026-10-12) | **Manter ligada na página toda:** a cabeça move a vista no hero e olha ao redor na floresta. Desliga ao trocar de aba (retoma ao voltar) ou pelo controle da câmera. *Antes: pausar fora do hero e liberar após 5 s.* | Pausar fora do hero; ou desligar na hora |
| D7 | **Câmera no mobile** | Oculta em telas touch: o hero usa toque/deriva | Oferecer a câmera frontal (custo de performance não medido) |
| D8 | **Tipografia** | Serifa de display para títulos + sans para texto, **auto-hospedadas** (nada de Google Fonts em runtime) | Só fontes do sistema (zero peso) |
| D9 | **Rodapé** | Nome, descrição curta, âncoras, nota de privacidade, créditos de tecnologia, ano | + contato, redes, link do repositório (precisa de dados reais) |
| D11 | **Jornada cinematográfica pela floresta** (Etapa 1, 2026-10-11) | As cinco seções de conteúdo viram capítulos de uma única cena controlada pelo scroll (câmera avançando por uma floresta). Substitui as propostas visuais individuais das seções 04 (CSS 3D) e 06 (faixa horizontal); objetivos e textos do inventário seguem como referência até cada capítulo ser desenhado. Ver [forest-journey.md](../engineering/forest-journey.md). | Visuais independentes por seção (proposta original) |
| D10 | **Navegar com a cabeça** (adicionada em 2026-10-11; revista no mesmo dia) | Modo **opcional**: inclinar a cabeça e segurar ~0,5 s começa a rolar (baixo → desce, cima → sobe); **manter a cabeça inclinada continua rolando**, mais rápido quanto mais inclinada; voltar ao centro para. Com o modo ligado, aparecem o trilho lateral e o botão de desligar. | Uma seção por gesto (primeira versão, substituída a pedido); rolagem proporcional sem o "segurar" inicial (dispararia com movimentos naturais) |

Sem D1/D2/D9 resolvidos, nenhum conteúdo de negócio será inventado: onde faltar dado real, a seção usa só fatos do projeto ou um campo marcado `TODO` visível em revisão.

## 3. Estrutura da página

```
┌─────────────────────────────────────────────────────────────┐
│ 01 HEADER (fixo) logo · âncoras · [Ativar câmera]           │ transparente sobre o hero → sólido ao rolar
├─────────────────────────────────────────────────────────────┤
│ 02 HERO  #inicio            a cena 3D com head tracking     │ 100svh · título curto · prompt da câmera
├─────────────────────────────────────────────────────────────┤
│ 03 MANIFESTO  #manifesto    a ideia: a tela como janela     │ texto grande, ritmo lento
├─────────────────────────────────────────────────────────────┤
│ 04 COMO FUNCIONA  #como-funciona                            │ as 3 camadas se separam em 3D
│    (seção visual interativa)                                │ conforme a rolagem (CSS, sem WebGL)
├─────────────────────────────────────────────────────────────┤
│ 05 RECURSOS  #recursos      4 fatos: privacidade, janela    │ grade de cards
│                             real, arte em camadas, mouse    │
├─────────────────────────────────────────────────────────────┤
│ 06 BASTIDORES  #bastidores  da pintura à profundidade       │ showcase com os assets reais
├─────────────────────────────────────────────────────────────┤
│ 07 CTA FINAL  #experimente  "Volte à janela"                │ ativa a câmera e sobe ao hero
├─────────────────────────────────────────────────────────────┤
│ 08 PERGUNTAS  #perguntas    respostas curtas (FAQ)          │ câmera diante da janela da cabana
├─────────────────────────────────────────────────────────────┤
│ 09 CRÉDITOS  #creditos      autores dos assets, tecnologia  │ câmera entra pela janela
├─────────────────────────────────────────────────────────────┤
│ 10 RODAPÉ  #rodape          créditos · privacidade · âncoras│
└─────────────────────────────────────────────────────────────┘
```

A numeração 01–10 é a usada nos pedidos de implementação (08 e 09 entraram em 2026-10-12; o rodapé, antes 08, passou a 10). Detalhe de cada seção: [section-inventory.md](./section-inventory.md).

## 4. Navegação

| Item do header | Destino | Observação |
|---|---|---|
| Logo | `#inicio` | Volta ao hero |
| Manifesto | `#manifesto` | |
| Como funciona | `#como-funciona` | |
| Recursos | `#recursos` | |
| Bastidores | `#bastidores` | |
| **Ativar câmera** (CTA) | `#inicio` + inicia o tracking | Mesmo comportamento do CTA da seção 07 |

- Âncoras com rolagem suave (instantânea com `prefers-reduced-motion`) e compensação da altura do header.
- **Item ativo** destacado conforme a seção visível.
- Os IDs vêm de **uma única lista** no código: menu, rodapé e seções leem da mesma fonte. Não existe link para seção inexistente.

## 5. Linguagem visual da página

Herda [visual-direction.md](../art/visual-direction.md). Para a parte "documento" da página:

- **Fundo:** sombra da selva `#13302A` escurecendo até `#0B0F14`. As seções parecem continuar "dentro da gruta", abaixo da janela.
- **Texto:** creme `#F4ECE4`. Acentos: pêssego `#F6C9A8` (CTA) e sol `#FDFBC8` (destaques). Violeta `#9440C4` só em detalhes mínimos.
- **Ritmo:** seções altas e respiradas; no máximo um efeito de movimento por seção; transições por *fade/translate* curtos ao entrar na tela.
- **Imagens:** só os assets reais do projeto (camadas, máscaras, referência). Nada de banco de imagens.
- **Transição hero → página:** degradê do musgo escuro da base da cena para o fundo da página, sem corte seco.

## 6. Regras que valem para todas as seções

1. **Canvases WebGL:** o do hero e **um único** da jornada pela floresta, compartilhado pelas cinco seções de conteúdo (D11). Nunca uma cena por seção.
2. **Nada de MediaPipe ou câmera antes do clique.** Depois do clique, a câmera segue ligada na página toda (D6, revista).
3. **Performance:** o hero carrega primeiro; imagens abaixo da dobra com `loading="lazy"`, em WebP e com dimensões declaradas (sem CLS).
4. **Acessibilidade:** landmarks (`header`, `nav`, `main`, `footer`), *skip link*, um `h1` (no hero), `h2` por seção, foco visível, menu mobile acessível por teclado, contraste AA.
5. **Movimento reduzido:** sem rolagem suave, sem animações de entrada, seção 04 em versão estática.
6. **Sem dependência nova** sem justificativa: rolagem, item ativo e animações com `IntersectionObserver` + CSS.
7. **Sem conteúdo fictício apresentado como final:** textos são rascunhos marcados até aprovação; dados de negócio só com fonte real.

## 7. Ordem de implementação sugerida

| Ordem | Entrega | Depende de |
|---|---|---|
| 1 | Estrutura global: layout, header, menu mobile, rodapé, hero adaptado (rolagem, canvas pausando fora da tela, câmera conforme D6) | Aprovação deste plano (D1–D9) |
| 2 | Seção 03, Manifesto | 1 + texto aprovado |
| 3 | Seção 04, Como funciona | 1 |
| 4 | Seção 05, Recursos | 1 + D5 |
| 5 | Seção 06, Bastidores | 1 + WebP da referência e das máscaras |
| 6 | Seção 07, CTA final | 1 + D2 |
| 7 | Seção 08, refinamento do rodapé | D9 |
| 8 | Revisão integrada | Tudo acima |
