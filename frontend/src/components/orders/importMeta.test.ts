import { importMeta } from './importMeta';

describe('importMeta', () => {
  it('returns not imported with no warnings when externalRef is absent', () => {
    expect(importMeta({ externalRef: null, note: null })).toEqual({
      imported: false,
      ref: null,
      warnings: [],
    });
    expect(importMeta({ note: 'some note' }).imported).toBe(false);
  });

  it('parses warnings from the worker note', () => {
    const meta = importMeta({
      externalRef: '123',
      note: "Auto-imported from Gmail (Grailed, msg abc). Order ref: 123. Review needed: no price found; no catalog product matched 'Foo'.",
    });
    expect(meta.imported).toBe(true);
    expect(meta.ref).toBe('123');
    expect(meta.warnings).toEqual(['no price found', "no catalog product matched 'Foo'"]);
  });

  it('returns no warnings when the note has no Review needed marker', () => {
    const meta = importMeta({
      externalRef: 'abc',
      note: 'Auto-imported from Gmail (Depop, msg xyz). Order ref: abc.',
    });
    expect(meta.imported).toBe(true);
    expect(meta.warnings).toEqual([]);
  });
});
