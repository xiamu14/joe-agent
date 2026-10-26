import test from 'node:test';
import assert from 'node:assert/strict';
import { visualState, emotions } from '../src/state.js';

test('thought and speech are more active than idle',()=>{
  assert.ok(visualState('thinking').energy > visualState('idle').energy);
  assert.ok(visualState('speaking').speed > visualState('idle').speed);
});
test('emotions affect speech, while fault colors take priority',()=>{
  for(const [emotion,palette] of Object.entries(emotions)) {
    assert.equal(visualState('speaking',emotion).color,palette.color);
    assert.equal(visualState('idle',emotion).color,emotions.calm.color);
    assert.equal(visualState('error',emotion).color,'#FF3B30');
    assert.equal(visualState('blocked',emotion).color,'#F75001');
  }
});
test('untrusted state events and non-finite audio levels are rejected',()=>{
  assert.throws(()=>visualState('__proto__'),RangeError);
  assert.throws(()=>visualState('speaking','unknown'),RangeError);
  assert.throws(()=>visualState('idle','calm',NaN),TypeError);
  assert.throws(()=>visualState('idle','calm',Infinity),TypeError);
  assert.equal(visualState('speaking','joy',20).level,1);
  assert.equal(visualState('speaking','joy',-1).level,0);
});

test('waiting is reference blue and offline overrides every emotion', () => {
  assert.equal(visualState().color, '#1A73F2');
  for (const emotion of Object.keys(emotions)) {
    assert.equal(visualState('offline', emotion).color, '#8E8E93');
    assert.equal(visualState('responding', emotion).color, emotions[emotion].color);
  }
});
