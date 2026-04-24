'use client';

import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Search
        style={{
          position: 'absolute',
          left: '14px',
          width: '16px',
          height: '16px',
          color: 'var(--text-light)',
          pointerEvents: 'none',
        }}
      />
      <input
        type="text"
        placeholder="Search restaurants or cuisine…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 40px 10px 40px',
          borderRadius: '12px',
          border: '1.5px solid var(--warm-border)',
          background: 'var(--warm-surface)',
          color: 'var(--text)',
          fontSize: '0.9375rem',
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--primary)';
          e.target.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--warm-border)';
          e.target.style.boxShadow = 'none';
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            padding: '2px',
          }}
          aria-label="Clear search"
        >
          <X style={{ width: '14px', height: '14px' }} />
        </button>
      )}
    </div>
  );
}
