# Checklist de Testes

Como verificar os [critérios de aceite](./acceptance-criteria.md). Rode antes de considerar um step concluído.

## 1. Automático (sempre)

```bash
bun run typecheck    # tipos
bun run lint         # oxlint
bun run build        # typecheck + build de produção
```

- [ ] Os três sem erro
- [ ] No build, o MediaPipe aparece em **chunk separado** do `index-*.js` (AC-F3)

## 2. Visual (cena)

- [ ] `bun run dev`, abrir http://localhost:5173 **sem** mover o mouse: a cena aparece com cores corretas (AC-V3)
- [ ] Posição neutra: abrir `?view=0,0` e comparar com as três camadas sobrepostas (AC-V1)
- [ ] Extremos: `?view=1,1`, `?view=-1,-1`, `?view=1,-1`, `?view=-1,1` em 16:9, 16:10, 21:9 e 4:3 (DevTools → modo responsivo): nenhuma borda aparece (AC-V2)
- [ ] A moldura (foreground) fica parada; só o mundo atrás dela se move
- [ ] Névoa sutil; a ilha herói e o lago continuam nítidos (AC-V4)
- [ ] A cena entra com fade (sem frame meio carregado); "Carregando a cena…" aparece antes
- [ ] O brilho do sol respira levemente sem estourar a área clara; pólen discreto flutua com paralaxe; as samambaias violeta pulsam devagar
- [ ] Sem mexer em nada por alguns segundos: a deriva idle move a vista devagar; ao mover o mouse, ela some suavemente

> **Screenshot sem interface:** `--screenshot` do Chrome headless trava com o loop de renderização contínuo. Use o Chrome via DevTools Protocol (porta de depuração + perfil isolado) ou um teste com Playwright. Foi assim que os steps 5–8 foram validados (neutro, extremos, proporções, estados, ciclo de vida); ver [audit-step-8.md](./audit-step-8.md).

## 3. Head tracking (manual, com webcam)

- [ ] Clicar em "Ativar câmera" → o navegador pede permissão só agora (AC-P1)
- [ ] Após aceitar: status `loading` → `calibrating` → `tracking` em poucos segundos
- [ ] Mover a cabeça para a direita: o vale desliza para a direita atrás da moldura (AC-T1)
- [ ] O movimento horizontal é mais amplo que o vertical (AC-T2)
- [ ] Ficar parado 5 s: a cena não treme; o offset no debug varia menos que ±0,02 (AC-T3)
- [ ] Movimentos rápidos: a resposta parece imediata (AC-T4)
- [ ] Sair do quadro: status `searching` e retorno suave ao neutro; voltar sem salto (AC-T5)
- [ ] Mudar de posição e clicar "Recalibrar": a nova posição vira o neutro (AC-T6)
- [ ] Desligar a câmera pela UI: o LED apaga e o mouse volta a controlar sem salto (AC-P6, AC-T7)
- [ ] Trocar de aba por 5 s: o LED apaga; ao voltar, o tracking retoma (AC-P5)
- [ ] Rastreando por 4 s: o painel inferior fica translúcido; ao passar o mouse ou focar com Tab, volta ao normal
- [ ] Com a câmera ativa, desconectar a webcam USB (ou revogar a permissão no cadeado): estado `unavailable`, mouse assume, "Tentar de novo" funciona
- [ ] Clicar em "Ativar câmera" e, no pedido do navegador, não responder: o botão "Cancelar" encerra e o mouse volta a funcionar

### Sem webcam física (Chrome com câmera falsa)

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir=/tmp/chrome-fake-cam \
  --use-fake-ui-for-media-stream \
  --use-fake-device-for-media-stream \
  --use-file-for-fake-video-capture=/caminho/rosto.y4m \
  http://localhost:5173/?debug
```

Gerar o `.y4m` a partir de um vídeo de rosto: `ffmpeg -i rosto.mp4 -vf scale=640:480 -pix_fmt yuv420p rosto.y4m`.
A partir de uma **foto** (simulando movimento): `ffmpeg -loop 1 -framerate 30 -t 12 -i retrato.jpg -vf "crop=640:480:x='80+100*sin(2*PI*max(t-3\,0)/4)':y='20+15*sin(2*PI*max(t-3\,0)/6)',format=yuv420p" rosto.y4m`. Os 3 s iniciais parados servem para a calibração.

Permissão negada sem interação: `--use-fake-device-for-media-stream --deny-permission-prompts`.

## 4. Permissões e falhas

- [ ] Negar a permissão: mensagem de câmera bloqueada + mouse funcionando (AC-P2)
- [ ] Sem câmera (desabilitar nas configurações do sistema): mensagem de câmera indisponível + mouse (AC-P3)
- [ ] Bloquear `/mediapipe/` (DevTools → Network → Block request URL): mensagem de erro + "Tentar novamente" (AC-P4)
- [ ] Em http com IP da rede (`bun run dev --host` e abrir pelo IP): estado `insecure`, mensagem sobre https, sem botão de tentar de novo
- [ ] Sem WebGL (`chrome://settings` → desativar aceleração de hardware, ou Safari com WebGL desligado): mensagem amigável no lugar da cena (AC-C2)

## 5. Privacidade

- [ ] DevTools → Network durante uso com câmera: só requisições a `localhost` ou ao próprio domínio (AC-X1)
- [ ] Nenhuma requisição `POST` ou upload (AC-X2)

## 6. Performance

- [ ] DevTools → Performance, 10 s com tracking ativo: frames verdes, p95 < 20 ms (AC-F1)
- [ ] Painel de debug: inferência média < 15 ms (AC-F2)
- [ ] Rendering → Frame Rendering Stats: GPU estável, sem picos ao mover a cabeça
- [ ] Network (cache desligado): ~1,2 MB de imagens `.webp` no carregamento; `/mediapipe/*` só depois de "Ativar câmera" (AC-F3, AC-F4)
- [ ] Memória estável após ligar e desligar a câmera 5× (sem vazamento de tracks ou landmarker)

## 7. Acessibilidade

- [ ] Só com o teclado (Tab/Enter/Espaço): ativar câmera, recalibrar, desligar (AC-A1)
- [ ] Leitor de tela (VoiceOver): estados anunciados (AC-A2)
- [ ] macOS → Acessibilidade → Reduzir movimento: sem deriva, efeitos congelados, sem fade; o controle continua com metade da amplitude (AC-A3)
- [ ] Leitor de tela: o título da página (h1 oculto) e a descrição do canvas são lidos

## 8. Landing page

Critérios: [landing-page-acceptance-criteria.md](./landing-page-acceptance-criteria.md).

- [ ] Header: transparente no topo, sólido ao rolar; item ativo acompanha a seção; CTA liga a câmera e sobe ao hero
- [ ] Todos os links do header, do menu mobile e do rodapé levam a uma seção existente (sem "pulo" para o nada)
- [ ] Menu mobile (≤ 767 px): abre, Tab fica dentro dele, Esc fecha e devolve o foco ao botão, link navega e fecha
- [ ] Só teclado: o primeiro Tab mostra "Pular para o conteúdo"; Enter leva ao `main`
- [ ] Ponteiro sobre o hero move a cena; sobre outras seções, não
- [ ] Rolar devagar a partir do topo: a moldura sobe com a página, as ilhas e o céu sobem mais devagar (parallax); sem bordas; com "Reduzir movimento" o efeito some
- [ ] Câmera ligada → rolar até o rodapé: em 5 s o LED apaga; voltar ao topo: rastreamento retoma sozinho
- [ ] Rolar a página inteira com a câmera ligada: sem engasgos (DevTools → Performance)
- [ ] 360, 768, 1024, 1440 e 1920 px: sem rolagem horizontal; título do hero legível sobre a cena
- [ ] Touch (celular real): sem botões de câmera; a cena responde ao toque e rola normalmente
- [ ] Network: fontes vindas de `/fonts/`; nenhuma requisição a terceiros
- [ ] **Navegar com a cabeça** (webcam real, `?debug` ajuda): ligar no prompt; inclinar para baixo e segurar → começa a descer e **continua enquanto a cabeça fica inclinada**; inclinar mais → mais rápido; voltar ao centro → para; para cima → sobe. Acenar rápido, ler a página e olhar para a tela de lado não rolam; olhar o teclado por ~1 s começa a rolar (limitação conhecida). Desligar pelo ✕ do trilho. Ajustes em `trackingConfig.gesture` (ver head-tracking.md)

## 9. Navegadores (AC-C1)

| | Chrome | Edge | Firefox | Safari |
|---|---|---|---|---|
| Cena + mouse | ☐ | ☐ | ☐ | ☐ |
| Webcam + tracking | ☐ | ☐ | ☐ | ☐ |
| Negar permissão | ☐ | ☐ | ☐ | ☐ |
