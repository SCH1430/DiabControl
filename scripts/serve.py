"""Serve only the application assets at a stable, loopback-only address."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse
import mimetypes
import webbrowser

ROOT = Path(__file__).resolve().parent.parent
ENTRY = ROOT / 'index.html'
ROUTES = {'/': ENTRY, '/index.html': ENTRY, '/sw.js': ROOT / 'web/sw.js',
          '/manifest.webmanifest': ROOT / 'web/manifest.webmanifest'}
for name in ('icon.svg', 'icon-192.png', 'icon-512.png'):
    ROUTES['/icons/' + name] = ROOT / 'web/icons' / name

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        target = ROUTES.get(path)
        if target is None or not target.is_file():
            self.send_error(404)
            return
        payload = target.read_bytes()
        mime = 'application/manifest+json' if path.endswith('.webmanifest') else mimetypes.guess_type(target.name)[0]
        self.send_response(200)
        self.send_header('Content-Type', (mime or 'application/octet-stream') + ('; charset=utf-8' if mime in ('text/html', 'text/javascript', 'application/javascript') else ''))
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        pass

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--open', action='store_true', help='Open the browser')
    parser.add_argument('--port', type=int, default=8765, help='Keep the default port for existing data')
    args = parser.parse_args()
    if not ENTRY.exists() or not (ROOT / 'web/sw.js').exists():
        parser.error('Сначала выполните python3 scripts/build.py')
    address = f'http://localhost:{args.port}'
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    except OSError as error:
        parser.exit(1, f'Не удалось открыть {address}: {error}\nЕсли приложение уже запущено, откройте этот адрес в браузере.\n')
    print(f'DiabControl: {address}\nОставьте это окно открытым до готовности офлайн-режима. Ctrl+C — остановить.', flush=True)
    if args.open:
        webbrowser.open(address)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
