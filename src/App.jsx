import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Affiche } from './pages/Affiche';
import { Scanner } from './pages/Scanner';
import { Product } from './pages/Product';
import { useIsDesktop } from './hooks/useIsDesktop';
import { getTodayCount } from './lib/scanHistory';
import { Icon } from './icons';

// Split heavy pages out of the initial bundle. Affiche (home), Scanner and
// Product stay eager: the scan -> product flow must never wait on a chunk.
const Catalogue = lazy(() => import('./pages/Catalogue').then(m => ({ default: m.Catalogue })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const Heures = lazy(() => import('./pages/Heures').then(m => ({ default: m.Heures })));
const Analyse = lazy(() => import('./pages/Analyse').then(m => ({ default: m.Analyse })));
const Dlc = lazy(() => import('./pages/Dlc').then(m => ({ default: m.Dlc })));
const DesktopShell = lazy(() => import('./pages/DesktopShell').then(m => ({ default: m.DesktopShell })));

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Icon.Spinner s={24} c="var(--primary)"/>
    </div>
  );
}

// ─── Drawer overlay ──────────────────────────────────────────────────
function Drawer({ open, onClose, onNav }) {
  const location = useLocation();
  const path = location.pathname;
  const [scanCount, setScanCount] = useState(0);
  useEffect(() => { setScanCount(getTodayCount()); }, [path]);

  const items = [
    { id: '/', label: 'Affiche', icon: on => <Icon.Image s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/catalogue', label: 'Catalogue', icon: on => <Icon.Catalog s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/dlc', label: 'Calendrier DLC', icon: on => <Icon.Calendar s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/scan', label: 'Scanner', icon: on => <Icon.Scan s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/analyse', label: 'Analyse rayon', icon: on => <Icon.BarChart s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/heures', label: 'Heures', icon: on => <Icon.Clock s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
  ];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(0,0,0,0.30)',
          animation: 'fade-in 0.15s ease',
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 999,
        width: 260, background: 'var(--canvas)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        animation: 'sheet-up 0.18s ease',
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '16px 14px 10px', marginBottom: 4,
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'var(--charcoal)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
          }}>D</div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>DLC</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--stone)' }}>v2</span>
          <div style={{ flex: 1 }}/>
          <button onClick={onClose} style={{
            width: 28, height: 28, border: 'none', borderRadius: 6,
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--stone)',
          }}>
            <Icon.Close s={14}/>
          </button>
        </div>

        {/* Nav items */}
        <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {items.map(item => {
            const active = item.id === '/scan'
              ? path === '/scan'
              : path === item.id || (item.id !== '/' && path.startsWith(item.id));
            return (
              <button key={item.id} onClick={() => { onNav(item.id); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: 36,
                  padding: '0 10px', border: 'none', borderRadius: 6, cursor: 'pointer',
                  background: active ? 'rgba(20,18,14,0.06)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: active ? 500 : 450,
                  textAlign: 'left',
                }}
              >
                {item.icon(active)}
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }}/>

        {/* Session count */}
        <div style={{ padding: '12px 14px', borderTop: '0.5px solid var(--hairline)', margin: '0 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 4 }}>
            Session
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              {scanCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--stone)' }}>scans aujourd'hui</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Floating scan FAB ──────────────────────────────────────────────
function ScanFab() {
  const nav = useNavigate();
  const location = useLocation();
  if (location.pathname === '/scan') return null;
  return (
    <button
      onClick={() => nav('/scan')}
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 100,
        width: 52, height: 52, borderRadius: 99,
        background: 'var(--primary)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 3px 16px rgba(86,69,212,0.35)',
      }}
    >
      <Icon.Scan s={22} c="white" w={2}/>
    </button>
  );
}

// ─── App ─────────────────────────────────────────────────────────────
export function App() {
  const isDesktop = useIsDesktop(768);

  if (isDesktop) {
    return (
      <Suspense fallback={<PageFallback/>}>
        <DesktopShell/>
      </Suspense>
    );
  }

  return (
    <BrowserRouter>
      <div className="dlc-root" style={{ minHeight: '100vh', position: 'relative' }}>
        <Suspense fallback={<PageFallback/>}>
          <Routes>
            <Route path="/" element={<Affiche/>}/>
            <Route path="/catalogue" element={<Catalogue/>}/>
            <Route path="/dlc" element={<Dlc/>}/>
            <Route path="/scan" element={<Scanner/>}/>
            <Route path="/analyse" element={<Analyse/>}/>
            <Route path="/heures" element={<Heures/>}/>
            <Route path="/p/:ean" element={<Product/>}/>
            <Route path="/404" element={<NotFound/>}/>
            <Route path="*" element={<Navigate to="/" replace/>}/>
          </Routes>
        </Suspense>
        <MobileShell/>
      </div>
    </BrowserRouter>
  );
}

// ─── Mobile shell: hamburger + FAB ───────────────────────────────────
function MobileShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const nav = useNavigate();
  const location = useLocation();

  // Hide shell on product page and scan page
  if (location.pathname === '/scan' || location.pathname.startsWith('/p/')) return null;

  return (
    <>
      {/* Top bar with hamburger */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 8,
        height: 48, padding: '0 8px 0 12px',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '0.5px solid var(--hairline)',
      }}>
        <button onClick={() => setDrawerOpen(true)} style={{
          width: 32, height: 32, border: 'none', borderRadius: 6,
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--charcoal)',
        }}>
          <Icon.Menu s={20}/>
        </button>

        {/* Page title */}
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
          {location.pathname === '/' && 'Affiche'}
          {location.pathname === '/catalogue' && 'Catalogue'}
          {location.pathname === '/analyse' && 'Analyse rayon'}
          {location.pathname === '/heures' && 'Heures'}
          {location.pathname === '/dlc' && 'Calendrier DLC'}
        </div>
      </div>

      {/* Spacer for fixed top bar */}
      <div style={{ height: 48 }}/>

      {/* FAB */}
      <ScanFab/>

      {/* Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onNav={nav}/>
    </>
  );
}

export default App;
