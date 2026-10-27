import assert from 'node:assert/strict';
import test from 'node:test';
import { hostsEntry } from './local-name.mjs';

test('hosts setup appends only a missing alias and is idempotent', () => {
  const original = '127.0.0.1 localhost\n::1 localhost\n# genesis.test\n';
  const entry = hostsEntry(original, 'genesis.test');
  assert.equal(entry, '\n127.0.0.1 genesis.test # GENESIS local connection\n');
  assert.equal(hostsEntry(original + entry, 'genesis.test'), '');
  assert.equal(hostsEntry('127.0.0.1 localhost GENESIS.TEST # existing', 'genesis.test'), '');
  assert.notEqual(hostsEntry('127.0.0.1 notgenesis.test', 'genesis.test'), '');
});

test('hosts setup preserves conflicting entries and rejects unsafe hostnames', () => {
  for (const contents of ['10.0.0.2 genesis.test', '::1 genesis.test', '127.0.0.1 genesis.test\n10.0.0.2 genesis.test']) {
    assert.throws(() => hostsEntry(contents, 'genesis.test'), /already points/);
  }
  for (const hostname of ['', 'genesis.local', 'example.com', '-genesis.test', 'genesis.test\nextra', 'genesis.test;id']) {
    assert.throws(() => hostsEntry('', hostname), /local .test hostname/);
  }
});
