import React from 'react';
import { useNavigate } from 'react-router-dom';

export function NotFound() {
  const nav = useNavigate();
  return (
    <div className="app-shell">
      <div style={{ padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 56, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>404</div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 12 }}>
          Page introuvable
        </div>
        <button onClick={() => nav('/')} className="btn btn-primary" style={{ marginTop: 24 }}>
          Retour catalogue
        </button>
      </div>
    </div>
  );
}
