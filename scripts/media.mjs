import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, unlink, utimes } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export async function prepareMedia(root) {
  const source = path.join(root, 'public');
  const output = path.join(root, '.generated/public');
  const media = path.join(output, 'media');
  await mkdir(media, { recursive: true });
  const manifest = new Map();
  const retained = new Set();
  const files = await readdir(source);

  for (const name of files.filter((name) => /\.(jpe?g|png)$/i.test(name))) {
    const input = await readFile(path.join(source, name));
    const metadata = await sharp(input).metadata();
    const rotated = metadata.orientation >= 5;
    const width = rotated ? metadata.height : metadata.width;
    const height = rotated ? metadata.width : metadata.height;
    const hash = createHash('sha256')
      .update(input)
      .update(`avif55-webp78-${sharp.versions.sharp}`)
      .digest('hex')
      .slice(0, 12);
    const stem = path.parse(name).name;
    const variants = [];
    for (const size of [
      ...new Set([192, 320, 480, 640, 960, Math.min(1440, width)].filter((size) => size <= width)),
    ].sort((a, b) => a - b)) {
      const filename = `${stem}-${hash}-${size}.webp`;
      retained.add(filename);
      const target = path.join(media, filename);
      try {
        await stat(target);
      } catch {
        await sharp(input)
          .autoOrient()
          .resize({ width: size, withoutEnlargement: true })
          .webp({ quality: 78 })
          .toFile(target);
      }
      const avifName = filename.replace('.webp', '.avif');
      retained.add(avifName);
      const avifTarget = path.join(media, avifName);
      try {
        await stat(avifTarget);
      } catch {
        await sharp(input)
          .autoOrient()
          .resize({ width: size, withoutEnlargement: true })
          .avif({ quality: 55, effort: 4 })
          .toFile(avifTarget);
      }
      variants.push({ url: `/media/${filename}`, avif: `/media/${avifName}`, width: size });
    }
    manifest.set(name, { width, height, variants });
  }

  for (const filename of await readdir(media)) {
    if (!retained.has(filename)) await unlink(path.join(media, filename));
  }
  const copyStatic = async (relative = '') => {
    for (const entry of await readdir(path.join(source, relative), { withFileTypes: true })) {
      const name = path.join(relative, entry.name);
      const destination = path.join(output, name);
      if (entry.isDirectory()) {
        await mkdir(destination, { recursive: true });
        await copyStatic(name);
      } else if (relative || !/\.(jpe?g|png)$/i.test(name)) {
        const original = path.join(source, name);
        const info = await stat(original);
        const current = await stat(destination).catch(() => null);
        if (
          !current ||
          current.size !== info.size ||
          Math.abs(current.mtimeMs - info.mtimeMs) > 1
        ) {
          await copyFile(original, destination);
          await utimes(destination, info.atime, info.mtime);
        }
      }
    }
  };
  await copyStatic();
  return manifest;
}

export function responsiveImages(manifest) {
  let index = 0;
  return (html) =>
    html.replace(/<img\b[^>]*>/g, (tag) => {
      const source = tag.match(/\bsrc="([^"]+)"/)?.[1];
      const image = manifest.get(source?.replace(/^\//, ''));
      if (!image) return tag;
      const fallback =
        image.variants.find((variant) => variant.width >= 640) ?? image.variants.at(-1);
      const sizes =
        tag.match(/\bsizes="([^"]+)"/)?.[1] ??
        (tag.includes('fetchpriority="high"')
          ? '(min-width: 768px) 320px, (min-width: 640px) 208px, 176px'
          : tag.includes('loading="lazy"')
            ? '(min-width: 768px) 352px, (min-width: 640px) 288px, 256px'
            : '(min-width: 768px) 640px, 90vw');
      const attrs = ` srcset="${image.variants.map((variant) => `${variant.url} ${variant.width}w`).join(', ')}" sizes="${sizes}" width="${image.width}" height="${image.height}"`;
      let result = tag
        .replace(/\s+sizes="[^"]+"/, '')
        .replace(/\bsrc="[^"]+"/, `src="${fallback.url}"`)
        .replace(/\s*\/?>$/, `${attrs}>`);
      if (!result.includes('decoding=')) result = result.replace('<img ', '<img decoding="async" ');
      if (++index > 5 && !result.includes('loading='))
        result = result.replace('<img ', '<img loading="lazy" ');
      const avifSrcset = image.variants
        .map((variant) => `${variant.avif} ${variant.width}w`)
        .join(', ');
      return `<picture class="contents"><source type="image/avif" srcset="${avifSrcset}" sizes="${sizes}">${result}</picture>`;
    });
}
