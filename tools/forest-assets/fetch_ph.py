"""Download Poly Haven assets (CC0) listed on the command line: model gltf+bin+textures at a
resolution, extra texture maps, texture sets and HDRIs. Usage:
  fetch_ph.py OUT model:<id>:<res>[:extra_map,...] tex:<id>:<res>:<map,...> hdri:<id>:<res>"""
import json, os, subprocess, sys
UA = 'santuario-suspenso forest asset pipeline'
def get_json(url):
    return json.loads(subprocess.run(['curl', '-sfL', '-A', UA, url], check=True, capture_output=True).stdout)
def download(url, path, size=None):
    if os.path.exists(path) and (size is None or os.path.getsize(path) == size):
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.part'
    subprocess.run(['curl', '-sfL', '--retry', '3', '-A', UA, '-o', tmp, url], check=True)
    os.replace(tmp, path)
    print('  ok', os.path.relpath(path, out), round(os.path.getsize(path) / 1e6, 1), 'MB', flush=True)
out = sys.argv[1]
for spec in sys.argv[2:]:
    kind, id, res, *rest = spec.split(':')
    files = get_json(f'https://api.polyhaven.com/files/{id}')
    print(spec, flush=True)
    if kind == 'model':
        g = files['gltf'][res]['gltf']
        base = os.path.join(out, 'models', id)
        download(g['url'], os.path.join(base, os.path.basename(g['url'])), g['size'])
        for rel, info in g['include'].items():
            download(info['url'], os.path.join(base, rel), info['size'])
        for extra in (rest[0].split(',') if rest else []):
            fmt = files[extra][res]
            e = fmt.get('png') or fmt.get('jpg')
            download(e['url'], os.path.join(base, 'textures', os.path.basename(e['url'])), e['size'])
    elif kind == 'tex':
        base = os.path.join(out, 'textures', id)
        for m in rest[0].split(','):
            fmt = files[m][res]
            e = fmt.get('jpg') or fmt.get('png')
            download(e['url'], os.path.join(base, os.path.basename(e['url'])), e['size'])
    elif kind == 'hdri':
        e = files['hdri'][res]['hdr']
        download(e['url'], os.path.join(out, 'hdri', os.path.basename(e['url'])), e['size'])
