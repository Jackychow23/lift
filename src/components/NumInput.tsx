import { useEffect, useState } from 'react';

/** Number box that lets you clear and retype without snapping to 0. */
export default function NumInput({ value, onChange, label, decimal }: { value: number; onChange: (n: number) => void; label: string; decimal?: boolean }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);
  return (
    <label style={{ display: 'flex' }}>
      <span className="sr-only">{label}</span>
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={text}
        onFocus={(e) => {
          setFocused(true);
          e.currentTarget.select();
        }}
        onBlur={() => {
          setFocused(false);
          setText(String(value));
        }}
        onChange={(e) => {
          const t = e.target.value.replace(',', '.');
          setText(t);
          const n = decimal ? parseFloat(t) : parseInt(t, 10);
          if (!Number.isNaN(n) && n >= 0 && n < 1000) onChange(n);
        }}
      />
    </label>
  );
}
