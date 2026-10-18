import Button from './Button';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center"
    >
      <p className="text-red-600">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
