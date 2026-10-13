import { sceneConfig } from '../../scene/config/sceneConfig.ts'

/**
 * Single source of the page's sections and copy. Navigation, footer and every <section id>
 * read from here, so a link to a section that doesn't exist is a type error.
 * Plan and status per section: docs/product/landing-page-plan.md, section-inventory.md.
 */
export const sections = [
  { id: 'inicio', number: '02', title: 'Início', inNav: false },
  { id: 'manifesto', number: '03', title: 'Manifesto', inNav: true },
  { id: 'como-funciona', number: '04', title: 'Como funciona', inNav: true },
  { id: 'recursos', number: '05', title: 'Recursos', inNav: true },
  { id: 'bastidores', number: '06', title: 'Bastidores', inNav: true },
  { id: 'experimente', number: '07', title: 'Experimente', inNav: false },
  { id: 'perguntas', number: '08', title: 'Perguntas', inNav: false },
  { id: 'creditos', number: '09', title: 'Créditos', inNav: false },
  { id: 'fogueira', number: '10', title: 'Fogueira', inNav: false },
] as const

export type SectionEntry = (typeof sections)[number]
export type SectionId = SectionEntry['id']

export const HERO_ID: SectionId = 'inicio'
export const FOOTER_ID = 'rodape' as const
export const MAIN_ID = 'conteudo'

export const navSections = sections.filter((section) => section.inNav)
/** Everything after the hero, in page order. */
export const contentSections = sections.filter((section) => section.id !== HERO_ID)

export const sectionHref = (id: SectionId) => `#${id}`

// Copy: drafts approved with the plan (2026-10-11); each section's step reviews its own text.
export const site = {
  name: 'Floresta 3D',
  description: 'Uma janela para um vale que não existe.',
  privacy: 'O rastreamento da cabeça roda só no seu navegador. Nenhuma imagem é gravada ou enviada.',
  credits: 'Feito com React Three Fiber, three.js e MediaPipe. Floresta com modelos, texturas e luz do Poly Haven e do AmbientCG (CC0).',
}

export const heroCopy = {
  title: 'Brasil.',
  lead: 'Mova a cabeça e o vale responde. Sem óculos, sem instalar nada: só a sua câmera, e o vídeo nunca sai do seu navegador.',
}

// ---------- Content sections (chapters of the forest journey) ----------
// Every statement is a fact about this project; numbers that describe the scene are computed
// from sceneConfig, so they can't drift from the code.

const { camera, layers } = sceneConfig
const layerDepth = (id: string) => layers.find((layer) => layer.id === id)?.depth ?? 0
/** How much of the viewer's movement a layer follows: depth / (eye distance + depth). */
const follows = (depth: number) => Math.round((depth / (camera.eyeDistance + depth)) * 100)
const screens = (depth: number) => depth.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

export const manifestoCopy = {
  eyebrow: 'Manifesto',
  title: 'Interfaces que respondem ao corpo',
  body: 'Quase toda experiência 3D na web pede clique, arraste ou rolagem. Aqui não há o que aprender: você se move como se move diante de uma janela de verdade, e a perspectiva acompanha. É a mesma paralaxe que seus olhos usam o dia inteiro, trazida para a tela.',
  highlight: 'Nenhum gesto para aprender. Só olhar.',
}

export const howItWorksCopy = {
  eyebrow: 'Como funciona',
  title: 'Seu rosto vira o ponto de vista',
  lead: 'Três passos, a cada quadro da câmera, sem que nada saia do seu navegador.',
  steps: [
    {
      title: 'A câmera encontra seus olhos',
      text: 'Um modelo de visão (MediaPipe) localiza a íris dos dois olhos. A distância entre elas mostra se você chegou mais perto ou se afastou.',
    },
    {
      title: 'Seus olhos viram um ponto no espaço',
      text: 'Os primeiros quadros definem o seu centro; cada movimento é medido a partir dele e suavizado, para a imagem não tremer quando você está parado.',
    },
    {
      title: 'A cena se recalcula para esse ponto',
      text: 'A tela vira o vidro de uma janela: a câmera 3D se coloca onde estão seus olhos (projeção fora do eixo), e o que está mais longe acompanha mais o seu movimento.',
    },
  ],
  layersTitle: 'Três camadas, uma janela',
  layers: [
    { name: 'Moldura de selva', where: 'no plano da tela', follows: follows(layerDepth('foreground')) },
    { name: 'Vale', where: `${screens(layerDepth('midground'))} alturas de tela atrás`, follows: follows(layerDepth('midground')) },
    { name: 'Céu ao pôr do sol', where: `${screens(layerDepth('background'))} alturas de tela atrás`, follows: follows(layerDepth('background')) },
  ],
  layersNote: 'A moldura fica parada como o vidro enquanto o vale e o céu se movem atrás dela: é isso que faz a selva parecer estar na frente da tela.'
}

export type FeatureIconName = 'privacy' | 'window' | 'pointer' | 'head' | 'paths' | 'motion'

export const featuresCopy = {
  eyebrow: 'Recursos',
  title: 'O que dá para fazer aqui',
  items: [
    {
      icon: 'privacy',
      title: 'Privado por desenho',
      text: 'O rastreamento roda no seu navegador, com o modelo servido por este site. Nenhum quadro é gravado ou enviado; a câmera só liga quando você pede e desliga sempre que você troca de aba.',
    },
    {
      icon: 'window',
      title: 'Uma janela de verdade',
      text: 'Projeção fora do eixo, a mesma de simuladores e da realidade virtual: a perspectiva acompanha a posição dos seus olhos. Sem óculos e sem instalar nada.',
    },
    {
      icon: 'pointer',
      title: 'Funciona sem câmera',
      text: 'Sem webcam ou sem permissão, o mouse assume a perspectiva. Em telas de toque, a cena deriva sozinha, devagar. Sempre há algo vivo na tela.',
    },
    {
      icon: 'head',
      title: 'Navegue com a cabeça',
      text: 'Com a câmera ligada, ative "Navegar com a cabeça": incline o rosto para baixo ou para cima e segure meio segundo para rolar a página. Volte ao centro para parar.',
    },
    {
      icon: 'paths',
      title: 'Passeie pela floresta',
      text: 'Mova o mouse sobre a floresta, ou a cabeça com a câmera ligada, para olhar ao redor. Dois cliques à esquerda ou à direita, ou as setas ← →, trocam de caminho.',
    },
    {
      icon: 'motion',
      title: 'Movimento sob controle',
      text: 'Se o seu sistema pede menos movimento, a paralaxe cai pela metade e a rolagem fica instantânea. Tudo funciona pelo teclado.',
    },
  ] satisfies { icon: FeatureIconName; title: string; text: string }[],
}

const LANDING_ASSETS = `${import.meta.env.BASE_URL}assets/landing`
/** Forest download (models, textures, HDR in public/assets/forest), rounded. */
const FOREST_MB = 24
const FOREST_LITE_MB = 8

export const behindTheScenesCopy = {
  eyebrow: 'Bastidores',
  title: 'Da pintura à floresta',
  lead: 'Tudo o que você vê foi feito com assets reais do projeto, preparados para rodar leve no navegador.',
  steps: [
    {
      title: 'Camadas',
      text: 'Três pinturas em profundidades diferentes: o céu ao pôr do sol, o vale com cachoeiras recortado e a moldura de selva com o centro aberto.',
      image: `${LANDING_ASSETS}/bastidores-camadas.webp`,
      alt: 'As três camadas afastadas umas das outras: o céu ao pôr do sol ao fundo, o vale recortado no meio, a moldura de selva na frente.',
    },
    {
      title: 'A janela',
      text: 'Montadas na cena 3D, cada camada acompanha uma parte diferente do seu movimento: é o que dá a profundidade.',
      image: `${LANDING_ASSETS}/bastidores-janela.webp`,
      alt: 'A cena montada: um vale de floresta tropical com cachoeiras e montanhas na névoa, visto através de uma moldura de selva.',
    },
    {
      title: 'Floresta',
      text: 'Árvores, samambaias, pedras, solo e madeira escaneados (Poly Haven e AmbientCG, CC0). Os abetos originais somavam 487 MB e um milhão de agulhas por árvore; na web, viraram 6 MB com raminhos inteiros e três níveis de detalhe.',
      image: `${LANDING_ASSETS}/bastidores-floresta.webp`,
      alt: 'A floresta renderizada: uma cabana de toras numa clareira, entre troncos altos e samambaias, com uma fogueira acesa ao lado.',
    },
  ],
  stack: 'Feito com React, React Three Fiber, three.js, MediaPipe e Vite.',
}

export const experienceCopy = {
  eyebrow: 'Experimente',
  title: 'Volte à janela',
  lead: 'Ative a câmera e mova a cabeça devagar, como diante de uma janela de verdade. Ou use o mouse, se preferir.',
  tips: [
    'Fique a cerca de um braço da tela, uns 50 a 60 cm.',
    'Deixe a luz bater no seu rosto de frente; contraluz atrapalha.',
    'Se a cena ficar deslocada, use "Recentralizar" no painel da câmera.',
  ],
  secondary: { pointer: 'Usar o mouse', touch: 'Voltar ao início' },
}

export const faqCopy = {
  eyebrow: 'Perguntas',
  title: 'Antes de entrar',
  items: [
    {
      question: 'Preciso instalar alguma coisa?',
      answer: 'Não. Tudo roda no navegador, sem extensão nem aplicativo. A câmera é opcional: sem ela, o mouse assume a perspectiva.',
    },
    {
      question: 'O vídeo da câmera vai para algum lugar?',
      answer: 'Não. O modelo de rastreamento (MediaPipe) é servido por este site e roda no seu navegador; nenhum quadro é gravado ou enviado. A câmera só liga quando você pede e desliga sempre que você troca de aba.',
    },
    {
      question: 'Funciona no celular?',
      answer: 'Sim, sem a câmera: em telas de toque, a janela do início deriva sozinha, devagar, e a floresta acompanha a rolagem, com menos árvores em telas pequenas para continuar leve.',
    },
    {
      question: 'A cena ficou deslocada. Como recentralizo?',
      answer: 'Olhe para a tela na posição em que vai ficar e use "Recentralizar" no painel da câmera: os quadros seguintes viram o seu novo centro.',
    },
    {
      question: 'Por que a floresta leva um instante para aparecer?',
      answer: `Ela é carregada à parte, só quando você chega perto dela: cerca de ${FOREST_MB} MB de modelos, texturas e luz (${FOREST_LITE_MB} MB no celular, com texturas menores). Enquanto isso a página continua rolando, e a placa de vídeo é preparada antes de a floresta entrar na tela.`,
    },
    {
      question: 'Dá para navegar só pelo teclado?',
      answer: 'Sim. Tab percorre links e botões, e na floresta as setas ← → trocam de caminho. Se o seu sistema pede menos movimento, a paralaxe cai pela metade e a rolagem fica instantânea.',
    },
  ],
}

export const creditsCopy = {
  eyebrow: 'Créditos',
  title: 'Quem fez o que você viu',
  lead: 'Modelos, texturas e luz da floresta vêm do Poly Haven e do AmbientCG, em domínio público (CC0). Os créditos são por cortesia: nenhuma das bibliotecas exige atribuição.',
  groups: [
    {
      title: 'Floresta',
      text: 'Abetos, samambaias, pedras, tocos, raízes, solo e folhas: Rob Tuytel, Rico Cilliers, Kless Gyzen e Jenelle van Heerden. Luz do céu (HDR): Andreas Mischok.',
    },
    {
      title: 'Cabana',
      text: 'Toras: Rob Tuytel. Tábuas: Dimitrios Savva e Dario Barresi. Telhado, frontões e pontas das toras: AmbientCG. A cabana e a fogueira são construídas no código.',
    },
    {
      title: 'Quintal',
      text: 'Fogueira de pedra: Sebastian Platen. Lampião, balde e caixote: James Ray Cock. Machado: Ulan Cabanilla. Banquinho: Kuutti Siitonen.',
    },
    {
      title: 'Lá dentro',
      text: 'Cadeira de balanço: Jorge Camacho. Fogão de barril: MP. Panela: Rico Cilliers. Divã: Aron Łyczek. Almofadas e mesa: Serhii Khromov. Lamparina: Monsta3D. Estante: Ulan Cabanilla.',
    },
    {
      title: 'Janela do início',
      text: 'Três pinturas digitais em camadas: o céu ao pôr do sol, o vale com cachoeiras e a moldura de selva.',
    },
    {
      title: 'Feito com',
      text: 'React, React Three Fiber, drei, three.js, MediaPipe, Zustand e Vite. Fontes Fraunces e Inter (SIL Open Font License).',
    },
  ],
}

export const campfireCopy = {
  eyebrow: 'Fim da trilha',
  title: 'Senta um pouco perto do fogo',
  lead: 'A caminhada termina aqui, do lado de fora da cabana. Volte ao início para olhar o vale de novo, agora sabendo o que há por trás da janela.',
  action: 'Voltar ao início',
}
