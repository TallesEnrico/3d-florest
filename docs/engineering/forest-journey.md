# Jornada pela Floresta (arquitetura cinematográfica)

> **Etapa 1 (2026-10-11): arquitetura mínima.** As cinco seções de conteúdo (Manifesto, Como funciona, Recursos, Bastidores, Experimente) viram **capítulos** de uma única cena compartilhada: uma floresta percorrida pela câmera conforme o scroll. Ainda não há animações por capítulo.
>
> **Floresta fotorrealista (Etapa 3, 2026-10-11):** a floresta low-poly gerada por código foi substituída por **assets escaneados do Poly Haven (CC0)**: abetos reais com casca fotográfica, samambaias, pedras com musgo, troncos caídos, tocos, raízes, solo PBR e luz por HDRI, com sombras do sol. Detalhes em [Floresta fotorrealista](#floresta-fotorrealista). Fontes e licença: `public/assets/forest/LICENSE.md`.
>
> **Entrada na cabana (2026-10-12):** duas seções novas antes do rodapé, Perguntas (`#perguntas`) e Créditos (`#creditos`), viram os capítulos 6 e 7. Em vez de se aproximar da cabana, a câmera contorna até a parede esquerda e **entra pela janela lateral**, terminando dentro da cabana mobiliada. Ver [Entrada pela janela](#entrada-pela-janela).
>
> **Saída pela porta (2026-10-12):** uma seção nova depois dos Créditos, Fogueira (`#fogueira`), vira o capítulo 8. A câmera vira para a porta, que agora fica aberta para dentro, sai da cabana e termina diante da fogueira no terreiro. Ver [Saída pela porta](#saída-pela-porta).

## Visão geral

```
<main>
 ├─ HeroSection #inicio            canvas próprio: a janela (head tracking)        ← inalterado
 └─ ForestJourney (.forest-journey)
     ├─ .forest-journey__stage     palco sticky (100svh) atrás dos capítulos
     │   └─ ForestScene            ÚNICO canvas da floresta (tone mapping Neutral, sombras, qualidade adaptativa)
     │       ├─ ForestAtmosphere   fundo em degradê, névoa exponencial, luz de preenchimento (paleta do hero)
     │       ├─ SunLight           sol baixo e dourado, vindo da esquerda; um mapa de sombra em cache que acompanha a câmera
     │       ├─ SceneController    scroll → câmera (planos por capítulo) + paralaxe do mouse/cabeça + caminhos
     │       ├─ RealisticForest    (chunk lazy, após ociosidade) HDRI + árvores, plantas, pedras, chão, trilha, rio, cabana e fogueira
     │       └─ LightShafts        fachos de luz sutis + brilho no fim da trilha
     ├─ section #manifesto         capítulo 1 ┐
     ├─ section #como-funciona     capítulo 2 │ as mesmas sections de antes (ids, textos, slots),
     ├─ section #recursos          capítulo 3 │ agora com 100svh e fundo transparente
     ├─ section #bastidores        capítulo 4 │
     ├─ section #experimente       capítulo 5 │
     ├─ section #perguntas         capítulo 6 │ diante da janela esquerda da cabana
     ├─ section #creditos          capítulo 7 │ dentro da cabana
     └─ section #fogueira          capítulo 8 ┘ fora, diante da fogueira
<footer #rodape>                    o palco termina antes dele
```

| Peça | Arquivo | Papel |
|---|---|---|
| `ForestScene` | `src/features/forest/components/ForestScene.tsx` | A cena compartilhada (um `<Canvas>`): atmosfera, controlador, floresta e luz |
| `SceneController` | `src/features/forest/components/SceneController.tsx` | A cada frame: lê `journey.shot`, interpola entre os planos dos capítulos (smoothstep), soma o caminho lateral e a entrada do mouse/cabeça, suaviza com mola (`smoothDamp`) e aponta a câmera. Em telas em retrato, abre o FOV vertical |
| Sincronização do scroll | `src/features/forest/journey/journeyState.ts`, `useJourneyTracking.ts` | Um listener passivo de `scroll`/`resize`, medido no máximo 1× por frame (rAF), escreve o objeto mutável `journey` (sem estado React) |
| Floresta | `components/RealisticForest.tsx`, `models/*`, `procedural/*` | Carrega os assets, distribui com semente fixa (mesma floresta a cada carga) e desenha em lotes com LOD por distância |
| Assets | `public/assets/forest/` | GLBs otimizados, texturas WebP, HDRI; fontes e licença em `LICENSE.md` |
| Atmosfera e luz | `components/ForestAtmosphere.tsx`, `components/SunLight.tsx`, `components/LightShafts.tsx` | Névoa, fundo, sol com sombras, fachos e brilho |
| Ajustes | `src/features/forest/config/forestConfig.ts` | Planos de câmera, caminhos, layout, LOD, assets, paleta do chão, atmosfera |
| Montagem na página | `src/features/landing/components/ForestJourney.tsx` | Palco sticky + capítulos; cria o canvas só a até uma tela de distância (`useInView` com `rootMargin`) e pausa (`frameloop="never"`) fora da viewport |

A feature `forest` **não importa** `landing`: recebe por props os ids dos capítulos (na ordem) e o `getViewInput`. Ela usa utilitários da `scene` (`smoothDamp`, tipo `ViewInput`).

## Sincronização scroll → câmera

`measureJourney()` calcula, a cada frame com scroll:

| Campo | Definição |
|---|---|
| `progress` | 0 quando o 1º capítulo toca o topo da tela; 1 quando a jornada termina |
| `chapter` | Capítulo sob o meio da tela |
| `chapterProgress` | 0..1 através desse capítulo (0,5 = centralizado) |
| `shot` | Parâmetro contínuo dos planos: `chapter + chapterProgress − 0,5`. Inteiro = capítulo centralizado no seu plano |
| `inView` | Alguma parte da jornada na tela |
| `path` | Caminho atual: −1 esquerda, 0 centro, +1 direita |

O `SceneController` usa `shot` para mesclar o plano `floor(shot)` com o seguinte (`smoothstep`), e a mola dá inércia (`camera.smoothTime` = 0,35 s). Resultado: com o capítulo centralizado, a câmera está exatamente no plano dele; entre capítulos, ela viaja. Como a câmera depende só da posição do scroll, rolar para trás refaz o mesmo trajeto (validado: mesma posição de scroll, indo ou voltando, gera o mesmo quadro).

**Validado:** com cada capítulo centralizado, `--chapter-progress` = 0,5000 e a câmera mostra um enquadramento diferente por capítulo; âncoras do header continuam caindo no capítulo certo; o palco não cobre o rodapé; sem rolagem horizontal em 360/768/1440 px.

## Camada de parallax, perspectiva lateral e caminhos

- **HTML/CSS:** cada capítulo recebe `--chapter-progress` (0..1), atualizado com o scroll. Textos e elementos podem fazer parallax só com CSS (`transform: translateY(calc((var(--chapter-progress) - 0.5) * -40px))`), sem JS novo. A jornada recebe `--journey-enter` (0 → 1 enquanto o palco entra na tela), usado para a floresta "nascer" do fundo da página em vez de começar numa borda dura sob o hero.
- **3D:** a câmera gera paralaxe real entre objetos em profundidades diferentes (troncos próximos andam mais que os distantes).
- **Mouse/cabeça:** `SceneController` soma `input × camera.lateral` (`{ x: 0.55, y: 0.3 }`) à posição do olho, mantendo o alvo: com a câmera ligada, a cabeça tem precedência (ela foi ligada para isso; o mouse parado sobre a floresta sempre ganharia); sem câmera, vale o ponteiro sobre a floresta. Metade da amplitude com `prefers-reduced-motion`.
- **Caminhos:** duplo clique na metade esquerda/direita (ou ← →) muda de caminho (`paths`: um de cada lado, 1,6 m entre eles), com anúncio em `aria-live`. O scroll continua avançando pelo caminho escolhido.
- **Liberdade por plano (`freedom`):** perto de paredes, caminhos e paralaxe encolhem. Cada plano pode ter `freedom` (0..1, padrão 1), interpolado entre planos como a posição. Diante da janela é 0,35 e dentro da cabana é 0,15. Assim, na passagem pela janela, o desvio somado fica bem dentro do vão.

## Floresta fotorrealista

### Assets (Poly Haven e AmbientCG, CC0)

| Asset | Uso | Arquivo |
|---|---|---|
| `fir_tree_01` | Três abetos escaneados (casca fotográfica, galhos secos, agulhas em cartões com alfa), ampliados para 20–40 m | `models/fir_trees.glb` (14 MB) |
| `fern_02`, `rock_moss_set_01`, `tree_stump_01`, `dead_tree_trunk_02`, `pine_roots` | Samambaias, pedras com musgo, tocos, troncos caídos, raízes expostas | `models/forest_props.glb` (4,5 MB) |
| `forest_leaves_04`, `forest_ground_04` | Solo (agulhas, gravetos, folhas) e trilha (terra batida), PBR: cor, normal, AO/roughness | `textures/*.webp` (2,2 MB) |
| `forest_slope` | Luz ambiente (IBL) de floresta ensolarada, céu limpo de meio da tarde | `hdri/forest_slope_1k.hdr` (1,9 MB) |

Os originais tinham 7,8 M triângulos e 487 MB só nas árvores. O processamento, feito uma vez com `@gltf-transform` + `meshoptimizer`, fica em `tools/forest-assets/`, que tem `package.json` próprio, fora das dependências do site. O passo a passo para reproduzir está no README dessa pasta:

- 3 níveis de detalhe por árvore;
- poda estocástica dos cartões de agulha;
- troncos simplificados;
- alfa das agulhas reconstruído;
- UV no tronco que não tinha;
- WebP e compressão meshopt.

Total servido: ~22 MB, carregados depois da primeira renderização.

### Como a cena é montada

| Módulo | O que faz |
|---|---|
| `models/bakeParts.ts` | Extrai as malhas de um nó do glTF com a transformação (e a dequantização) aplicada, em float, para compartilharem buffers |
| `models/lodBatches.ts` | Um `BatchedMesh` por material: culling e ordenação por instância e **LOD por instância** pela distância da câmera, com **dissolve** entre níveis (duas instâncias por objeto durante a transição) |
| `models/ditherFade.ts` | Dissolve pontilhado por instância (alfa da cor da instância → descarte de pixels num padrão fino): sem transparência, sem ordenação, sem custo de mistura |
| `procedural/river.ts`, `models/water.ts` | O rio: traçado sinuoso, vale raso e leito escavado no terreno; água como faixa com material físico brilhante (reflexo do céu por Fresnel, sem segundo render da cena), duas camadas de ondulação correndo em velocidades e ângulos diferentes, mais clara e transparente junto às margens. Pedras de travessia onde a trilha cruza |
| `models/cabin.ts` | A cabana de toras: geometria construída no código com texturas fotográficas CC0 (toras, pontas, telhas, tábuas), cores por vértice (variação entre toras, sombra de contato, musgo no telhado) e **perspectiva atmosférica**: velada de longe, 100% visível ao chegar no rio |
| `models/campfire.ts` | A fogueira na fogueira de pedra: lenha, brasas emissivas, chamas em sprites aditivos com textura gerada em dados, faíscas, fumaça e uma luz pontual que tremula (sem sombra) |
| `models/buildRealisticForest.ts` | Junta tudo: modelos, distribuição, lotes, chão e trilha; ajusta os materiais (alpha-to-coverage nas agulhas e samambaias, agulhas menos brilhantes) |
| `procedural/layout.ts` | Distribuição por *dart throwing* com semente: corredor livre para a câmera, borda do corredor irregular, árvore de enquadramento por capítulo, faixa próxima e faixa distante, samambaias em manchas, raízes na base das árvores perto da trilha |
| `procedural/terrain.ts` | Relevo, chão com UV em metros e tons por vértice (musgo, sol, sombra de contato) sobre a textura fotográfica; trilha como faixa própria com bordas suaves |
| `components/SunLight.tsx`, `components/sunShadow.ts` | Sol alto à frente, com a cor creme do sol do hero, e um mapa de sombra de 110 m que acompanha a câmera em passos e só é redesenhado quando muda. A sombra deixa passar 15% do sol (luz filtrada pelas agulhas) |

**Escala e composição:**

- **Base dos troncos:** escurece até o chão (cores por vértice no espaço do modelo, `shadeTrunkFoot`). A base alargada das raízes, engrossada pelo `girth` e voltada para cima, recebia em cheio a luz do céu e virava um anel cinza. Árvores reais são mais escuras onde encontram o chão (sombra de contato, terra úmida).

- Os abetos escaneados (14–19 m) são ampliados de 1,2× a 2,5×.
- Os **troncos** recebem uma espessura extra (`girth` 2,4×) sem deformar a copa, porque cada material tem a própria matriz.
- O primeiro plano tem troncos gigantes parcialmente fora do quadro.
- O plano médio fica numa faixa densa de ±18 m.
- O fundo é mais compacto e se dissolve numa bruma clara (exponencial, densidade 0,014) com as cores do hero: névoa pêssego-rosada, céu azul-lavanda nas frestas do dossel, sol creme.
- A borda do corredor oscila até 3 m para não formar uma alameda.

**Níveis de detalhe:**

| Faixa de distância | Triângulos por árvore |
|---|---|
| até 16 m | 43–293 mil |
| até 40 m | 9–50 mil |
| até 100 m | 2–11 mil |

Além de 100 m, a árvore some (já está coberta pela bruma). Samambaias somem a 42 m, pedras e troncos a 60 m. O nível próximo é 4–6× mais pesado que o médio: sua distância é o principal ajuste de desempenho.

**Agulhas em raminhos:** o abeto escaneado tem ~1 milhão de cartões de agulha avulsa (~10 cm cada) por árvore. A primeira versão web guardava poucos e os ampliava de 5 a 16×, e cada agulha virava uma lâmina de meio metro: a copa parecia de bambu. Agora cada agulha sorteada vira um cartão de **raminho inteiro**, usando os 7 raminhos do mesmo atlas, que o modelo original não usava:
- tamanho natural perto (1 cartão a cada 70 agulhas);
- 1,4× no nível médio e 2× no distante, com menos cartões;
- apoiados onde a agulha nasce e apontando para fora do tronco;
- normais voltadas para fora da copa, mantidas também no verso do cartão (`keepFoliageNormals`), para a folhagem não manchar de escuro.

O resultado é folhagem de abeto real com menos triângulos (árvore A, perto: 165 mil → 108 mil), e o GLB caiu para 6,2 MB. O pipeline também gera atlas de "raminhos feitos de raminhos" (`twig_clusters.py`), para escalas acima de 2,6×; hoje nenhum nível usa.

**Sem "saltos":**

- **Transições graduais:** nenhuma troca é instantânea. Quando um objeto cruza uma distância de troca (com 1,5 m de histerese, para não piscar na fronteira), os dois níveis se dissolvem um no outro em `lod.fadeSeconds` (0,6 s). Ao passar da última distância, o objeto se dissolve na bruma.
- **Por tempo, não por distância:** a primeira versão dissolvia ao longo de uma faixa de metros, e com a câmera parada algumas árvores ficavam presas no meio da transição, com o padrão pontilhado visível. Por tempo, toda transição termina em 0,6 s.
- **Como funciona:** o dissolve é pontilhado. Cada nível descarta uma fração de pixels num padrão fino de ruído, e o nível que entra usa exatamente os pixels que o outro libera, então não há sobreposição. A superfície continua opaca: sem ordenação de transparência e sem custo de mistura.
- **Medido com a câmera parada e só a referência de LOD andando 12 m:** troca instantânea, 9 saltos em 48 passos (o maior com ~10 mil pixels de uma vez); com o dissolve, nenhum.

**Rio, cabana e fogueira:**

- **Rio:** cruza a trilha entre os capítulos 3 (Recursos) e 4 (Bastidores). A câmera passa sobre a água, pelas pedras de travessia. Árvores, troncos e tocos ficam fora do leito e das margens; samambaias se adensam nas margens, menos onde a trilha chega à água.
- **Cabana:** na clareira do fim da trilha, virada para mostrar a frente e a lateral esquerda. Nenhuma biblioteca CC0 tem um modelo de cabana; a geometria é feita no código e os materiais e objetos ao redor são reais (ver `public/assets/forest/LICENSE.md`).
- **Perspectiva atmosférica:** a cabana existe inteira desde o início. Além da névoa da cena, recebe um véu da mesma cor do ar que depende da distância (`REVEAL_NEAR`/`REVEAL_FAR` em `models/cabin.ts`):
  - capítulo 1 (~75 m): não aparece;
  - capítulo 2 (~63 m): um vulto ainda velado, já com cor;
  - chegada ao rio, capítulo 3 (~52 m): 100% visível, só com a névoa normal da cena, como as árvores ao lado.

  No extremo distante, quando já é quase da cor do ar, ela se condensa da névoa por um padrão de pixels muito fino (imperceptível nesse contraste), em vez de surgir de repente como um recorte claro.
  Os objetos do terreiro e a lenha da fogueira usam o mesmo véu. Chamas, faíscas e a luz da fogueira, que brilham e ignoram a névoa, enfraquecem com a mesma curva. A cabana só projeta sombra quando o véu passa da metade, para que a sombra não apareça antes dela.
- **Fogueira:** sem luz real. Uma luz pontual somaria seu custo a cada pixel da floresta. A luz da fogueira no chão é um disco aditivo quente que tremula junto com as chamas.

### Entrada pela janela

- **O trajeto:**
  - **Capítulo 6 (Perguntas):** a câmera contorna até a parede esquerda, a uns 5 m da janela. O olhar inclina para a esquerda, para a janela ficar ao lado do painel, e o cômodo iluminado aparece pelo vão.
  - **Capítulo 7 (Créditos):** a câmera está 0,6 m dentro, olhando ao longo da parede direita.
  - **A reta entre os dois:** cruza a parede no centro da janela. A mola não sai da reta: os três eixos seguem o mesmo parâmetro, com o mesmo amortecimento crítico.
  - **Onde ajustar:** os dois planos são dados no referencial da cabana (`cabinPoint` e `WINDOW` em `forestConfig.ts`). Se a cabana mudar de lugar ou girar, eles acompanham.
### Saída pela porta

- **Pontos de passagem (`via`):** um plano pode listar pontos (posição, alvo e `freedom`) por onde a câmera passa ao vir do plano anterior. O `SceneController` percorre a poligonal com velocidade uniforme (parâmetro proporcional ao comprimento de cada trecho), com a mesma suavização do início e do fim da transição. Sem `via`, a transição continua sendo a reta de antes.
- **O trajeto do capítulo 7 ao 8:**
  - vira para a porta, ainda dentro (`cabinPoint(-0.8, 1.45, 1)`, olhando para fora);
  - atravessa o vão em linha reta, a ~0,45 m de cada batente, com `freedom` 0,1–0,15;
  - sai para o terreiro (`cabinPoint(-0.62, 1.45, 3.4)`) e termina diante da fogueira (`cabinPoint(3, 1.35, 8.2)`), com `freedom` 0,4.
- **Porta:** aberta para dentro (`DOOR.open`, −1,83 rad), presa no batente direito, encostada fora do caminho da câmera.
- **Floresta inalterada:** o plano novo fica depois do fim da trilha e não consome sorteios em `layoutTrees` (mesmas contagens de árvores, samambaias e objetos).

- **Janelas abertas:** sem vidro e sem mainéis, só a moldura. O vão útil é de 1,07 × 0,76 m.
- **Interior** (`models/cabin.ts`):
  - **Construído no código:** piso de tábuas, forro de tábuas sob as duas águas do telhado, as faces internas dos frontões, duas vigas e o cano do fogão até o forro.
  - **Móveis escaneados** (`cabin_interior.glb`, Poly Haven CC0):
    - ao longo da parede direita, no enquadramento final: fogão de barril sob a chaminé, com uma panela; cadeira de balanço voltada para ele; mesa com a lamparina; o banquinho do terreiro;
    - ao longo da parede do fundo, vistos ao entrar: divã e estante. Os travesseiros coloridos ficam na ponta do divã voltada para o cômodo, no lugar dos travesseiros cinza do escaneamento, que foram tirados do modelo.
  - **Samambaias junto às paredes:** são encolhidas até as folhas pararem nas toras (senão atravessavam a parede do fundo, na estante). O ajuste é feito depois do sorteio (`layout.ts`), para a sequência aleatória e o resto da floresta não mudarem.
- **Luz de dentro sem luzes reais:**
  - **Um único patch de shader** (`enableCabinShading`), aplicado à cabana, aos móveis e aos objetos, que também mantém o véu da perspectiva atmosférica.
  - **Dentro das paredes e abaixo do telhado:** a luz do céu e do ambiente cai para 1/5. O cômodo é iluminado por três brilhos suaves somados como emissão: a lamparina (quente, tremulando) e a luz do dia nas duas janelas.
  - **Por que não luzes reais:** custariam em cada pixel da floresta.
- **Lamparina:** o original traz vidro e chama em JPG (sem alfa) e sairia opaco. A chama vira um cartão aditivo (o fundo preto não soma nada), e a chaminé vira vidro claro com um leve brilho quente. A *transmission* do vidro ficou de fora: ela redesenharia a cena inteira a cada quadro.

**Desempenho:**

- **Sombra estática:**
  - **Um mapa só:** a floresta não se move, então um único mapa de sombra cobre toda a caminhada (enquadrado no `SunLight`).
  - **Quando é desenhado:** uma vez, no aquecimento escondido, e de novo só se o conteúdo ou a resolução mudar (`invalidateSunShadow()`). Redesenhá-la ao rolar era um dos maiores custos da cena.
  - **Detalhe fixo:** nesse desenho, árvores e objetos ficam num nível de detalhe fixo (o médio, via `forceLod`), para a sombra não depender de onde a câmera estava.
  - **Dentro de um render:** o desenho acontece no `onAfterRender` de uma cena vazia. Fora de um render, o three não tem estado de luzes e lança erro. Antes, isso só funcionava por acaso logo após o `compileAsync` e quebrava quando a qualidade adaptativa trocava a resolução do mapa.
- **Sem travar ao entrar na floresta:** o canvas fica pausado até a jornada aparecer, então o primeiro quadro visível enviava todas as texturas à GPU, terminava de compilar os shaders e desenhava o mapa de sombra de uma vez. Era uma tarefa de ~950 ms bem na passagem do hero para a floresta. Agora isso acontece escondido, enquanto a pessoa ainda está no hero (`components/warmUpForest.ts`):
  1. as texturas são enviadas uma a uma, cedendo a vez ao navegador entre elas;
  2. `gl.compileAsync` compila todos os programas;
  3. os dois primeiros quadros reais rodam escondidos (`advance` do R3F: câmera no plano, níveis de detalhe atribuídos, sombra desenhada).
- **Variantes de shader estáveis:** os lotes definem a cor por instância já na criação (`lodBatches.ts`). Sem isso, o `BatchedMesh` só criava a textura de cor quando a primeira instância aparecia, e o shader recompilava no meio do scroll. A cabana nasce projetando sombra e com a fogueira acesa, para que o aquecimento compile essas variantes.
- **Construção em etapas:** `buildRealisticForest` é assíncrono e cede a vez ao navegador entre etapas (`models/yieldToMain.ts`, com `scheduler.yield` onde existe). A maior tarefa de carregamento caiu de 521 para ~150 ms.
- **Decodificação fora da thread principal:** texturas por `ImageBitmapLoader` (`scene/hooks/useImageTextures.ts`, usado pelo hero e pela floresta, com a mesma regra de compatibilidade do `GLTFLoader`: Safari 17+, Firefox 98+) e geometria meshopt descomprimida em 2 workers. Decodificar uma pintura do hero na thread principal custava ~160 ms.
- **Monitores de desempenho só com o canvas rodando:** o `PerformanceMonitor` mede o intervalo entre quadros. Com o canvas pausado (fora da tela), a primeira medição ao voltar incluía a pausa e rebaixava a qualidade sem motivo. Agora hero e floresta só montam o monitor enquanto renderizam (a floresta, também só depois do aquecimento).
- **Resolução do hero:** no máximo 1,25×. As pinturas têm 1672 px de largura, ~1,1 pixel de arte por pixel de tela num notebook; 1,75× custava o dobro de pixels para a mesma imagem (detalhe medido: −4,5%).
- **Densidade de pixels da floresta:** no máximo 1,25× (1× no modo leve). As texturas são 1k e as agulhas usam MSAA com alpha-to-coverage; 1,5× custava ~30% a mais de pixels sem ganho visível.
- **Sem `backdrop-filter`:** os painéis dos capítulos e o cabeçalho usam fundo mais opaco em vez de desfoque. Sobre um canvas que muda a cada quadro, o navegador refazia o desfoque em todo quadro.
- **Rio mais barato:** material padrão em vez do físico com *clear coat*, que fazia uma segunda passada de luz. A segunda camada de ondulação passou para a rugosidade.
- **Qualidade adaptativa mais cedo:** o modo leve entra abaixo de 52 fps em telas de 60 Hz (90 fps em 120 Hz).
- **Só renderiza o que está na tela:** `useInView` encolhe a área observada em 1 px. Hero e jornada se encostam exatamente na borda da tela, e "encostar" contava como visível: a floresta renderizava escondida atrás do hero, e o hero continuava renderizando no capítulo 1.

**Qualidade adaptativa:**

- Cinco níveis em `forestConfig.quality` (`ultra`, `high`, `medium`, `low`, `minimum`). Cada um define:
  - `detail`: fator das distâncias de troca entre níveis de detalhe;
  - `reach`: fator da distância em que árvores, plantas e pedras somem na névoa;
  - `dpr`: densidade de pixels máxima;
  - `shadowMap`: resolução do mapa de sombra.
- O nível inicial é estimado em `utils/deviceQuality.ts` a partir da GPU (`WEBGL_debug_renderer_info`), dos núcleos (`hardwareConcurrency`), da memória (`deviceMemory`, só no Chrome) e de a tela ser pequena ou de toque. Desktop com GPU dedicada ou Apple M começa em `ultra`; GPU integrada Intel, em `high`; celular topo de linha, em `medium`; iPhone e intermediários, em `low`; Mali G5x, Adreno 3xx–6xx com pouca memória e PowerVR, em `minimum`.
- Um `PerformanceMonitor` começa a medir só depois que a floresta carrega e reavalia a cada 2,5 s: desce um nível abaixo de 52 fps em telas de 60 Hz (90 fps em 120 Hz) e sobe um nível perto da taxa máxima. Para depois de `níveis + 1` mudanças, para não oscilar.
- QA: `?quality=<nível>` fixa o nível e desliga o monitor.
- Triângulos visíveis no celular (variantes leves, capítulos Recursos e Experimente): `ultra` 2,5–2,7 M; `high` 2,2–2,5 M; `medium` 1,7–2,2 M; `low` 1,3–1,7 M; `minimum` 1,0–1,1 M.
- Telas até 767 px usam densidade 0,6.

**Medido** (Chrome sem limite de fps, GPU Apple M3 Pro, tela Retina 2×, janela 1512×945; comparação intercalada na mesma sessão):

| | Parado | Rolando | Quadros > 33 ms |
|---|---|---|---|
| Antes | 36–38 fps | 45–47 fps | 18–34 |
| Depois | 76–91 fps | 95–96 fps | 0–1 |

Os números absolutos variam com a carga da máquina; a relação entre eles (~2,2×) se manteve em todas as rodadas. Os assets ficam prontos ~1–2 s depois do carregamento (servidor local).

Com rio, cabana e fogueira (mesma janela, com outro Chrome usando a GPU em paralelo): 83–114 fps parado, 74–92 fps rolando, 3–4 quadros acima de 33 ms em 8 s de rolagem.

**Custo de GPU por quadro** (`bun tools/perf/gpu-cost.ts <pasta temporária>`: consultas de tempo do WebGL em volta de cada render, sem depender de vsync nem da carga da máquina; Retina 2×, janela 1512×945):

| | Antes desta rodada | Depois |
|---|---|---|
| Floresta, capítulos | 16–27 ms | 9–10 ms |
| Floresta, rolando | 16–17 ms | ~9–12 ms |
| Hero (parado ou com a cabeça/mouse movendo) | — | ~2–3 ms |

O hero é barato, e o parallax dele não pesa. O custo restante está na floresta: cerca de um terço nas agulhas, o resto em chão, plantas e sombra.

**Auditoria de scroll** (`bun tools/perf/scroll-audit.ts <pasta temporária> --vsync [--profile]`, com o servidor de desenvolvimento rodando: roda do mouse real, Retina 2×, do topo ao rodapé e de volta):

| | Antes | Depois |
|---|---|---|
| Maior travada no scroll | ~950 ms (uma tarefa) | nenhuma tarefa longa |
| Shaders compilados durante o scroll | sim | nenhum |
| Maior tarefa no carregamento | 521 ms | ~130 ms |
| Tempo bloqueado no carregamento | 956 ms | ~250 ms |
| Quadros no scroll (máquina sem disputa de GPU) | p95 16,7 ms, com a travada | 60 fps, p99 16,8 ms, 1 quadro > 33 ms em toda a página |

O tempo por quadro depende da carga da máquina: com outro navegador usando a GPU ou gravação de tela ativa, até uma página em branco cai para 30 fps. As métricas de tarefas longas, de CPU, não dependem disso.

## Decisões

| Decisão | Motivo | Alternativa |
|---|---|---|
| **Sem GSAP/ScrollTrigger nesta etapa** (não estão instalados) | O progresso cabe em ~60 linhas sem dependência; a câmera precisa de valores contínuos, não de timelines | Adotar ScrollTrigger quando houver *pin* de seções e timelines sincronizadas ao scroll: ele substituiria só `useJourneyTracking` como fonte de progresso; `SceneController` e os planos continuam |
| **Palco `sticky`** dentro da jornada (não `fixed` na página) | O canvas acompanha só os capítulos e sai com o último, sem cobrir hero ou rodapé | `position: fixed` + controle manual de visibilidade |
| **Dois canvases na página** (hero e floresta) | Desacopla a janela (câmera off-axis) da jornada (câmera de scroll); só renderizam ao mesmo tempo na transição hero → capítulo 1 | Um contexto só com `View` do drei (um canvas fixo, várias "janelas"): mais econômico em memória, mas exige refatorar o hero. Fica como evolução. |
| Estado da jornada **fora do React** (objeto mutável) | Zero re-render durante o scroll | Estado React/zustand por scroll |
| **Assets escaneados (Poly Haven, CC0)** em vez de geometria gerada | Casca, agulhas e plantas fotográficas: a cena deixa de parecer low-poly. CC0 dispensa atribuição e permite uso comercial | Geometria procedural (estilizada demais), Quixel/Sketchfab (exigem conta, licenças diferentes) |
| **Otimização offline** (poda de cartões, simplificação, meshopt, WebP) | Os originais (487 MB, 7,8 M triângulos) são inviáveis na web; a otimização roda uma vez e não adiciona dependências ao projeto | Carregar os originais (inviável) |
| **`BatchedMesh` por material com LOD por instância** | Culling e ordenação por árvore, troca de detalhe pela distância da câmera e poucas chamadas de desenho (uma por material) | `InstancedMesh` por variante (sem culling por instância; LOD só por faixas fixas) |
| **Um mapa de sombra que acompanha a câmera, em cache** | As agulhas recortando o sol dão as manchas de luz da referência; uma luz só, área limitada ao que a câmera vê, redesenhada só quando a área anda (a cena é estática) | Sem sombras (o sol iluminava o chão por igual sob as copas), sombra redesenhada a cada quadro (custava ~35% do quadro) ou cascatas de sombra (mais caras) |
| **Assets após ociosidade + chunk lazy** | A página abre como antes (o código da floresta é um chunk de 135 kB; os 22 MB vêm depois) | Carregar junto com a página |

## Como evoluir (próximas etapas)

1. **Planos definitivos por capítulo:** ajustar `forestConfig.shots` com storyboard (enquadramento, altura, ritmo), incluindo um enquadramento próprio para telas em retrato.
2. **Animações por capítulo:** no `SceneController`, usar `journey.chapter`/`chapterProgress` para revelar elementos (luz, névoa, criaturas); no HTML, usar `--chapter-progress`.
3. **Floresta:**
   - musgo nos troncos e musgo pendente (referência do Noroeste do Pacífico): exige uma textura de casca musgosa ou mistura de texturas no material;
   - mais espécies (`pine_tree_01`, 958 MB brutos, mesmo processo);
   - vento leve nas copas;
   - texturas KTX2 para reduzir memória de GPU.
4. Se a memória pesar: juntar hero e floresta num único contexto com `View`.

## Onde ajustar

`src/features/forest/config/forestConfig.ts`:

- `shots`: enquadramentos, um por capítulo. `freedom` reduz caminhos e paralaxe perto de paredes; `via` lista pontos de passagem vindos do plano anterior. Os três últimos ficam no referencial da cabana (`cabinPoint`, `WINDOW`).
- `camera`:
  - `smoothTime`: inércia;
  - `fov` e `portraitFov`;
  - `lateral`: paralaxe do mouse/cabeça.
- `paths`: caminhos laterais.
- `layout`:
  - `seed`: outra semente, outra floresta;
  - `corridor` e `clearing`;
  - `river`: posição, largura, sinuosidade, nível e profundidade;
  - `cabin`: posição, rotação e tamanho;
  - `trees` e `undergrowth`: quantidades;
  - `species`: modelo, frequência, escala;
  - `girth`: espessura dos troncos.
- `lod`: distâncias de detalhe e `fadeSeconds` (duração do dissolve).
- `assets`: arquivos e tamanho do ladrilho do chão.
- `palette.ground` e `palette.water`: tons sobre a textura do solo e cores da água.
- `atmosphere`:
  - `fog`;
  - `sky`: o horizonte deve ser igual à cor da névoa;
  - `environment.intensity`: força do HDRI;
  - `sun`: cor, intensidade, direção, sombra (`shadow.intensity`: quanto do sol a sombra bloqueia);
  - `exposure`;
  - `glow` e `shafts`.

Em `models/cabin.ts`:

- Onde a cabana aparece: `REVEAL_FAR` (a partir de onde surge) e `REVEAL_NEAR` (onde fica 100% visível).
- Posição dos móveis: as chamadas `put(furniture(...))`.
- Luz de dentro: `LAMP_COLOR` e `uLightColors`/`uLightRadius`.

Altura dos capítulos: `.forest-journey > .section { min-height }` em `landing.css`.
