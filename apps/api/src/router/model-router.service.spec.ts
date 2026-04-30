import { RouterRulesSchema } from '@aurora/shared';

describe('RouterRulesSchema', () => {
  it('validates minimal rules', () => {
    const rules = RouterRulesSchema.parse({
      version: 1,
      global: { candidates: [{ connectionId: 'c1', model: 'm1' }] },
    });

    expect(rules.global.candidates[0].connectionId).toBe('c1');
  });
});

