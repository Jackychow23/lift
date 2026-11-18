import type { ReactNode } from 'react';

export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="between">
          <h2 className="h2">{title}</h2>
          <button type="button" className="btn ghost" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
