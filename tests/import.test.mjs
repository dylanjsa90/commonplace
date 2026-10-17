import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImport, processImport } from './url-import.mjs';

test('import handles CRLF, blank lines, normalized duplicates and URLs containing commas', () => {
  const rows = parseImport('  https://EXAMPLE.com/a#one\r\n\r\nhttps://example.com/a#two\nhttps://example.org/a,b?q=x,y');
  assert.equal(rows.length, 3);
  assert.equal(rows[0].url, 'https://example.com/a');
  assert.match(rows[1].error, /Duplicate/);
  assert.equal(rows[2].url, 'https://example.org/a,b?q=x,y');
});
test('import rejects malformed URLs, unsupported schemes, credentials and excessive lengths', () => {
  for (const input of ['hello', 'example.com', 'file:///tmp/test', 'javascript:alert(1)', 'https://u:p@example.com/', 'https://example.com/' + 'a'.repeat(3000)]) {
    assert.ok(parseImport(input)[0].error, input);
    assert.equal(parseImport(input)[0].url, undefined);
  }
});
test('import caps concurrent captures at three and processes every item once', async () => {
  let active = 0, peak = 0;
  const completed = [];
  await processImport([0,1,2,3,4,5,6], async item => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    completed.push(item); active--;
  });
  assert.equal(peak, 3);
  assert.deepEqual(completed.sort(), [0,1,2,3,4,5,6]);
});
test('stop finishes active captures without starting queued items', async () => {
  let stop = false;
  const completed = [];
  await processImport([0,1,2,3,4,5], async item => {
    await new Promise(resolve => setTimeout(resolve, 5));
    completed.push(item); stop = true;
  }, () => stop);
  assert.deepEqual(completed.sort(), [0,1,2]);
});
