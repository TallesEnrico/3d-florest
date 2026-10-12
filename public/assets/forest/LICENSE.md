# Assets da floresta: fontes e licença

Todos os arquivos desta pasta vêm do **[Poly Haven](https://polyhaven.com)** ou do **[AmbientCG](https://ambientcg.com)** e estão sob **CC0** ([polyhaven.com/license](https://polyhaven.com/license), [ambientcg.com/license](https://ambientcg.com/license)): domínio público, uso comercial livre, sem atribuição obrigatória. Os créditos abaixo são registrados por cortesia.

| Arquivo | Asset de origem | Autores |
|---|---|---|
| `models/fir_trees.glb` | [fir_tree_01](https://polyhaven.com/a/fir_tree_01) | Rob Tuytel (fotografia), Rico Cilliers (modelagem) |
| `models/forest_props.glb` | [fern_02](https://polyhaven.com/a/fern_02) | Rob Tuytel (escaneamento), Rico Cilliers (modelagem) |
| | [rock_moss_set_01](https://polyhaven.com/a/rock_moss_set_01) | Kless Gyzen |
| | [tree_stump_01](https://polyhaven.com/a/tree_stump_01) | Rob Tuytel |
| | [dead_tree_trunk_02](https://polyhaven.com/a/dead_tree_trunk_02) | Jenelle van Heerden (fotografia), Rico Cilliers (processamento) |
| | [pine_roots](https://polyhaven.com/a/pine_roots) | Rob Tuytel |
| `textures/forest_leaves_04_*` | [forest_leaves_04](https://polyhaven.com/a/forest_leaves_04) | Rob Tuytel |
| `textures/forest_ground_04_*` | [forest_ground_04](https://polyhaven.com/a/forest_ground_04) | Rob Tuytel, Rico Cilliers |
| `hdri/forest_slope_1k.hdr` | [forest_slope](https://polyhaven.com/a/forest_slope) | Andreas Mischok |
| `models/cabin_props.glb` | [stone_fire_pit](https://polyhaven.com/a/stone_fire_pit) | Sebastian Platen |
| | [wooden_lantern_01](https://polyhaven.com/a/wooden_lantern_01) | James Ray Cock |
| | [wooden_axe](https://polyhaven.com/a/wooden_axe) | Ulan Cabanilla |
| | [wooden_bucket_01](https://polyhaven.com/a/wooden_bucket_01) | James Ray Cock |
| | [wooden_crate_01](https://polyhaven.com/a/wooden_crate_01) | James Ray Cock |
| | [wooden_stool_01](https://polyhaven.com/a/wooden_stool_01) | Kuutti Siitonen |
| `models/cabin_interior.glb` | [Rockingchair_01](https://polyhaven.com/a/Rockingchair_01) | Jorge Camacho |
| | [barrel_stove](https://polyhaven.com/a/barrel_stove) | MP |
| | [brass_pot_01](https://polyhaven.com/a/brass_pot_01) | Rico Cilliers |
| | [vintage_day_bed](https://polyhaven.com/a/vintage_day_bed) | Aron Łyczek |
| | [throw_pillows_01](https://polyhaven.com/a/throw_pillows_01) | Serhii Khromov |
| | [wooden_table_02](https://polyhaven.com/a/wooden_table_02) | Serhii Khromov |
| | [vintage_oil_lamp](https://polyhaven.com/a/vintage_oil_lamp) | Monsta3D |
| | [wooden_bookshelf_worn](https://polyhaven.com/a/wooden_bookshelf_worn) | Ulan Cabanilla |
| `textures/rough_wood_*` (toras da cabana) | [rough_wood](https://polyhaven.com/a/rough_wood) | Rob Tuytel |
| `textures/weathered_planks_*` (porta e acabamentos) | [weathered_planks](https://polyhaven.com/a/weathered_planks) | Dimitrios Savva (fotografia), Dario Barresi (processamento) |
| `textures/tree_end_001_*` (pontas das toras) | [TreeEnd001](https://ambientcg.com/view?id=TreeEnd001) (AmbientCG) | AmbientCG |
| `textures/wood_shingles_010_*` (telhado) | [WoodSiding010](https://ambientcg.com/view?id=WoodSiding010) (AmbientCG) | AmbientCG |
| `textures/wood_shingles_011_*` (frontões) | [WoodSiding011](https://ambientcg.com/view?id=WoodSiding011) (AmbientCG) | AmbientCG |

A **cabana** não é um modelo baixado: nenhuma das duas bibliotecas tem uma cabana CC0. A geometria (toras, porta, janelas, telhado e, por dentro, piso, forro, vigas e frontões) é construída no código (`src/features/forest/models/cabin.ts`) com as texturas fotográficas acima. Os objetos ao redor e os móveis de dentro são escaneados. A fogueira (lenha, brasas, chamas, faíscas, fumaça) também é gerada no código (`models/campfire.ts`).

## Processamento (versão web)

Os originais (resolução 1k) foram baixados da API do Poly Haven e otimizados com `@gltf-transform` + `meshoptimizer`. Os scripts e o passo a passo ficam em `tools/forest-assets/`, fora das dependências do site:

- **fir_tree_01** (3 abetos, 7,8 M triângulos, 487 MB):
  - cada árvore foi separada em 3 níveis de detalhe: `fir_{a,b,c}_lod0` (perto), `_lod1` (médio) e `_lod2` (longe);
  - troncos e galhos foram simplificados;
  - as agulhas avulsas (~1 milhão de cartões por árvore) foram substituídas por cartões de raminho inteiro, usando os 7 raminhos do próprio atlas: em tamanho natural perto e um pouco maiores longe;
  - a transparência foi reconstruída a partir do mapa `twig_alpha` (o glTF original usava JPG sem alfa);
  - o tronco `c`, que não tinha UV, ganhou UV cilíndrico com a casca repetida;
  - resultado: 6,2 MB.
- **Objetos de chão:** malhas simplificadas e centralizadas na origem, num único GLB (4,5 MB).
- **Objetos da cabana:** os seis modelos, cada um num nó com suas peças (porta do lampião, tampa do caixote…), sem simplificação, num único GLB (3,1 MB).
- **Móveis do interior:** os oito modelos do mesmo jeito, num único GLB (4,0 MB). Do divã saíram os dois travesseiros cinza do próprio escaneamento (`drop_parts.ts`); os travesseiros coloridos (`throw_pillows_01`) ficam no lugar deles. O vidro e a chama da lamparina vêm em JPG sem alfa; no site, a chama é desenhada de forma aditiva e o vidro como vidro claro (`cabin.ts`).
- **Texturas do AmbientCG:** convertidas para WebP; o mapa AO/rugosidade/metal (ARM) foi montado a partir dos mapas separados. O WoodSiding011 não traz rugosidade nem AO: AO derivado do mapa de deslocamento e rugosidade constante alta.
- **Texturas:** convertidas para WebP (`EXT_texture_webp`); geometria comprimida com `EXT_meshopt_compression` (decodificada pelo `MeshoptDecoder` do three).
