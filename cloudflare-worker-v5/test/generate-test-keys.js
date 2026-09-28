import {generateKeyPairSync} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519',{publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
writeFileSync(new URL('../.dev.vars',import.meta.url),`INTEGRITY_PRIVATE_KEY=${JSON.stringify(privateKey)}\nINTEGRITY_PUBLIC_KEY=${JSON.stringify(publicKey)}\n`,{mode:0o600,flag:'wx'});
console.log('Created local-only signing keys. Never upload these to production.');
