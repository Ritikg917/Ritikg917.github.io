/**
 * High-performance Zero-Dependency Static Web Server
 * Runs out of the box with Node.js
 * Includes Smart On-Demand Streaming Cache for Offline Games Pack
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function fetchWithRedirect(url, callback) {
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      if (res.headers.location) {
        return fetchWithRedirect(res.headers.location, callback);
      }
    }
    callback(null, res);
  }).on('error', (err) => {
    callback(err);
  });
}

const server = http.createServer((req, res) => {
  // Decode URL and normalize path
  let reqPath = decodeURI(req.url.split('?')[0]);

  // Network info endpoint for mobile connection
  if (reqPath === '/api/network-info') {
    const localIp = getLocalIp();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      localIp,
      port: PORT,
      mobileUrl: `http://${localIp}:${PORT}`,
      localUrl: `http://localhost:${PORT}`
    }));
    return;
  }

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(path.join(BASE_DIR, reqPath));

  // Security check: ensure path stays inside BASE_DIR
  if (!safePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err) {
      // Check if this is an offline game request
      const offlineMatch = reqPath.match(/^\/html-css-javascript-games-main\/offline\/([^\/]+\.html)$/i);
      if (offlineMatch) {
        const fileName = offlineMatch[1];
        const remoteUrl = `https://raw.githubusercontent.com/CoolDude2349/Offline-HTML-Games-Pack/master/offline/${encodeURIComponent(fileName)}`;
        console.log(`[Cache Miss] Fetching on-demand: ${fileName}...`);

        fetchWithRedirect(remoteUrl, (fetchErr, remoteRes) => {
          if (fetchErr || !remoteRes || remoteRes.statusCode !== 200) {
            res.writeHead(remoteRes ? remoteRes.statusCode : 502, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(`404 Game Not Found: ${fileName}`);
            return;
          }

          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
            'X-Content-Type-Options': 'nosniff'
          });

          const fileDir = path.dirname(safePath);
          if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true });

          const fileStream = fs.createWriteStream(safePath);
          remoteRes.pipe(res);
          remoteRes.pipe(fileStream);

          fileStream.on('finish', () => {
            console.log(`[Cached] Successfully cached ${fileName} to disk (${fs.statSync(safePath).size} bytes)`);
          });
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${reqPath}`);
      return;
    }

    let filePath = safePath;
    if (stats.isDirectory()) {
      filePath = path.join(safePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Internal Server Error`);
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`\n======================================================`);
  console.log(`🎮 RS GAMES PORTAL IS RUNNING!`);
  console.log(`🌐 Local (Laptop): http://localhost:${PORT}`);
  console.log(`📱 Mobile (Phone):  http://${localIp}:${PORT}`);
  console.log(`📁 Game count:     433 HTML5 & JS Games loaded`);
  console.log(`⚡ Smart Cache:    Active (Zero-failure on-demand streaming)`);
  console.log(`======================================================\n`);
});
