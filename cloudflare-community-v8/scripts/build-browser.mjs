import { build } from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await build({
  stdin:{contents:"export {startRegistration,startAuthentication} from '@simplewebauthn/browser';",resolveDir:process.cwd()},
  outfile:'public/passkeys.js', bundle:true, format:'esm', platform:'browser',
  target:['es2022'], minify:true, legalComments:'eof',
  banner:{js:'/* Generated from pinned @simplewebauthn/browser. Rebuild with npm run build. MIT (c) 2020 Matthew Miller; see /attribution.html. */'}
});
await mkdir('public/vendor',{recursive:true});
for(const name of ['maplibre-gl.mjs','maplibre-gl-worker.mjs','maplibre-gl-shared.mjs','maplibre-gl.css'])await copyFile('node_modules/maplibre-gl/dist/'+name,'public/vendor/'+name);
