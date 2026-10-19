import type { Order } from '../../types';

export interface ImportMeta {
  imported: boolean;
  ref: string | null;
  warnings: string[];
}

const WARNING_MARKER = 'Review needed: ';

export function importMeta(o: Pick<Order, 'externalRef' | 'note'>): ImportMeta {
  const imported = !!o.externalRef;
  const ref = o.externalRef ?? null;

  let warnings: string[] = [];
  const idx = o.note?.indexOf(WARNING_MARKER) ?? -1;
  if (o.note != null && idx !== -1) {
    let rest = o.note.slice(idx + WARNING_MARKER.length);
    if (rest.endsWith('.')) rest = rest.slice(0, -1);
    warnings = rest
      .split('; ')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
  }

  return { imported, ref, warnings };
}
