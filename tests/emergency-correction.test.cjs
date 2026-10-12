const test = require('node:test');
const assert = require('node:assert/strict');
const correction = require('../src/emergency-correction.js');

const plan = {
  correctionConfirmed: true,
  shortInsulinName: 'Назначенный болюсный инсулин',
  correctionTarget: 6,
  correctionFactor: 2,
  correctionStep: 0.5,
  correctionMax: 6,
};
const eligibility = { conscious: true, canSwallow: true };
const answers = {
  adultNotPregnant: true,
  ownPlanApplies: true,
  noRedFlags: true,
  noKetoneConcern: true,
  activeSource: 'pump',
  activeSourceConfirmed: true,
  activeInsulin: '1',
  lastDoseAt: '2026-01-01T10:00',
  recentDosePlan: true,
};
const evaluate = (p = plan, mmol = 13, a = answers, e = eligibility) => correction.evaluate(p, mmol, a, e);

test('correction uses its own sensitivity, subtracts explicit active insulin and floors device step', () => {
  assert.equal(evaluate({ ...plan, insulinPerXE: 999 }, 13.7).dose, 2.5);
  assert.equal(evaluate(plan, 13, { ...answers, activeInsulin: '1,2' }).dose, 2);
  assert.equal(evaluate(plan, 13, { ...answers, activeInsulin: '8' }).dose, 0);
});

test('small device steps retain expected decimal result and never round to nearest', () => {
  const p = { ...plan, correctionTarget: 10, correctionFactor: 1, correctionStep: 0.1 };
  assert.equal(evaluate(p, 11.3).dose, 0.3);
  assert.equal(evaluate(p, 11.39).dose, 0.3);
  assert.equal(evaluate({ ...p, correctionStep: 0.25 }).dose, 2);
  assert.equal(evaluate({ ...p, correctionStep: 0.25 }, 11.39).dose, 0.25);
});

test('missing plan values, name, consent, or invalid dimensions never produce a dose', () => {
  for (const key of ['correctionTarget', 'correctionFactor', 'correctionStep', 'correctionMax']) {
    for (const value of [null, undefined, NaN, Infinity, -1, 0, '2'])
      assert.equal(evaluate({ ...plan, [key]: value }).ok, false, `${key}: ${value}`);
  }
  for (const p of [{ ...plan, correctionConfirmed: false }, { ...plan, shortInsulinName: '' },
    { ...plan, correctionMax: 0.25 }, { ...plan, correctionStep: 0.001 }])
    assert.equal(evaluate(p).ok, false);
});

test('every safety confirmation is required; explicit root red flags override checked boxes', () => {
  for (const key of ['adultNotPregnant', 'ownPlanApplies', 'noRedFlags', 'noKetoneConcern', 'activeSourceConfirmed', 'recentDosePlan'])
    assert.equal(evaluate(plan, 13, { ...answers, [key]: false }).ok, false, key);
  for (const e of [{}, { conscious: false, canSwallow: true }, { conscious: true, canSwallow: false },
    { ...eligibility, noRedFlags: false }, { ...eligibility, noKetoneConcern: false }])
    assert.equal(evaluate(plan, 13, answers, e).ok, false);
});

test('unknown active insulin, invalid source, unknown or future last dose block results', () => {
  for (const value of [null, undefined, '', ' ', 'не знаю', -1, NaN, Infinity, '1e3'])
    assert.equal(evaluate(plan, 13, { ...answers, activeInsulin: value }).ok, false);
  assert.equal(evaluate(plan, 13, { ...answers, activeInsulin: '0' }).ok, true);
  for (const patch of [{ activeSource: '' }, { activeSource: 'diary' }, { lastDoseAt: '' }, { lastDoseAt: '2099-01-01T10:00' }])
    assert.equal(evaluate(plan, 13, { ...answers, ...patch }).ok, false);
});

test('non-numeric, low/normal, HI and above-personal-limit values block before displaying a dose', () => {
  for (const value of ['HI', '13', null, undefined, NaN, Infinity, -1, 3, 10, 61])
    assert.equal(correction.evaluate(plan, value, answers, eligibility).ok, false, String(value));
  assert.equal(evaluate(plan, 20).dose, 6);
  assert.equal(evaluate(plan, 20.1).ok, false); // Would floor to 6 but raw result exceeds plan.
});
