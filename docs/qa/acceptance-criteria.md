# Critérios de Aceite (MVP)

Cada critério é verificável. O "como verificar" está em [testing-checklist.md](./testing-checklist.md).

## Visual

| ID | Critério |
|---|---|
| AC-V1 | Na posição neutra (`?view=0,0`), foreground e midground coincidem com as pinturas planas sobrepostas (modo cover; a referência da arte anterior saiu do projeto em 2026-10-12). O background aparece 12% ampliado por projeto ([scene-logic](../engineering/scene-logic.md#posicionamento-das-camadas)). Névoa e vinheta são adições. |
| AC-V2 | Em nenhuma posição dentro do orçamento aparece borda de camada, faixa vazia ou fundo da página, em 16:9, 16:10, 21:9 e 4:3 |
| AC-V3 | Cores fiéis à arte: sem aspecto lavado nem saturado demais (sem tone mapping, texturas em sRGB) |
| AC-V4 | A névoa e os efeitos atmosféricos são sutis: não escondem a ilha herói nem o lago |

## Interação e tracking

| ID | Critério |
|---|---|
| AC-T1 | Cabeça para a direita → o mundo atrás da moldura desliza para a direita (vê-se mais do lado esquerdo do vale). O mesmo vale para o mouse. |
| AC-T2 | O movimento horizontal é claramente mais amplo que o vertical |
| AC-T3 | Parado em frente à câmera por 5 s, a cena não treme perceptivelmente |
| AC-T4 | Latência percebida entre mover a cabeça e a cena responder < 100 ms |
| AC-T5 | Ao sair do quadro, a cena volta ao neutro suavemente em < 1 s, sem saltos. Ao voltar, retoma sem saltos. |
| AC-T6 | "Recalibrar" define a posição atual como neutra em < 1 s |
| AC-T7 | Trocar entre mouse e webcam não produz salto na câmera |

## Permissões e estados

| ID | Critério |
|---|---|
| AC-P1 | A câmera só é pedida após clique no botão de ativação |
| AC-P2 | Permissão negada → mensagem clara e o mouse continua controlando a cena |
| AC-P3 | Sem câmera ou câmera em uso → mensagem clara + fallback para mouse |
| AC-P4 | Falha ao carregar o MediaPipe → mensagem + fallback para mouse + opção de tentar de novo |
| AC-P5 | Ao ocultar a aba, a câmera é liberada (LED apaga). Ao voltar, o tracking retoma. |
| AC-P6 | Ao desligar a câmera pela UI, a câmera é liberada imediatamente |

## Privacidade

| ID | Critério |
|---|---|
| AC-X1 | Nenhuma requisição de rede a domínios de terceiros durante o uso (wasm e modelo servidos pelo próprio site) |
| AC-X2 | Nenhum frame é enviado, armazenado ou exibido, exceto no painel de debug |

## Performance

| ID | Critério |
|---|---|
| AC-F1 | 60 fps estáveis (p95 do frame < 20 ms) em notebook Apple Silicon/equivalente, 1440p, com tracking ativo |
| AC-F2 | Inferência média < 15 ms por frame de vídeo com delegate GPU |
| AC-F3 | Bundle inicial sem o MediaPipe: o MediaPipe vem em chunk separado, carregado só após o clique |
| AC-F4 | Primeiro frame da cena em < 2,5 s numa conexão rápida. Texturas da cena ≤ 2 MB (hoje 1,2 MB em WebP). |

## Acessibilidade

| ID | Critério |
|---|---|
| AC-A1 | Todos os controles alcançáveis e acionáveis por teclado, com foco visível |
| AC-A2 | Mudanças de estado anunciadas por região `aria-live` |
| AC-A3 | Com `prefers-reduced-motion: reduce`: sem deriva idle, efeitos congelados (névoa, sol, partículas, brilho), sem fade-in nem animações da UI. O controle pela cabeça ou pelo mouse continua, com amplitude reduzida à metade. |
| AC-A4 | O canvas tem descrição textual (`aria-label`) da cena |

## Compatibilidade

| ID | Critério |
|---|---|
| AC-C1 | Funciona nas versões atuais de Chrome, Edge, Firefox e Safari (desktop) |
| AC-C2 | Sem WebGL: mensagem amigável em vez de tela quebrada |
