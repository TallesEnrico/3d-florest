# Evolução Técnica

Para onde a cena pode crescer a partir da arquitetura atual (3 planos pintados + câmera off-axis). Cada caminho reaproveita o que existe: o contrato `ViewInput`, a `WindowCamera` e o `sceneConfig`.

## 1. Depth map (relevo dentro de cada camada)

**Hoje:** cada camada é plana. A paralaxe existe **entre** camadas, mas uma ilha não tem volume próprio.

**Evolução:**
1. Gerar profundidade por pixel **por camada** (ex.: Depth Anything V2 sobre cada PNG, mascarado pelo alfa), salvando em `depth/<camada>-depth.png` (convenção já definida no [asset-spec §7](../art/asset-spec.md#7-profundidade-depth)).
2. Trocar o `planeGeometry` da camada por um plano **subdividido** (ex.: 256×144) e deslocar os vértices em z pela depth (*displacement* no vertex shader), com amplitude pequena (≤ 30% da distância até a camada vizinha).
3. A câmera off-axis já trata o resto: o relevo ganha paralaxe interna sem código extra.

**Cuidados:** *stretching* nas bordas de silhuetas (resolver com *depth dilation* ou com o alfa recortando os triângulos esticados); a depth precisa ser suave; o orçamento de movimento continua valendo (relevo positivo aproxima a borda da camada).

**Alternativa barata:** *parallax occlusion mapping* no fragment shader (sem mais vértices). Bom para relevo sutil, ruim em ângulos grandes.

## 2. Shaders (vida na pintura)

As máscaras do step 2 já existem e esperam por isto:

| Efeito | Máscara | Técnica |
|---|---|---|
| Água ondulando + brilho especular que reage à cabeça | `midground-water-mask.png` | Distorção de UV com ruído animado só onde a máscara é 1; brilho pelo ângulo olho→sol |
| Névoa à deriva dentro do midground | `midground-mist-mask.png` | Somar ruído animado à cor/alfa nas áreas de névoa (hoje a névoa é só procedural, entre camadas) |
| Brilho bioluminescente | `foreground-emissive-mask.png` | **Já implementado** (`LayerGlowMaterial`): pulso em onda |
| Cachoeiras fluindo | Falta máscara (`midground-waterfall-mask.png`) | UV rolando verticalmente na máscara + espuma na base |
| Cipós balançando | Falta máscara | Deslocamento senoidal de vértices ponderado pela máscara (precisa de plano subdividido) |

**Padrão a seguir:** um `ShaderMaterial` por camada (como `LayerGlowMaterial`), amostrando o mapa em sRGB e as máscaras como dados, com `#include <colorspace_fragment>` no fim e tempo vindo de `sceneTime`. Se forem vários efeitos na mesma camada, um único shader com uniforms de liga/desliga é melhor que vários planos sobrepostos.

**Pós-processamento** (bloom seletivo, DOF por camada, grão): `@react-three/postprocessing` custa ~1 passe de tela cheia por efeito. Só vale com orçamento de performance medido. O DOF ligado ao foco do usuário seria o mais interessante para a ilusão.

## 3. Ambiente 3D real

**Quando faz sentido:** quando se quiser movimento amplo (andar pela cena, girar a cabeça, eixo Z grande) que a pintura 2.5D não sustenta.

**Caminhos, do mais próximo ao mais distante do atual:**
1. **Híbrido (recomendado como próximo passo):** manter o céu e o fundo pintados como planos distantes e substituir o midground por **geometria 3D** das ilhas (malhas low/mid-poly com texturas projetadas da pintura). Partículas e névoa 3D já se encaixam. A `WindowCamera` não muda.
2. **Gaussian Splatting / NeRF** a partir de imagens geradas em múltiplas vistas: fidelidade visual alta, mas pesado para web e difícil de dirigir artisticamente.
3. **Cena totalmente modelada** (glTF + PBR + iluminação): máximo controle e movimento livre, mas exige pipeline de modelagem e uma direção de arte nova (tone mapping, luzes), e deixa de ser `flat`.

**O que se mantém em qualquer caminho:** o contrato `ViewInput` (tracking → cena), a projeção off-axis (a tela continua sendo a janela) e o fallback para o mouse. A câmera da cena é independente de os objetos serem planos ou malhas.

**O que muda:** limites de movimento passam a vir de *bounds* da cena em vez do overscan; entram iluminação e tone mapping; o orçamento de performance precisa ser refeito (draw calls, sombras, LOD).

## 4. Eixo Z (aproximação da cabeça)

Ver [scene-logic.md](./scene-logic.md#eixo-z-aproximação). É a evolução mais barata e de maior efeito na sensação de janela: exige overscan extra no background (~10% para ±10% de distância) e expor `z` no `ViewInput` (a medida de IPD já existe no tracking).
