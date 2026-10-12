"""Converts a model's textures folder to WebP (alpha merged where given). Usage:
  prep_textures.py SRC_DIR OUT_DIR [--alpha diff.jpg=alpha.png ...] [--size 1024]"""
import os, sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
args = sys.argv[3:]
alpha = {}
size = None
i = 0
while i < len(args):
    if args[i] == '--alpha':
        d, a = args[i + 1].split('='); alpha[d] = a; i += 2
    elif args[i] == '--size':
        size = int(args[i + 1]); i += 2
    else:
        i += 1
os.makedirs(out, exist_ok=True)
for name in sorted(os.listdir(src)):
    if not name.lower().endswith(('.jpg', '.png')) or name in alpha.values():
        continue
    im = Image.open(os.path.join(src, name))
    if name in alpha:
        im = im.convert('RGB')
        a = Image.open(os.path.join(src, alpha[name])).convert('L').resize(im.size)
        im.putalpha(a)
    else:
        im = im.convert('RGB')
    if size and im.width > size:
        im = im.resize((size, size * im.height // im.width), Image.LANCZOS)
    normal = '_nor' in name
    target = os.path.join(out, os.path.splitext(name)[0] + '.webp')
    im.save(target, 'WEBP', quality=90 if normal else 82, method=6, alpha_quality=100)
    print(f'{name} -> {os.path.basename(target)} {os.path.getsize(target)/1e3:.0f} KB')
