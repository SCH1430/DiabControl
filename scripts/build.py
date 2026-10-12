"""Build the portable app and its optional installable shell using Python 3 only."""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parent.parent
ENTRY = ROOT / 'index.html'


def read(name):
    return (ROOT / name).read_text(encoding='utf-8')


def insert(source, marker, content):
    if source.count(marker) != 1:
        raise ValueError(f'Expected exactly one build marker: {marker}')
    return source.replace(marker, content)


def medical_art(source):
    """Keep the illustrated app portable: no runtime asset or network dependency."""
    def embed(match):
        name = match.group(1).lower().replace('_', '-')
        asset = ROOT / 'assets' / 'medical-art' / (name + '.png')
        encoded = base64.b64encode(asset.read_bytes()).decode('ascii')
        return 'data:image/png;base64,' + encoded
    return re.sub(r'__MEDICAL_ART_([A-Z0-9_]+)__', embed, source)


def javascript():
    source = read('src/app.js')
    included = set()
    pattern = re.compile(r'/\* MODULE:([a-z0-9/-]+) \*/')
    while pattern.search(source):
        def expand(match):
            name = match.group(1)
            if name in included:
                raise ValueError(f'Duplicate module: {name}')
            included.add(name)
            return read(f'src/{name}.js')
        source = pattern.sub(expand, source)
    return source


def build():
    html = insert(read('src/index.html'), '<!-- EXPLORE_MODALS -->', read('src/explore.html'))
    html = insert(html, '<!-- EMERGENCY_MODAL -->', read('src/emergency.html'))
    html = insert(html, '<!-- LEARNING_MODAL -->', read('src/learning.html'))
    html = insert(html, '<!-- START_GUIDE_MODAL -->', read('src/start-guide.html'))
    html = insert(html, '<!-- ENTRY_LAUNCHER_MODAL -->', read('src/entry-launcher.html'))
    css = '\n'.join(read(name) for name in ['src/styles.css', 'src/explore.css', 'src/usability.css', 'src/calm.css', 'src/design-system.css', 'src/emergency.css', 'src/emergency-guides.css', 'src/learning.css', 'src/start-guide.css', 'src/entry-launcher.css'])
    html = insert(html, '/* APP_CSS */', css)
    html = insert(html, '/* APP_JS */', javascript())
    html = medical_art(html)
    html = insert(html, '/* OCR_LIBRARY */', read('vendor/ocr/tesseract.min.js').replace('</script', '<\\/script'))
    vendor = ROOT / 'vendor/ocr'
    resources = {'worker': read('vendor/ocr/core.js') + '\n' + read('vendor/ocr/worker.min.js'),
                 'langs': {lang: base64.b64encode((vendor / (lang + '.traineddata.gz')).read_bytes()).decode() for lang in ['rus', 'eng']},
                 'licenses': {p.name: p.read_text(encoding='utf-8') for p in sorted(vendor.glob('LICENSE*'))}}
    html = insert(html, '/* OCR_RESOURCES */', json.dumps(resources, ensure_ascii=True).replace('</', '<\\/'))
    if re.search(r'/\* (?:MODULE:|APP_|OCR_|EXPLORE_|MEDIA_REFERENCES|PWA_JS)', html):
        raise ValueError('Unresolved build marker')
    assets = [ROOT / 'web/manifest.webmanifest', *sorted((ROOT / 'web/icons').glob('*'))]
    digest = hashlib.sha256(html.encode('utf-8') + read('src/service-worker.js').encode('utf-8'))
    for asset in assets:
        digest.update(asset.read_bytes())
    worker = insert(read('src/service-worker.js'), '__BUILD_HASH__', digest.hexdigest()[:16])
    return html, worker


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify the saved build without changing it')
    parser.add_argument('--web-output', type=Path, help='Export a static HTTPS-ready directory')
    args = parser.parse_args()
    html, worker = build()
    sw = ROOT / 'web/sw.js'
    if args.check:
        if not ENTRY.exists() or ENTRY.read_text(encoding='utf-8') != html or not sw.exists() or sw.read_text(encoding='utf-8') != worker:
            parser.exit(1, 'Build is stale. Run python3 scripts/build.py\n')
        print('Build is reproducible and up to date.')
        return
    ENTRY.write_text(html, encoding='utf-8')
    sw.write_text(worker, encoding='utf-8')
    if args.web_output:
        args.web_output.mkdir(parents=True, exist_ok=True)
        (args.web_output / 'index.html').write_text(html, encoding='utf-8')
        shutil.copytree(ROOT / 'web', args.web_output, dirs_exist_ok=True)
    print(f'Built DiabControl ({len(html.encode("utf-8")) / 1024 / 1024:.1f} MB, offline OCR included).')


if __name__ == '__main__':
    main()
