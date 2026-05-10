import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Affiche } from './pages/Affiche';
import { Catalogue } from './pages/Catalogue';
import { Scanner } from './pages/Scanner';
import { Product } from './pages/Product';
import { NotFound } from './pages/NotFound';
import { DesktopShell } from './pages/DesktopShell';
import { useIsDesktop } from './hooks/useIsDesktop';
import { getTodayCount } from './lib/scanHistory';
import { Icon } from './icons';

function BottomTabBar() {
  const location = useLocation();
  const nav = useNavigate();
  const path = location.pathname;
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => { setScanCount(getTodayCount()); }, [path]);

  if (path === '/scan' || path.startsWith('/p/')) return null;

  const active = path === '/catalogue' ? 'catalogue' : 'affiche';

  const tabBtn = (id, label, icon, to) => {
    const on = active === id;
    return (
      <button
        onClick={() => nav(to)}
        style={{
          flex: 1, border: 'none', background: 'transparent', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 3, color: on ? 'var(--primary)' : 'var(--ink-4)',
          fontFamily: 'var(--font-sans)', paddingBottom: 2,
        }}
      >
        {icon(on)}
        <span style={{ fontSize: 10, fontWeight: on ? 600 : 400 }}>{label}</span>
      </button>
    );
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--canvas)',
      borderTop: '0.5px solid var(--line)',
      display: 'flex', alignItems: 'stretch',
      height: `calc(49px + env(safe-area-inset-bottom, 0px))`,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      zIndex: 50,
    }}>
      {tabBtn('affiche', 'Affiche', on => <Icon.Image s={22} c={on ? 'var(--primary)' : 'var(--ink-4)'}/>, '/')}

      {/* Centre: scanner pill */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => nav('/scan')}
          style={{
            width: 44, height: 44, borderRadius: 99,
            background: 'var(--primary)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(86,69,212,0.30)', position: 'relative',
          }}
        >
          <Icon.Scan s={20} c="white" w={2}/>
          {scanCount > 0 && (
            <div style={{
              position: 'absolute', top: -3, right: -3,
              minWidth: 16, height: 16, padding: '0 4px', borderRadius: 99,
              background: 'white', color: 'var(--primary)',
              fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid var(--primary)',
            }}>{scanCount > 99 ? '99+' : scanCount}</div>
          )}
        </button>
      </div>

      {tabBtn('catalogue', 'Catalogue', on => <Icon.Catalog s={22} c={on ? 'var(--primary)' : 'var(--ink-4)'}/>, '/catalogue')}
    </div>
  );
}

export function App() {
  const isDesktop = useIsDesktop(1024);

  if (isDesktop) {
    return <DesktopShell/>;
  }

  return (
    <BrowserRouter>
      <div className="dlc-root" style={{ minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<Affiche/>}/>
          <Route path="/catalogue" element={<Catalogue/>}/>
          <Route path="/scan" element={<Scanner/>}/>
          <Route path="/p/:ean" element={<Product/>}/>
          <Route path="/404" element={<NotFound/>}/>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
        <BottomTabBar/>
      </div>
    </BrowserRouter>
  );
}

export default App;
