import { build } from 'esbuild';
await build({
  stdin:{contents:"export {startRegistration,startAuthentication} from '@simplewebauthn/browser';",resolveDir:process.cwd()},
  outfile:'public/passkeys.js', bundle:true, format:'esm', platform:'browser',
  target:['es2022'], minify:true, legalComments:'eof',
  banner:{js:'/* Generated from pinned @simplewebauthn/browser. Rebuild with npm run build. MIT (c) 2020 Matthew Miller; see /attribution.html. */'}
});
