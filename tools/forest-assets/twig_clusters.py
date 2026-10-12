"""Twig atlases for the web trees (one per tree level of detail).

The scanned fir is ~1 M single-needle cards per tree. The web version (process_fir.ts) replaces
them with cards showing whole twigs — the 7 twig sprites of the same atlas, unused by the
original model — at natural size near the camera. Farther levels use fewer, larger cards: here
their twigs are redrawn as clusters of small twigs sized so that, once the card is enlarged,
the needles come back to their natural size. Same silhouette, natural needles, few triangles.

Usage: twig_clusters.py <twig_diff.jpg> <twig_alpha.png> <out_dir> <name>:<card scale>:<size> ...
  e.g. twig_clusters.py diff.jpg alpha.png out/ lod0:1:1024 lod1:2:1024 lod2:3.9:1024
Writes <out_dir>/fir_tree_01_twig_<name>.webp (RGBA) and <out_dir>/twig_sprites.json (the
sprites' boxes in UV, top-left origin like glTF, plus their size in atlas pixels).
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

diff_path, alpha_path, out_dir, *specs = sys.argv[1:]
color = Image.open(diff_path).convert('RGB')
alpha = Image.open(alpha_path).convert('L').resize(color.size)
src = Image.merge('RGBA', (*color.split(), alpha))
W, H = src.size
a = np.asarray(alpha).astype(float) / 255

# Twig sprites: alpha islands right of the bark strip and above the stems strip.
mask = a > 0.1
mask[:, : int(0.115 * W)] = False
mask[int(0.745 * H):, :] = False
labels, _ = ndimage.label(ndimage.binary_dilation(mask, iterations=6))
sprites = []
for index, region in enumerate(ndimage.find_objects(labels)):
    ys, xs = region
    if xs.start < 0.18 * W or mask[region].sum() < 1500:
        continue  # bark-strip border and tiny scraps
    own = (labels[region] == index + 1) & (a[region] > 0.1)
    sprites.append({'box': (xs.start, ys.start, xs.stop, ys.stop), 'mask': own})
print(f'{len(sprites)} twig sprites')
os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, 'twig_sprites.json'), 'w') as f:
    json.dump([{'uv': [x0 / W, y0 / H, x1 / W, y1 / H], 'px': [x1 - x0, y1 - y0]} for x0, y0, x1, y1 in (s['box'] for s in sprites)], f)

# Small twig sources: the sprites themselves, cropped (premultiplied for clean resizing).
sources = [src.crop(s['box']) for s in sprites]


def resized(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return image.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')


def composite_clipped(base: Image.Image, top: Image.Image, x: int, y: int) -> None:
    """Alpha-composites `top` onto `base` at (x, y), clipping whatever falls outside."""
    left, upper = max(0, -x), max(0, -y)
    right, lower = min(top.width, base.width - x), min(top.height, base.height - y)
    if right <= left or lower <= upper:
        return
    base.alpha_composite(top, dest=(x + left, y + upper), source=(left, upper, right, lower))


rng = np.random.default_rng(7)
for spec in specs:
    name, scale_text, size_text = spec.split(':')
    scale, size = float(scale_text), int(size_text)
    k = size / W
    atlas = src.resize((size, size), Image.LANCZOS)
    # Small twigs: 1.3× natural size once enlarged (a little larger reads denser, fewer needed).
    # Up to 2.6× the sprites stay as photographed (redrawn clusters read as solid blobs there).
    shrink = 1.3 / scale
    for sprite in (sprites if shrink < 0.5 else []):
        x0, y0, x1, y1 = (round(v * k) for v in sprite['box'])
        bw, bh = x1 - x0, y1 - y0
        own = np.asarray(Image.fromarray(sprite['mask'].astype(np.uint8) * 255).resize((bw, bh))) > 127
        target = min(0.45, 1.15 * own.mean())  # about as dense as the original twig
        ys, xs = np.nonzero(own)
        cluster = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
        twig_size = max(6, round(max(bw, bh) * shrink))
        for count in range(4000):
            source = sources[rng.integers(len(sources))]
            ratio = twig_size / max(source.size)
            twig = resized(source, (max(2, round(source.width * ratio)), max(2, round(source.height * ratio))))
            # Mostly pointing outward like the sprite (up in the atlas), some at random.
            angle = rng.normal(0, 32) if rng.random() < 0.85 else rng.uniform(-180, 180)
            twig = twig.rotate(angle, resample=Image.BICUBIC, expand=True)
            if rng.random() < 0.5:
                twig = twig.transpose(Image.FLIP_LEFT_RIGHT)
            # Later twigs sit on top: slightly lighter (outer needles catch more light).
            shade = 0.72 + 0.3 * min(1, count / 300) + rng.uniform(-0.06, 0.06)
            r, g, b, al = twig.split()
            twig = Image.merge('RGBA', (*(c.point(lambda v, s=shade: min(255, int(v * s))) for c in (r, g, b)), al))
            i = rng.integers(len(xs))
            composite_clipped(cluster, twig, int(xs[i] - twig.width / 2), int(ys[i] - twig.height / 2))
            if count % 20 == 19 and (np.asarray(cluster)[..., 3] > 100).mean() >= target:
                break
        # Fade the cluster out toward the sprite's box: the card shows the whole box, so a twig
        # cut by the box edge would draw a straight line.
        margin = max(3, twig_size * 0.45)
        yy, xx = np.mgrid[0:bh, 0:bw]
        edge = np.minimum.reduce([xx, yy, bw - 1 - xx, bh - 1 - yy]).astype(float)
        fade = np.clip(edge / margin, 0, 1) ** 1.5
        pixels = np.asarray(cluster).copy()
        pixels[..., 3] = (pixels[..., 3] * fade).astype(np.uint8)
        cluster = Image.fromarray(pixels, 'RGBA')
        # Replace the sprite (only its own pixels and the cluster's) in the atlas.
        region = atlas.crop((x0, y0, x1, y1))
        base = np.asarray(region).copy()
        own_dilated = ndimage.binary_dilation(own, iterations=max(2, twig_size // 3))
        base[own_dilated, 3] = 0
        merged = Image.alpha_composite(Image.fromarray(base), cluster)
        atlas.paste(merged, (x0, y0))
        print(f'  {name}: sprite {bw}×{bh}, {count + 1} twigs of {twig_size} px')

    # Alpha: a little boost so the needles survive mipmapping (alpha-to-coverage keeps it soft).
    rgba = np.asarray(atlas).astype(float)
    al = np.clip(rgba[..., 3] * 1.2, 0, 255)
    # Bleed color into transparent pixels (no dark fringes when filtered).
    weight = ndimage.gaussian_filter(al, 3) + 1e-3
    bled = np.stack([ndimage.gaussian_filter(rgba[..., c] * al, 3) / weight for c in range(3)], -1)
    rgb = np.where((al > 8)[..., None], rgba[..., :3], bled)
    out = Image.fromarray(np.dstack([rgb, al]).clip(0, 255).astype(np.uint8), 'RGBA')
    path = os.path.join(out_dir, f'fir_tree_01_twig_{name}.webp')
    out.save(path, 'WEBP', quality=88, method=6, alpha_quality=100, exact=True)
    print(f'{name}: {path} ({os.path.getsize(path) // 1024} KB)')
