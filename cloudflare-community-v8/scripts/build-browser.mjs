import { build } from 'esbuild';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
await build({
  stdin:{contents:"export {startRegistration,startAuthentication} from '@simplewebauthn/browser';",resolveDir:process.cwd()},
  outfile:'public/passkeys.js', bundle:true, format:'esm', platform:'browser',
  target:['es2022'], minify:true, legalComments:'eof',
  banner:{js:'/* Generated from pinned @simplewebauthn/browser. Rebuild with npm run build. MIT (c) 2020 Matthew Miller; see /attribution.html. */'}
});
await mkdir('public/vendor',{recursive:true});
for(const name of ['maplibre-gl.mjs','maplibre-gl-worker.mjs','maplibre-gl-shared.mjs','maplibre-gl.css'])await copyFile('node_modules/maplibre-gl/dist/'+name,'public/vendor/'+name);
const notices=await readFile('THIRD-PARTY-NOTICES.md','utf8');
const escaped=notices.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
await writeFile('public/third-party-notices.txt',notices);
await writeFile('public/attribution.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Attribution · Carpool Network</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/diagnostics.css"><main class="static-page"><a href="/">Back to Carpool Network</a><h1>Attribution and third-party licenses</h1><pre class="license-text">${escaped}</pre></main></html>`);
