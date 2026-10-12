# Pipeline dos assets da floresta

Ferramentas **offline** que transformam os originais do Poly Haven (CC0) nos arquivos de `public/assets/forest/`. O site não usa nada daqui; as dependências ficam neste `package.json` próprio, fora do projeto.

Requisitos: Bun, Python 3 com Pillow (`pip install pillow`), `curl`. Instale as ferramentas uma vez, nesta pasta:

```sh
cd tools/forest-assets && bun install
```

## 1. Baixar os originais (resolução 1k)

Os originais vão para uma pasta de trabalho fora do repositório: só `fir_tree_01` já tem 487 MB.

```sh
python3 fetch_ph.py /tmp/forest-raw \
  model:fir_tree_01:1k:twig_alpha \
  model:fern_02:1k model:rock_moss_set_01:1k model:tree_stump_01:1k \
  model:dead_tree_trunk_02:1k model:pine_roots:1k \
  tex:forest_leaves_04:1k:Diffuse,nor_gl,arm tex:forest_ground_04:1k:Diffuse,nor_gl,arm \
  hdri:forest_slope:1k
```

## 2. Texturas → WebP

O alfa das agulhas é reconstruído a partir de `twig_alpha`, porque o glTF original usa JPG sem alfa.

```sh
python3 prep_textures.py /tmp/forest-raw/models/fir_tree_01/textures /tmp/forest-work/fir_tex \
  --alpha fir_tree_01_twig_diff_1k.jpg=fir_tree_01_twig_alpha_1k.png
for m in fern_02 rock_moss_set_01 tree_stump_01 dead_tree_trunk_02 pine_roots; do
  python3 prep_textures.py /tmp/forest-raw/models/$m/textures /tmp/forest-work/${m}_tex
done
python3 prep_textures.py /tmp/forest-raw/textures/forest_leaves_04 ../../public/assets/forest/textures
python3 prep_textures.py /tmp/forest-raw/textures/forest_ground_04 ../../public/assets/forest/textures
```

## 3. Modelos → GLB

Árvores: 3 níveis de detalhe, agulhas como cartões de raminho, troncos simplificados e meshopt. Os parâmetros ficam em `LODS`, no topo de `process_fir.ts`. Antes, gere os atlas de raminhos, um por nível. As escalas são as `twigScale` de `LODS`, e o script grava também `twig_sprites.json`:

```sh
T=/tmp/forest-raw/models/fir_tree_01/textures
python3 twig_clusters.py $T/fir_tree_01_twig_diff_1k.jpg $T/fir_tree_01_twig_alpha_1k.png /tmp/forest-work/twig \
  lod0:1:1024 lod1:1.4:1024 lod2:2:1024
bun process_fir.ts /tmp/forest-raw/models/fir_tree_01/fir_tree_01_1k.gltf /tmp/forest-work/fir_tex \
  ../../public/assets/forest/models/fir_trees.glb /tmp/forest-work/twig
```

(`twig_clusters.py` precisa de Pillow, NumPy e SciPy.)

Objetos de chão: `origem:texturas:fração de triângulos mantida`.

```sh
R=/tmp/forest-raw/models W=/tmp/forest-work
bun process_props.ts ../../public/assets/forest/models/forest_props.glb \
  $R/fern_02/fern_02_1k.gltf:$W/fern_02_tex:0.4 \
  $R/rock_moss_set_01/rock_moss_set_01_1k.gltf:$W/rock_moss_set_01_tex:0.3 \
  $R/tree_stump_01/tree_stump_01_1k.gltf:$W/tree_stump_01_tex:0.15 \
  $R/dead_tree_trunk_02/dead_tree_trunk_02_1k.gltf:$W/dead_tree_trunk_02_tex:0.15 \
  $R/pine_roots/pine_roots_1k.gltf:$W/pine_roots_tex:0.12
```

Objetos da cabana (multi-peça, sem simplificar), `nome:origem:texturas`:

```sh
bun process_groups.ts ../../public/assets/forest/models/cabin_props.glb \
  fire_pit:$R/stone_fire_pit/stone_fire_pit_1k.gltf:$W/stone_fire_pit_tex \
  lantern:$R/wooden_lantern_01/wooden_lantern_01_1k.gltf:$W/wooden_lantern_01_tex \
  axe:$R/wooden_axe/wooden_axe_1k.gltf:$W/wooden_axe_tex \
  bucket:$R/wooden_bucket_01/wooden_bucket_01_1k.gltf:$W/wooden_bucket_01_tex \
  crate:$R/wooden_crate_01/wooden_crate_01_1k.gltf:$W/wooden_crate_01_tex \
  stool:$R/wooden_stool_01/wooden_stool_01_1k.gltf:$W/wooden_stool_01_tex
```

Móveis do interior, do mesmo jeito. Antes, tire do divã os dois travesseiros cinza do próprio escaneamento (as peças que usam os quadrados adamascados do atlas); no site, os travesseiros coloridos ficam no lugar deles:

```sh
mkdir -p $W/vintage_day_bed_nopillows
bun drop_parts.ts $R/vintage_day_bed/vintage_day_bed_1k.gltf \
  $W/vintage_day_bed_nopillows/vintage_day_bed_1k.gltf 0.21,0.22,0.66,0.53
bun process_groups.ts ../../public/assets/forest/models/cabin_interior.glb \
  rocking_chair:$R/Rockingchair_01/Rockingchair_01_1k.gltf:$W/Rockingchair_01_tex \
  stove:$R/barrel_stove/barrel_stove_1k.gltf:$W/barrel_stove_tex \
  pot:$R/brass_pot_01/brass_pot_01_1k.gltf:$W/brass_pot_01_tex \
  day_bed:$W/vintage_day_bed_nopillows/vintage_day_bed_1k.gltf:$W/vintage_day_bed_tex \
  pillows:$R/throw_pillows_01/throw_pillows_01_1k.gltf:$W/throw_pillows_01_tex \
  table:$R/wooden_table_02/wooden_table_02_1k.gltf:$W/wooden_table_02_tex \
  oil_lamp:$R/vintage_oil_lamp/vintage_oil_lamp_1k.gltf:$W/vintage_oil_lamp_tex \
  bookshelf:$R/wooden_bookshelf_worn/wooden_bookshelf_worn_1k.gltf:$W/wooden_bookshelf_worn_tex
```

(baixe antes com `fetch_ph.py ... model:stone_fire_pit:1k model:wooden_lantern_01:1k …` e converta as texturas com `prep_textures.py`, como acima; as texturas `rough_wood` e `weathered_planks` vêm de `tex:<id>:1k:Diffuse,nor_gl,arm`).

Texturas do AmbientCG (telhado, frontões e pontas das toras): baixe o zip `1K-JPG` de cada uma (`https://ambientcg.com/get?file=<Id>_1K-JPG.zip`, ids `WoodSiding010`, `WoodSiding011`, `TreeEnd001`), descompacte numa pasta de trabalho e salve `Color` e `NormalGL` como WebP e `AmbientOcclusion`/`Roughness` combinados num ARM (R = AO, G = rugosidade, B = 0).

HDRI: copie `/tmp/forest-raw/hdri/forest_slope_1k.hdr` para `public/assets/forest/hdri/`.

Ao trocar ou adicionar um asset, registre fonte, autores e licença em `public/assets/forest/LICENSE.md`.
