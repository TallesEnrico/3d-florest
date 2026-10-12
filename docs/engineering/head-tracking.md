# Head Tracking

Da webcam até o offset normalizado que a cena consome. Valores atuais em `src/features/headTracking/config/trackingConfig.ts`.

## Pipeline

```
 getUserMedia (640×480, 30 fps, câmera frontal)
   └─► <video> oculto ─► requestVideoFrameCallback (fallback: requestAnimationFrame)
         └─► FaceLandmarker.detectForVideo(video, timestamp crescente)
               └─► 478 landmarks normalizados
                     └─► medida: centro entre as íris (468, 473) + IPD em pixels
                           └─► calibração (neutro = mediana de N amostras)
                                 └─► offset bruto = deslocamento / (IPD · alcance), espelhado e com zona morta
                                       └─► limite suave (tanh) ─► filtro One Euro ─► store.offset
```

## MediaPipe

| Opção | Valor | Por quê |
|---|---|---|
| Pacote | `@mediapipe/tasks-vision` 1.1 | API `FilesetResolver` + `FaceLandmarker` |
| wasm | `/mediapipe/wasm` (auto-hospedado) | Privacidade e versão travada (ADR-08) |
| Modelo | `/mediapipe/models/face_landmarker.task` (float16 v1, 3,7 MB) | Inclui íris (landmarks 468–477) |
| `runningMode` | `VIDEO` | Usa tracking entre frames, mais estável e barato que `IMAGE` |
| `numFaces` | 1 | Uma pessoa por vez |
| `delegate` | `GPU`, com nova tentativa em `CPU` se falhar | GPU é bem mais rápida; CPU garante funcionamento |
| blendshapes / matrizes | desligados | Não usados: economizam processamento |

`scripts/setup-mediapipe.ts` copia `vision_wasm_internal.*` e `vision_wasm_nosimd_internal.*` de `node_modules/@mediapipe/tasks-vision/wasm` e baixa o modelo de `storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`. Ele roda no `postinstall` e pula o que já existe.

## Medida do rosto

- **Centro:** ponto médio entre os centros das íris (landmarks **468** e **473**), em pixels do vídeo.
- **IPD** (distância interpupilar) em pixels: régua natural. Normalizar o deslocamento pelo IPD torna a sensibilidade **independente da distância** do usuário à câmera. Um deslocamento de 1 IPD equivale a ~6,3 cm reais.
- **Confiança:** o Face Landmarker não expõe score por rosto. Usamos uma heurística em [0, 1] = presença do rosto nos últimos 15 frames × `edgeFactor` (cai a 0 quando a caixa do rosto encosta na borda do quadro; 1 a partir de 8% de distância). Ela aparece no debug e serve de sinal de qualidade, não de probabilidade.

## Calibração

- Ao iniciar (e a cada "Recalibrar"), as primeiras **20 amostras válidas** formam o neutro: a **mediana** do centro e do IPD, que resiste a outliers. Enquanto isso, o status é `calibrating` e o offset fica em 0.
- O neutro é a posição em que a cena mostra a composição de referência (`?view=0,0`). Recalibre sentado na posição confortável de uso.

## Mapeamento para offset

```
 dx = (centro.x − neutro.x) / IPD_atual          dy = (centro.y − neutro.y) / IPD_atual
 x  = softLimit( deadZone( −dx / rangeX ) )      y  = softLimit( deadZone( −dy / rangeY ) )
```

- **IPD atual** como régua: o mesmo movimento físico gera o mesmo offset perto ou longe da câmera.
- **Espelhamento:** a imagem da webcam não é espelhada. Quando o usuário vai para a direita dele, o rosto vai para a esquerda da imagem, daí o sinal `−`. Em y, a imagem cresce para baixo, daí `−` também.
- **`rangeX` / `rangeY`** = quantos IPDs de movimento levam o offset a ~0,93. **Menor = mais sensível.** Atual: 1,6 IPD ≈ 10 cm.
- **Zona morta** (`deadZone` = 0,03): micro-movimentos viram 0; acima do limiar a resposta cresce em rampa contínua, sem degrau.
- **`softLimit`**: linear até `softLimitKnee` (0,7) e depois aproxima ±1 suavemente (`tanh`), sem parada brusca. Com 2× o alcance, satura em 1,0.
- O limite final de deslocamento da câmera é da cena (`sceneConfig.motion.maxEye` + orçamento geométrico, ver [scene-logic.md](./scene-logic.md#limites-de-movimento)). O tracking só entrega [−1, 1]. **O horizontal fica mais evidente que o vertical** porque `maxEye.y` é cerca de metade de `maxEye.x`.

## Suavização

**One Euro filter** por eixo: corte baixo quando parado (remove tremor) e corte alto quando há movimento rápido (pouca latência).

| Parâmetro | Efeito ao aumentar |
|---|---|
| `minCutoff` | Menos suavização em repouso (mais tremor, menos atraso) |
| `beta` | Responde mais rápido a movimentos rápidos |
| `dCutoff` | Estimativa de velocidade mais nervosa |

Depois do filtro, a câmera segue o alvo com uma mola criticamente amortecida a 60 Hz (`sceneConfig.motion.smoothTime`).

## Estados

| `webcam` | Significado |
|---|---|
| `idle` | Câmera nunca pedida (mouse ativo) |
| `requesting` | Aguardando permissão |
| `active` | Stream aberto |
| `denied` | Permissão negada (`NotAllowedError`, `SecurityError`) |
| `unavailable` | Sem câmera ou em uso por outro app (`NotFoundError`, `NotReadableError`, `OverconstrainedError`) ou API ausente |
| `insecure` | Página fora de contexto seguro (http em IP/domínio). "Tentar de novo" não resolve, então não é oferecido. |
| `error` | Qualquer outra falha (inclui falha ao carregar o MediaPipe) |

| `tracking` | Significado |
|---|---|
| `idle` | Sem tracking |
| `loading` | Carregando wasm e modelo |
| `calibrating` | Coletando amostras do neutro |
| `tracking` | Rosto detectado, offset sendo publicado |
| `searching` | Rosto perdido há mais de `faceLostTimeoutMs`. O offset volta a 0 suavemente. |

**Fonte de entrada (`source`):** `mouse` até o tracking começar; `webcam` enquanto a câmera estiver ativa; volta a `mouse` em `denied`, `unavailable`, `insecure`, `error` ou quando o usuário desliga a câmera. A troca não dá salto: a mola da câmera absorve a mudança de alvo.

## Interface de estado (`HeadTrackingPrompt`)

| Estado | Mensagem (resumo) | Ações |
|---|---|---|
| `idle` | "Mova o mouse para explorar, ou use a cabeça." + nota de privacidade | Ativar câmera |
| `requesting` | "Permita o acesso à câmera…" (indicador pulsante) | Cancelar (alguns navegadores deixam o pedido pendente indefinidamente) |
| `loading` / `calibrating` | "Preparando…" / "Olhe para a tela e fique parado…" | Desligar |
| `tracking` | "Mova a cabeça para olhar pela janela." Após 3,5 s, o painel fica translúcido; volta ao passar o mouse ou focar. | Recentralizar, Desligar |
| `searching` | "Procurando seu rosto…" | Desligar |
| `denied` / `unavailable` / `error` | Causa + "o mouse controla a cena" | Tentar de novo |
| `insecure` | "A câmera só funciona em conexão segura (https)." | — |

A mensagem é uma região `role="status"` com `aria-live="polite"` e entra com fade a cada mudança (sem animação com movimento reduzido).

## Ciclo de vida

- **Iniciar** só por gesto do usuário (botão).
- **Aba oculta:** o stream é liberado (LED apaga) e o mouse assume. Um início em andamento é cancelado; se a permissão chegar com a aba oculta, o stream é fechado na hora. Ao voltar, retoma sozinho se estava ativo.
- **Câmera perdida** (desconectada, permissão revogada, tomada por outro app): o evento `ended` da track leva a `unavailable` + mouse, com "Tentar de novo".
- **Modelo carregado uma vez:** a promessa de carga é compartilhada, então religar durante o carregamento não cria um segundo landmarker. Se `detect()` falhar, o landmarker é descartado e o "Tentar de novo" o recarrega (e pode cair para CPU).
- **Parar/desmontar:** `track.stop()` em todas as tracks, `video.srcObject = null`, loop cancelado, `landmarker.close()`.
- **Timestamps:** `detectForVideo` exige timestamps estritamente crescentes. Usamos `performance.now()` com proteção contra repetição.

## Inclinação e navegação pela cabeça

**Inclinação (pitch).** O Face Landmarker roda com `outputFacialTransformationMatrixes: true`. A matriz de pose (rosto canônico → câmera, +y para cima, rosto olhando para +z) dá o eixo frontal do rosto na 3ª coluna:

```
 pitch = atan2(−frente.y, frente.z)        (graus; + = olhando para baixo)
```

O layout da matriz (por linhas ou por colunas) não é documentado; o código o **detecta em runtime** pela posição da translação. O neutro de inclinação entra na mesma calibração (mediana), porque a webcam abaixo dos olhos dá uma inclinação de repouso. O valor publicado (`store.pitch`) é relativo ao neutro e filtrado (One Euro em graus, `gesture.filter`).

Validado com vídeo sintético: neutro 0,0° (±0,03°), distorção "para baixo" +3,2°, "para cima" −3,5°. O sinal confere. Distorções fortes chegam a ±9,5°; uma cabeça real chega a 15–30°. Teste ponta a ponta (limite reduzido temporariamente para 6°/3°, já restaurado): cabeça mantida para baixo rolou +1351 px, para cima −1456 px, neutro 0 px, no máximo 97 px por 200 ms (sem saltos).

**Modo "navegar com a cabeça"** (opt-in, decisão D10 do plano da landing): **inclinar e segurar começa a rolar; manter a cabeça inclinada continua rolando; voltar ao centro para.**

| Parâmetro (`trackingConfig.gesture`) | Valor | Papel |
|---|---|---|
| `thresholdDeg` | 12° | Inclinação que arma o gesto |
| `releaseDeg` | 6° | Uma vez armado ou rolando, continua até a cabeça voltar abaixo disso (histerese) |
| `holdMs` | 450 ms | Tempo segurando antes de começar a rolar (protege contra disparos acidentais) |
| `fullSpeedDeg` | 26° | Inclinação de velocidade máxima |
| `speed` | 0,25 → 1,1 telas/s | Velocidade da rolagem, de recém-engatado à inclinação máxima |
| `minConfidence` | 0,6 | Frames de baixa qualidade não contam (e interrompem a rolagem) |

- Reconhecedor puro em `utils/headGesture.ts` (`HoldGesture`): armar → engatado (rolando, com intensidade) → parado. Cenários testados: segurar 3 s rola ~2,5 s; 30° atinge intensidade 1; aliviar para 7° continua e 4° para; inverter a direção para (o outro sentido exige novo "segurar"); aceno rápido, postura de leitura (8°) e baixa confiança não rolam.
- O store publica `gesture` (`direction`, `progress` do armar, `engaged`, `intensity`). A landing (`HeadNavigation`) rola a página continuamente num loop rAF enquanto `engaged`: **cabeça para baixo → desce**, **para cima → sobe**. A velocidade é em telas por segundo (igual em qualquer monitor) e o anúncio para leitor de tela acontece no início e no fim.
- Liga/desliga: `setHeadNavigation()` em `controls.ts`. Ligar também liga a câmera. Desligar a câmera, um erro ou uma permissão negada desligam o modo.
- **Câmera na página toda (D6, revista em 2026-10-12):** ligada, a câmera continua ativa fora do hero, com ou sem o modo de navegação. A cabeça move a vista no hero e olha ao redor na floresta (`ForestJourney`: com a câmera ligada, a cabeça tem precedência sobre o mouse). Ela desliga ao ocultar a aba e retoma ao voltar.
- Limitação conhecida: olhar para o teclado por mais de meio segundo com o modo ligado começa a rolar (é uma inclinação real > 12°), e a rolagem continua até a cabeça voltar. Por isso o modo é opt-in e fácil de desligar.

## Ajustes rápidos

| Sintoma | Ajuste em `trackingConfig.ts` |
|---|---|
| Precisa mover muito a cabeça | Diminuir `sensitivity.rangeX` / `rangeY` |
| Treme parado | Diminuir `filter.minCutoff` ou aumentar `deadZone` |
| Atraso perceptível | Aumentar `filter.beta` |
| Vertical forte demais | Aumentar `sensitivity.rangeY` ou reduzir `sceneConfig.motion.maxEye.y` |
| Perde o rosto à toa | Reduzir `mediapipe.minTrackingConfidence` / `minFacePresenceConfidence` |
| Navegação dispara sem querer | Aumentar `gesture.thresholdDeg` ou `gesture.holdMs` |
| Navegação difícil de acionar | Reduzir `gesture.thresholdDeg` (mínimo sensato ~9°) ou `gesture.holdMs` |
| Rolagem lenta ou rápida demais | `gesture.speed.min` / `.max` (telas por segundo) ou `gesture.fullSpeedDeg` |
| Rolagem não para quando volto ao centro | Aumentar `gesture.releaseDeg` |

## Depuração

- Painel de debug (`HeadTrackingDebugPanel`): oculto por padrão; aparece com `?debug` na URL e a tecla `D` alterna. Mostra o status da webcam e do tracking, a fonte, o offset X/Y, a inclinação, o estado da navegação (direção, progresso, nº de gestos), a confiança, a inferência (ms + delegate), o último erro técnico e o botão Recalibrar.
- Valores medidos no teste ponta a ponta (Chrome headless, webcam falsa, SwiftShader): inferência 10–15 ms com delegate GPU; da calibração ao primeiro `tracking` em ~0,5 s; recalibrar leva ~0,5 s.
- O console mostra logs internos do MediaPipe (`gl_context.cc`, `XNNPACK delegate`, alguns como `console.error`). São informativos e não indicam falha.
- Webcam falsa no Chrome: `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-video-capture=rosto.y4m` (ver [testing-checklist.md](../qa/testing-checklist.md)).
