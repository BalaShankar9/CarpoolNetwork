import {generateKeyPairSync} from 'node:crypto';
import {existsSync,writeFileSync} from 'node:fs';
if(existsSync('.dev.vars'))throw Error('.dev.vars already exists; existing keys were preserved.');
const pair=generateKeyPairSync('ed25519',{publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
writeFileSync('.dev.vars',`INTEGRITY_PRIVATE_KEY=${JSON.stringify(pair.privateKey)}\nINTEGRITY_PUBLIC_KEY=${JSON.stringify(pair.publicKey)}\n`,{mode:0o600});
console.log('Local development keys created. Do not use them in a hosted environment.');
