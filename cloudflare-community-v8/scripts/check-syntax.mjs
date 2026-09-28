import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const walk = dir => readdirSync(dir, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(join(dir,entry.name)) : [join(dir,entry.name)]);
const files = ['src','public','scripts','test'].flatMap(walk).filter(file => /\.(?:m?js)$/.test(file));
for (const file of files) execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
console.log(`Syntax valid: ${files.length} application, service-worker, build and test scripts.`);
