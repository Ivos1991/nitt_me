import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {build} from 'esbuild';

const result = await build({
  entryPoints: ['src/app.mjs'],
  bundle: true,
  minify: true,
  format: 'iife',
  legalComments: 'inline',
  write: false,
});

const html = await readFile('src/page.html', 'utf8');
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
await mkdir('dist', {recursive: true});
await writeFile('dist/Lulaah.html', html.replace('/*APP_BUNDLE*/', () => script));
