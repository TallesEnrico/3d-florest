# Escopo do MVP

## Dentro do escopo

| Área | Entrega |
|---|---|
| Cena | Uma única cena 2.5D com 3 camadas (`background`, `midground`, `foreground`) de `public/assets/environment/`, renderizada em R3F com câmera off-axis |
| Interação | Head tracking por webcam (MediaPipe Face Landmarker) controlando a perspectiva nos eixos X/Y |
| Fallback | Ponteiro do mouse/trackpad move a perspectiva quando não há câmera, permissão ou rosto |
| Calibração | Posição neutra capturada automaticamente ao iniciar + ação "recentralizar" |
| Estados | Inativo · pedindo permissão · carregando modelo · rastreando · rosto perdido · negado · indisponível · erro, cada um com feedback discreto |
| Privacidade | Câmera só após clique; processamento local; wasm e modelo auto-hospedados; câmera desligada ao sair ou esconder a aba |
| Acessibilidade | Botão de início acessível por teclado; respeito a `prefers-reduced-motion`; textos de estado legíveis por leitor de tela |
| Atmosfera | Névoa procedural animada entre camadas, brilho do sol, pólen em 3D e pulso das plantas (máscara emissiva). Implementado no step 7. Água (máscara de água) fica para depois. |
| Plataforma | Desktop: Chrome, Edge, Firefox e Safari atuais |
| Deploy | Site estático em HTTPS (exigido pela webcam) |
| Landing page | Página única com rolagem: a cena é o hero, seguida de manifesto, como funciona, recursos, bastidores, CTA final e rodapé. Navegação por âncoras. Ver [landing-page-plan.md](./landing-page-plan.md). Aprovada em 2026-10-11. |

## Fora do escopo (MVP)

- Múltiplas cenas, troca de cenário ou navegação entre **páginas** (a landing é uma página só, com âncoras)
- Mobile como alvo principal. Deve abrir sem quebrar, mas sem otimização dedicada nem giroscópio.
- Eixo Z (aproximar ou afastar a cabeça para "zoom"): exige orçamento extra de overscan, ver [scene-logic.md](../engineering/scene-logic.md#eixo-z-aproximação)
- Rotação da cabeça como entrada (só posição)
- Áudio ambiente
- Gravação, captura de tela, compartilhamento
- Backend, contas, analytics de vídeo ou qualquer envio de dados biométricos
- Geração de imagem em runtime

## Premissas

- Os assets atuais (1672 × 941) bastam para o MVP. O upscale é melhoria posterior.
- Usuário a ~50–70 cm da tela, de frente, com iluminação razoável.
- Uma pessoa por vez (`numFaces: 1`).

## Questões em aberto

| # | Questão | Impacto | Default até decidir |
|---|---|---|---|
| Q1 | Idioma da interface: pt-BR ou EN? | Textos da UI | pt-BR (`<html lang="pt-BR">`) |
| Q2 | Nome público ("Floresta 3D" é codinome)? | Título, metadados | Codinome |
| Q3 | Onde hospedar (domínio, provedor)? | Deploy, HTTPS | Qualquer host estático com HTTPS |
| Q4 | Mobile com câmera frontal entra numa v1.1? | Layout, performance | Não |
| Q5 | Quem gera o upscale e com qual ferramenta? | Nitidez em 4K | Pendente (ver [asset-spec §5](../art/asset-spec.md#5-transparência-limitações-e-contornos)) |
