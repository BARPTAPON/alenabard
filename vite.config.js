import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { prepareMedia, responsiveImages } from './scripts/media.mjs';
import { writeSecurityPolicy } from './scripts/security.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const manifest = await prepareMedia(root);

export default defineConfig({
  publicDir: '.generated/public',
  plugins: [
    tailwindcss(),
    {
      name: 'responsive-media-and-security',
      transformIndexHtml: { order: 'pre', handler: (html) => responsiveImages(manifest)(html) },
      async writeBundle(options) {
        await writeSecurityPolicy(path.resolve(root, options.dir));
      },
    },
  ],
  base: '/',
  build: { target: 'baseline-widely-available' },
});
