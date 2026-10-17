const CACHE = 'zabota-v5';
const AUDIO = Array.from({ length: 13 }, (_, i) => 'audio/' + String(i + 1).padStart(2, '0') + '.m4a');
const SHELL = ['./', 'index.html', 'style.css?v=5', 'data.js?v=5', 'app.js?v=5', 'manifest.json', 'icons/icon-192.png', 'icons/apple-touch-icon.png'].concat(AUDIO);

// Safari plays audio with byte-range requests, so cached audio is sliced into 206 responses
async function audioResponse(req) {
  const cached = await caches.match(req.url.split('?')[0], { ignoreSearch: true });
  if (!cached) return fetch(req);
  const range = req.headers.get('range');
  if (!range) return cached;
  const buf = await cached.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const size = buf.byteLength;
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
  if (m && !m[1] && m[2]) { start = size - parseInt(m[2], 10); end = size - 1; }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': 'audio/mp4', 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' }
  });
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // audio: iOS asks for byte ranges, answer from cache as a whole file
  if (url.pathname.endsWith('.m4a')) {
    e.respondWith(audioResponse(req));
    return;
  }
  if (url.origin === location.origin) {
    // network first for the page so updates arrive, cache as fallback offline
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: false }).then(r => r || caches.match('index.html'))));
    return;
  }
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
  }
});
