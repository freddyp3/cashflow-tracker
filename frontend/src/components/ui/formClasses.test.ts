import { inputClass, inlineInputClass, labelClass, smallLabelClass, errorClass } from './formClasses';

describe('formClasses', () => {
  it('exports non-empty class strings with inputClass stretching and inlineInputClass inline', () => {
    for (const cls of [inputClass, inlineInputClass, labelClass, smallLabelClass, errorClass]) {
      expect(typeof cls).toBe('string');
      expect(cls.length).toBeGreaterThan(0);
    }
    expect(inputClass.startsWith('w-full ')).toBe(true);
    expect(inlineInputClass).not.toContain('w-full');
  });
});
