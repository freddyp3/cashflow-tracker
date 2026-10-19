export type SortDirection = 'asc' | 'desc';

interface Props {
  label: string;
  active: boolean;
  dir: SortDirection;
  align?: 'left' | 'right' | 'center';
  onClick: () => void;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

/** Clickable `<th>` for sortable tables; exposes the sort state via `aria-sort`. */
export default function SortableHeader({ label, active, dir, align = 'left', onClick }: Props) {
  return (
    <th aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-4 py-3 font-medium text-gray-500 ${ALIGN[align]}`}>
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-900">
        {label}
        {active && <span aria-hidden>{dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  );
}
