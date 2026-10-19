import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function writeSecurityPolicy(output) {
  const filename = path.join(output, 'index.html');
  let html = await readFile(filename, 'utf8');
  const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .filter(([, code]) => code.trim())
    .map(([, code]) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`);
  const policy = `default-src 'self'; script-src 'self' ${hashes.join(' ')}; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://forms.yandex.ru`;
  html = html.replace(
    /(<meta charset="[^"]+"\s*\/?>)/i,
    `$1\n  <meta http-equiv="Content-Security-Policy" content="${policy}">`,
  );
  await writeFile(filename, html);
  await writeFile(
    path.join(output, '.htaccess'),
    `Options -Indexes
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "DENY"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  Header always set Content-Security-Policy "${policy}; frame-ancestors 'none'"
  <FilesMatch "\\.html$">
    Header always set Cache-Control "no-cache"
  </FilesMatch>
  <FilesMatch "-[a-zA-Z0-9_-]{8,}\\.(js|css|woff2|webp|avif)$">
    Header always set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
<IfModule mod_brotli.c>
  AddOutputFilterByType BROTLI_COMPRESS text/html text/css application/javascript image/svg+xml
</IfModule>
<IfModule mod_setenvif.c>
  SetEnvIfNoCase Accept-Encoding "br" no-gzip
</IfModule>
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml
</IfModule>
`,
  );
}
