import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUrl,extractPage,capturePage,isPrivateIp,decode} from './capture.mjs';
import {summarize} from './summarizer.mjs';
test('blocks private networks, credentials, alternative IP formats, and unsafe schemes',()=>{
  for(const url of ['http://localhost/','http://127.0.0.1/','http://2130706433/','http://0x7f000001/','http://[::1]/','http://[::ffff:127.0.0.1]/','http://10.1.2.3/','http://169.254.169.254/','https://a:b@example.com/','file:///etc/passwd','ftp://example.com/','https://example.com:8080/']) assert.throws(()=>normalizeUrl(url),url);
  assert.equal(normalizeUrl('https://EXAMPLE.COM/article#heading'),'https://example.com/article');
  assert.equal(isPrivateIp('fd00::1'),true); assert.equal(isPrivateIp('fe80::abcd'),true);assert.equal(isPrivateIp('2001:db8::1'),true);assert.equal(isPrivateIp('8.8.8.8'),false);
});
test('extracts metadata regardless of attribute order and strips executable content',()=>{
  const p=extractPage(`<html lang="en"><head><meta content="Design &amp; care" property="og:title"><meta name='description' content='Why design matters'><meta property="og:image" content="/photo.jpg"></head><body><nav>Navigation clutter</nav><main><h1>Design &amp; care</h1><p>Thoughtful designers build a human interface that brings simplicity and care to everyday life.</p><script>window.secret='never include this'</script><p>Good typography and clear design help readers find information and enjoy the visual experience.</p></main><footer>Subscribe clutter</footer></body></html>`,'https://example.com/article');
  assert.equal(p.title,'Design & care');assert.equal(p.description,'Why design matters');assert.equal(p.image,'https://example.com/photo.jpg');assert.ok(!p.rawText.includes('secret'));assert.ok(!p.rawText.includes('clutter'));assert.ok(p.topics.includes('Design'));assert.equal(p.metadata.language,'en');
  assert.equal(decode('&#x1f33f; &#8212; &amp;'),'🌿 — &');
});
test('summaries contain source sentences and overlapping relevant topics',()=>{
  const text='Software developers design an accessible web interface using thoughtful typography and visual design. The programming team makes the internet easier to navigate with consistent software components. A web designer can combine creative design and digital technology for a better user experience.';
  const p=summarize(text,'Designing software for the web','Accessible interface design');
  assert.ok(p.summary.includes('web'));assert.ok(p.topics.includes('Technology'));assert.ok(p.topics.includes('Design'));assert.ok(p.topics.length<=3);
  for(const sentence of p.summary.match(/[^.!?]+[.!?]/g)??[]) assert.ok(text.includes(sentence.trim()));
});
test('limited and blocked pages are explicitly marked partial',()=>{
  const p=extractPage('<html><title>Just a moment</title><body>Verify you are human</body></html>','https://example.com');assert.equal(p.status,'partial');assert.ok(p.error);
});
test('redirect targets and mixed private DNS answers are rejected before fetching',async()=>{
  const original=globalThis.fetch;const calls=[];
  try {
    globalThis.fetch=async url=>{calls.push(String(url));if(String(url).includes('dns-query'))return Response.json({Answer:[{type:1,data:'93.184.216.34'}]});return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});};
    await assert.rejects(capturePage('https://example.com/'),/public/);assert.ok(!calls.some(c=>c.includes('/private')));
    globalThis.fetch=async url=>{if(String(url).includes('dns-query'))return Response.json({Answer:[{type:1,data:'93.184.216.34'},{type:1,data:'10.0.0.1'}]});throw new Error('should never fetch');};
    await assert.rejects(capturePage('https://example.com/'),/public/);
  }finally{globalThis.fetch=original;}
});
test('rejects unsupported content types and excessive page sizes',async()=>{
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async url=>String(url).includes('dns-query')?Response.json({Answer:[{type:1,data:'93.184.216.34'}]}):new Response('pdf',{headers:{'content-type':'application/pdf'}});
    await assert.rejects(capturePage('https://example.com/'),/HTML and plain-text/);
    globalThis.fetch=async url=>String(url).includes('dns-query')?Response.json({Answer:[{type:1,data:'93.184.216.34'}]}):new Response('x'.repeat(3000001),{headers:{'content-type':'text/html'}});
    await assert.rejects(capturePage('https://example.com/'),/3 MB/);
  }finally{globalThis.fetch=original;}
});
