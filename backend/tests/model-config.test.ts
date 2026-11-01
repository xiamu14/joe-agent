import test from 'node:test';
import assert from 'node:assert/strict';
import { JOE_MODELS_JSON } from '../src/config/models';
import { loadModels, models, decisionModels, ocrModels, modelById } from '../src/joe/config';

test('source configuration separates decision models from chat and settings', () => {
  assert.equal(loadModels().length, JOE_MODELS_JSON.length);
  assert.ok(models.length > 0);
  assert.ok(models.every(model => model.type === 'Think'));
  assert.ok(decisionModels.some(model => model.id === 'typesafe/jev-1.14'));
  for (const model of decisionModels) assert.throws(() => modelById(model.id));
  assert.equal(modelById(models[0].id).type, 'Think');
  assert.throws(() => loadModels('[{"id":"bad","label":"Bad","type":"Unknown"}]'));
});

test('legacy environment cannot override the source model list', () => {
  const previous = process.env.JOE_MODELS_JSON;
  try {
    process.env.JOE_MODELS_JSON = '[]';
    assert.equal(loadModels().length, JOE_MODELS_JSON.length);
  } finally {
    if (previous === undefined) delete process.env.JOE_MODELS_JSON;
    else process.env.JOE_MODELS_JSON = previous;
  }
});

test('OCR uses GPT-5 Nano without exposing it as a chat model', () => {
  assert.equal(ocrModels.length, 1);
  assert.equal(ocrModels[0].id, 'openai/gpt-5-nano');
  assert.equal(ocrModels[0].type, 'OCR');
  assert.throws(() => modelById(ocrModels[0].id));
});
