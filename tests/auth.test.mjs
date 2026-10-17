import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SignJWT} from 'jose';
import {hashPassword,verifyPassword,DUMMY_HASH} from './password.mjs';
import {signSession,verifySession} from './session-token.mjs';
const secret='test-only-key-that-is-at-least-thirty-two-characters';
test('salted scrypt hashes verify the password and reject incorrect values',async()=>{
 const first=await hashPassword('a long test-only passphrase');const second=await hashPassword('a long test-only passphrase');assert.notEqual(first,second);assert.ok(!first.includes('passphrase'));assert.equal(await verifyPassword('a long test-only passphrase',first),true);assert.equal(await verifyPassword('wrong',first),false);assert.equal(await verifyPassword('wrong',DUMMY_HASH),false);assert.equal(await verifyPassword('x','corrupted'),false);
});
test('session JWTs validate their signature, subject, and revocation identifier',async()=>{
 const token=await signSession(secret,'user-one','session-one');assert.deepEqual(await verifySession(secret,token),{userId:'user-one',sessionId:'session-one'});await assert.rejects(verifySession(secret+'wrong',token));const parts=token.split('.');parts[1]=Buffer.from(JSON.stringify({sub:'other-user'})).toString('base64url');await assert.rejects(verifySession(secret,parts.join('.')));
});
test('expired, wrong-audience, missing-claims, and alternate-algorithm JWTs are rejected',async()=>{
 const key=new TextEncoder().encode(secret);
 for(const [alg,aud,exp,sub,jti] of [['HS256','commonplace-web','1s ago','user','session'],['HS256','wrong','1h','user','session'],['HS384','commonplace-web','1h','user','session'],['HS256','commonplace-web','1h','user',null]]){
  let jwt=new SignJWT({}).setProtectedHeader({alg}).setIssuer('commonplace').setAudience(aud).setSubject(sub).setIssuedAt().setExpirationTime(exp);if(jti)jwt=jwt.setJti(jti);await assert.rejects(verifySession(secret,await jwt.sign(key)));
 }
 await assert.rejects(signSession('weak','user','session'));
});
