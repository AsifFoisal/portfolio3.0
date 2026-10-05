import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from './Icons';

type DialogProps = {
  children: ReactNode;
  label: string;
  className?: string;
  onClose: () => void;
};

export default function Dialog({ children, label, className = '', onClose }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`dialog ${className}`}
      aria-label={label}
      data-lenis-prevent
      onCancel={(event) => { event.preventDefault(); onCloseRef.current(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onCloseRef.current(); }}
    >
      <div className="dialog-inner">
        <button className="dialog-close" onClick={onClose} aria-label="Close dialog" autoFocus><CloseIcon /></button>
        {children}
      </div>
    </dialog>
  );
}