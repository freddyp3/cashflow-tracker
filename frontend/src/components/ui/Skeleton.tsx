export interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

export interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="bg-white rounded-lg border border-gray-200 shadow-sm"
    >
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r} className="border-b border-gray-100">
              {Array.from({ length: cols }, (_, c) => (
                <td key={c} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
