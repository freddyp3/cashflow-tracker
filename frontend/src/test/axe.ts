import axe from 'axe-core';

/**
 * Asserts zero axe violations on the rendered container.
 * `color-contrast` is disabled (jsdom cannot compute contrast) and `region`
 * is disabled (landmark containment is Layout's job, not the page's — page
 * tests render without the Layout shell).
 */
export async function expectNoA11yViolations(container: Element) {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(
    results.violations,
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n'),
  ).toEqual([]);
}
