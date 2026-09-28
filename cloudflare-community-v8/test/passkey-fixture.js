// Synthetic authenticator for local protocol integration tests. No real keys or
// browser credential store is accessed. This is not evidence of phone support.
import {createHash,generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {isoCBOR} from '@simplewebauthn/server/helpers';
const digest=data=>createHash('sha256').update(data).digest();
export function authenticator(origin){
  const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const jwk=publicKey.export({format:'jwk'}),id=randomBytes(32),rp=digest(new URL(origin).hostname);
  const publicCose=isoCBOR.encode(new Map([[1,2],[3,-7],[-1,1],[-2,new Uint8Array(Buffer.from(jwk.x,'base64url'))],[-3,new Uint8Array(Buffer.from(jwk.y,'base64url'))]]));
  const envelope=response=>({id:id.toString('base64url'),rawId:id.toString('base64url'),type:'public-key',clientExtensionResults:{},response});
  const client=(type,challenge,actualOrigin=origin)=>Buffer.from(JSON.stringify({type,challenge,origin:actualOrigin,crossOrigin:false}));
  return {
    register(challenge){
      const authData=Buffer.concat([rp,Buffer.from([0x45]),Buffer.alloc(4),Buffer.alloc(16),Buffer.from([0,id.length]),id,publicCose]);
      const attestation=isoCBOR.encode(new Map([['fmt','none'],['attStmt',new Map()],['authData',new Uint8Array(authData)]]));
      return envelope({attestationObject:Buffer.from(attestation).toString('base64url'),clientDataJSON:client('webauthn.create',challenge).toString('base64url'),transports:['internal']});
    },
    login(challenge,userId,counter=1,actualOrigin=origin){
      const n=Buffer.alloc(4);n.writeUInt32BE(counter);const authData=Buffer.concat([rp,Buffer.from([5]),n]);
      const clientData=client('webauthn.get',challenge,actualOrigin);
      return envelope({authenticatorData:authData.toString('base64url'),clientDataJSON:clientData.toString('base64url'),signature:sign('sha256',Buffer.concat([authData,digest(clientData)]),privateKey).toString('base64url'),userHandle:Buffer.from(userId).toString('base64url')});
    }
  };
}
