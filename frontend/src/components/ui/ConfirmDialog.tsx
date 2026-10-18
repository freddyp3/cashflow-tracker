import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement;
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      (previousFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-lg border border-gray-200 shadow-sm w-full max-w-sm p-6"
      >
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button ref={cancelRef} variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
