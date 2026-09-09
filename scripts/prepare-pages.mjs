import { cp, mkdir, writeFile, readFile, access, readdir, rm, rename } from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve('dist/client');
await access(path.join(source, 'index.html'));
const target = path.resolve('docs');
await mkdir(target, { recursive: true });
// docs/ is generated exclusively by this command.
for (const entry of await readdir(target)) await rm(path.join(target, entry), { recursive: true, force: true });
await cp(source, target, { recursive: true, filter: p => !['.vite', '.assetsignore', '_headers', 'vinext-client-entry-manifest.json'].includes(path.basename(p)) });
// The export nests prefixed assets, while Pages mounts docs/ at this prefix.
await rename(path.join(target, 'paper-plane-post', '_next'), path.join(target, '_next'));
await rm(path.join(target, 'paper-plane-post'), { recursive: true });
await writeFile(path.join(target, '.nojekyll'), '');
const html = await readFile(path.join(target, 'index.html'), 'utf8');
if (!html.includes('紙ひこうき郵便局') || !html.includes('とばす！')) throw new Error('Missing game content in export');
for (const match of html.matchAll(/(?:src|href)="(\/paper-plane-post\/[^"?#]+|\.\/[^"?#]+)"/g)) {
  await access(path.join(target, match[1].replace(/^\/paper-plane-post\//, '').replace(/^\.\//, '')));
}
await access(path.join(target, 'town.png'));
console.log('Validated GitHub Pages output: docs/');
