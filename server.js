import http from 'http';
import path, { dirname } from 'path';
import fs from 'fs';
import url, { fileURLToPath } from 'url';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve(__dirname);

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname);
  if (pathname === '/' || pathname === '') filePath = path.join(PUBLIC_DIR, 'volleyball_replay_v1.html');
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const stream = fs.createReadStream(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    stream.pipe(res);
  });
}

function proxyRequest(req, res, targetUrl, raw = false) {
  try {
    const parsed = new URL(targetUrl);
    const protoReq = parsed.protocol === 'https:' ? httpsRequest : httpRequest;
    const options = { hostname: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80), path: parsed.pathname + (parsed.search || ''), method: 'GET', headers: { 'User-Agent': 'local-proxy' } };
    const proxy = protoReq(options, (pres) => {
      const chunks = [];
      pres.on('data', c => chunks.push(c));
      pres.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (raw) {
          res.writeHead(200, { 'Content-Type': pres.headers['content-type'] || 'application/json' });
          res.end(body);
        } else {
          // Mirror allorigins.win get format: { contents: string }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ contents: body }));
        }
      });
    });
    proxy.on('error', (e) => { res.writeHead(502, { 'Content-Type': 'text/plain' }); res.end('Bad Gateway: ' + e.message); });
    proxy.end();
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Proxy Error: ' + err.message);
  }
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname.startsWith('/proxy/get')) {
    const target = parsed.query.url;
    if (!target) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Missing url parameter'); return; }
    proxyRequest(req, res, target, false);
    return;
  }
  if (parsed.pathname.startsWith('/proxy/raw')) {
    const target = parsed.query.url;
    if (!target) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Missing url parameter'); return; }
    proxyRequest(req, res, target, true);
    return;
  }
  // Serve static files for everything else
  let pathname = decodeURIComponent(parsed.pathname.replace(/\.\./g, ''));
  if (pathname === '/') pathname = '/volleyball_replay_v1.html';
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Local server running at http://localhost:${PORT}/`);
  console.log('Proxy endpoints:');
  console.log(`  /proxy/get?url=<encoded_url>  -> returns { contents: string }`);
  console.log(`  /proxy/raw?url=<encoded_url>  -> returns raw content`);
});
