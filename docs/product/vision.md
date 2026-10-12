# Visão do Produto

## Em uma frase

**A tela do computador vira uma janela:** o usuário mexe a cabeça e o mundo atrás do monitor responde com profundidade real, como se houvesse um vale de ilhas flutuantes do outro lado do vidro.

## O problema que resolvemos

Experiências "3D" na web normalmente pedem mouse, arraste ou scroll. Isso lembra o usuário de que está operando uma interface. Aqui o controle é o próprio corpo: nenhuma instrução, nenhum gesto aprendido. A paralaxe acoplada à cabeça (*head-coupled perspective*) cria a ilusão de profundidade física sem óculos nem hardware especial, só com a webcam.

## Para quem

- **Visitante curioso:** chega por um link e quer um momento de "uau" em menos de 10 segundos.
- **Público de tecnologia e design:** quer entender como foi feito e julga a qualidade técnica (fluidez, latência, acabamento).
- **Uso como vitrine:** a experiência serve de demonstração de capacidade (arte gerada + tracking + 3D em tempo real no navegador).

## Jornada principal

1. A página abre direto na cena, já bonita e estática, na posição neutra. Não há tela em branco.
2. Uma chamada discreta convida: ativar a câmera para "olhar pela janela".
3. O usuário clica, o navegador pede permissão e uma nota curta explica que **o vídeo nunca sai do dispositivo**.
4. Em segundos a cena começa a responder. Inclinar para a esquerda revela mais do lado direito do vale, e a moldura de selva parece realmente estar na frente.
5. Sem câmera, sem permissão ou sem rosto detectado, a experiência continua funcionando com o ponteiro do mouse, sem mensagens de erro agressivas.

## Princípios

| Princípio | Na prática |
|---|---|
| **Magia antes de tecnologia** | Nada de landmarks, wireframes ou números na tela, exceto no modo debug |
| **Privacidade por padrão** | Câmera só depois de um clique; processamento 100% local; nenhum frame armazenado ou enviado; modelo e wasm hospedados no próprio site |
| **Nunca quebrar a ilusão** | Sem bordas reveladas, sem saltos quando o rosto some ou volta, sem tremor parado |
| **Degradação elegante** | Webcam → ponteiro → cena estática. Sempre há algo bonito na tela. |
| **Leve e rápido** | Primeiro frame rápido; MediaPipe carregado sob demanda; 60 fps em notebook moderno |

## Como saberemos que funcionou

- O usuário entende a interação **sem instruções** na primeira tentativa.
- A cena parada (sem movimento) não treme.
- O movimento parece **imediato** (latência percebida < 100 ms).
- 60 fps estáveis em notebook moderno com tracking ativo.
- Nenhum pedido de rede envolvendo vídeo ou terceiros durante o uso.

Critérios verificáveis: [docs/qa/acceptance-criteria.md](../qa/acceptance-criteria.md).

## Referências

- Direção visual: [docs/art/visual-direction.md](../art/visual-direction.md)
- Escopo do MVP: [scope.md](./scope.md) · Roadmap: [roadmap.md](./roadmap.md)
