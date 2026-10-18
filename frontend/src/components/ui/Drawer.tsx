import { useEffect, useId } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';

export interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Drawer({ open, title, onClose, children, footer }: DrawerProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white border-l border-gray-200 shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <Button variant="ghost" aria-label="Close" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="border-t border-gray-200 px-6 py-4">{footer}</div>}
      </div>
    </>,
    document.body,
  );
}
