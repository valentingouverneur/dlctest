import React, { useState } from 'react';
import { signInWithGoogle } from '../lib/auth';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Supabase redirige vers Google — pas de suite dans ce code
    } catch (e) {
      setError(e.message || 'Erreur de connexion');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--surface)', padding: 24,
    }}>
      <div style={{
        background: 'var(--canvas)', borderRadius: 16,
        border: '0.5px solid var(--hairline)',
        padding: '32px 28px', width: '100%', maxWidth: 360,
        boxShadow: 'var(--sh-2)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'var(--charcoal)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600,
          }}>D</div>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>DLC</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone)' }}>v2</span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Connexion</div>
          <div style={{ fontSize: 13, color: 'var(--steel)', lineHeight: 1.5 }}>
            Utilise ton compte Google d'entreprise
          </div>
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%', height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: loading ? 'var(--surface)' : 'var(--charcoal)',
            color: 'white', border: 'none', borderRadius: 10,
            fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
            cursor: loading ? 'default' : 'pointer',
            transition: 'background 0.12s',
          }}
        >
          {loading ? (
            <span style={{ fontSize: 13, color: 'var(--stone)' }}>Redirection…</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18L12.048 13.56C11.243 14.1 10.211 14.42 9 14.42c-2.392 0-4.417-1.616-5.143-3.787H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.857 10.633A5.55 5.55 0 0 1 3.545 9c0-.563.097-1.11.312-1.633V5.035H.957A9.01 9.01 0 0 0 0 9c0 1.452.348 2.827.957 4.035l2.9-2.402z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.965l2.9 2.402C4.583 5.196 6.608 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Se connecter avec Google
            </>
          )}
        </button>

        {error && (
          <div style={{ fontSize: 12, color: 'var(--error)', textAlign: 'center' }}>{error}</div>
        )}
      </div>
    </div>
  );
}

export default Login;
