import assert from 'node:assert/strict';
import test from 'node:test';

const SHA = '5dbda2127357b4be87821902d36e4ce9560f6876';
const BASE = `https://raw.githubusercontent.com/ORESoftware/ores-interfaces/${SHA}/contracts/ores-compose-machine/v1`;
const response = await fetch(`${BASE}/authored.schema.json`);
assert.equal(response.status, 200);
const defs = (await response.json()).$defs;
const codes = defs.MachineErrorResponse.properties.code.anyOf.map((entry) => entry.const);

test('enqueue responses distinguish newly queued work from deduplicated work', () => {
  assert.equal(defs.EnqueueResponse.properties.deduplicated.type, 'boolean');
  assert.deepEqual(defs.EnqueueResponse.properties.state.anyOf.map((x) => x.const), ['queued','running']);
});

test('job status has one monotonic public lifecycle vocabulary', () => {
  const states = defs.JobStatusResponse.properties.state.anyOf.map((x) => x.const);
  assert.deepEqual(states, ['queued','running','ready','failed']);
  assert.equal(new Set(states).size, states.length);
});

test('stale-generation failure is distinct from machine-busy queue contention', () => {
  assert.ok(codes.includes('stale_generation'));
  assert.ok(codes.includes('machine_busy'));
  assert.notEqual(codes.indexOf('stale_generation'), codes.indexOf('machine_busy'));
});

test('recovery can expose not-ready with no stale ActiveSystem object', () => {
  assert.equal(defs.ReadinessResponse.required.includes('active'), false);
  assert.equal(defs.JobStatusResponse.required.includes('active'), false);
  assert.equal(defs.ActiveSystem.required.includes('generation'), true);
});

test('queue saturation and activation failure are separately typed for retry policy', () => {
  assert.ok(codes.includes('queue_full'));
  assert.ok(codes.includes('activation_failed'));
  assert.ok(codes.includes('lazy_start_denied'));
  assert.equal(defs.MachineErrorResponse.properties.job_id.type, 'string');
  assert.equal(defs.MachineErrorResponse.required.includes('job_id'), false);
});
