import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons';
import { Packshot } from '../primitives';
import { addScan, addEanScan, getRecentWithData, getTodayCount } from '../lib/scanHistory';
import { getProductByEan } from '../lib/products';

const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

// 4-corner viewfinder — corners only, no CSS borders
function ViewfinderCorners({ amber = false }) {
  const c = amber ? 'oklch(0.72 0.16 70)' : '#ffffff';
  const t = 2.5, l = 28;
  const Corner = ({ style }) => (
    <div style={{ position: 'absolute', width: l, height: l, ...style }}>
      <div style={{
        position: 'absolute',
        top: style.bottom != null ? 'auto' : 0,
        bottom: style.bottom != null ? 0 : 'auto',
        left: style.right != null ? 'auto' : 0,
        right: style.right != null ? 0 : 'auto',
        width: l, height: t, background: c,
      }}/>
      <div style={{
        position: 'absolute',
        top: style.bottom != null ? 'auto' : 0,
        bottom: style.bottom != null ? 0 : 'auto',
        left: style.right != null ? 'auto' : 0,
        right: style.right != null ? 0 : 'auto',
        width: t, height: l, background: c,
      }}/>
    </div>
  );
  return (
    <div style={{
      position: 'absolute', left: '8%', right: '8%',
      top: '50%', transform: 'translateY(-50%)',
      aspectRatio: '2 / 1', pointerEvents: 'none',
    }}>
      <Corner style={{ top: 0, left: 0 }}/>
      <Corner style={{ top: 0, right: 0 }}/>
      <Corner style={{ bottom: 0, left: 0 }}/>
      <Corner style={{ bottom: 0, right: 0 }}/>
      {!amber && (
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${c}, transparent)`,
          animation: 'scan-line 2.4s ease-in-out infinite',
        }}/>
      )}
    </div>
  );
}

function RecentStrip({ scans }) {
  const nav = useNavigate();
  if (!scans.length) return null;
  return (
    <div style={{ padding: '0 14px' }}>
      <div style={{
        color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
      }}>Derniers scans</div>
      <div className="no-sb" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {scans.map(p => (
          <button key={p.ean} onClick={() => nav(`/p/${p.ean}`)} style={{
            flex: '0 0 auto', width: 110, padding: 8, borderRadius: 10,
            background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)',
            border: 'none', cursor: 'pointer', textAlign: 'left',
            display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            <Packshot product={{ title: p.title, brand: p.brand, cat: p.category, imageUrl: p.image_url }} size={34} radius={4} hint={false}/>
            <div style={{
              color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 500, lineHeight: 1.3,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>{p.title}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
              ···{p.ean.slice(-4)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Scanner() {
  const nav = useNavigate();

  // Camera refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const navigatingRef = useRef(false);
  const batchModeRef = useRef(false);
  const loopFnRef = useRef(null);
  const mountedRef = useRef(true);

  // UI state
  const [supported, setSupported] = useState(null);
  const [error, setError] = useState(null);
  const [showPaste, setShowPaste] = useState(false);
  const [manualEan, setManualEan] = useState('');

  // Session
  const [sessionStart] = useState(() => new Date());
  const [scanCount, setScanCount] = useState(() => getTodayCount());
  const [recentScans, setRecentScans] = useState(() => getRecentWithData(4));

  // Detection states
  const [batchMode, setBatchMode] = useState(false);
  const [batchToast, setBatchToast] = useState(null);
  const [lowConf, setLowConf] = useState(null);
  const [lastDetected, setLastDetected] = useState(null);

  const sessionTime = `${sessionStart.getHours()}h${String(sessionStart.getMinutes()).padStart(2, '0')} démarrée`;

  const toggleBatch = () => {
    const next = !batchModeRef.current;
    batchModeRef.current = next;
    setBatchMode(next);
  };

  async function handleDetected(ean) {
    navigatingRef.current = true;

    if (batchModeRef.current) {
      setScanCount(prev => prev + 1);
      let title = ean;
      try {
        const product = await getProductByEan(ean);
        if (product && mountedRef.current) {
          addScan(product);
          title = product.title;
          setRecentScans(getRecentWithData(4));
        } else {
          addEanScan(ean);
        }
      } catch {
        addEanScan(ean);
      }
      if (!mountedRef.current) return;
      setBatchToast({ ean, title });
      setTimeout(() => {
        if (!mountedRef.current) return;
        setBatchToast(null);
        navigatingRef.current = false;
        if (loopFnRef.current) rafRef.current = requestAnimationFrame(loopFnRef.current);
      }, 2200);
    } else {
      setLastDetected(ean);
      addEanScan(ean);
      setTimeout(() => nav(`/p/${ean}?from=scan`), 320);
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    async function loop() {
      if (!mountedRef.current || !detectorRef.current || !videoRef.current) return;
      if (navigatingRef.current) return;
      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        if (codes?.length && !navigatingRef.current) {
          const raw = codes[0].rawValue;
          if (raw && /^\d{8,13}$/.test(raw)) {
            const isStandard = raw.length === 8 || raw.length === 13;
            if (!isStandard) {
              const masked = raw.slice(0, -3) + '●●' + raw.slice(-1);
              setLowConf({ raw, masked });
              return;
            }
            await handleDetected(raw);
            return;
          }
        }
      } catch {}
      if (mountedRef.current && !navigatingRef.current) {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    loopFnRef.current = loop;

    async function start() {
      const hasDetector = 'BarcodeDetector' in window;
      if (!hasDetector) {
        setSupported(false);
        setShowPaste(true);
        return;
      }

      try {
        const formats = await window.BarcodeDetector.getSupportedFormats?.() ?? [];
        const useFormats = BARCODE_FORMATS.filter(f => formats.length === 0 || formats.includes(f));
        detectorRef.current = new window.BarcodeDetector({
          formats: useFormats.length ? useFormats : BARCODE_FORMATS,
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        // Attach stream — video element is always in the DOM so videoRef is ready
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setSupported(true);
        loop();
      } catch (e) {
        if (!mountedRef.current) return;
        setSupported(false);
        setError(e?.name === 'NotAllowedError'
          ? 'Accès caméra refusé.'
          : 'Caméra indisponible.');
        setShowPaste(true);
      }
    }

    start();

    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [nav]);

  const submitManual = (e) => {
    e?.preventDefault();
    const ean = manualEan.trim();
    if (/^\d{8,13}$/.test(ean)) {
      nav(`/p/${ean}?from=scan`);
    } else {
      setError('EAN invalide — 8 à 13 chiffres requis.');
    }
  };

  const confirmLowConf = () => {
    if (!lowConf) return;
    const ean = lowConf.raw;
    setLowConf(null);
    handleDetected(ean);
  };

  const retryLowConf = () => {
    setLowConf(null);
    navigatingRef.current = false;
    if (loopFnRef.current) rafRef.current = requestAnimationFrame(loopFnRef.current);
  };

  const cameraActive = supported === true;

  return (
    // Outer fixed container — black background, flex column
    <div style={{ position: 'fixed', inset: 0, background: '#0A0908', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Camera video — always in DOM so srcObject can be set before supported=true */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover',
          opacity: cameraActive ? 1 : 0,
        }}
      />

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: cameraActive ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.88)',
      }}/>

      {/* Layout: 3 zones — top bar | camera area (flex-1) | bottom strip */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', zIndex: 1 }}>

        {/* ── TOP BAR ── */}
        <div style={{
          flexShrink: 0,
          paddingTop: 'env(safe-area-inset-top, 44px)',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px 12px',
          }}>
            <button onClick={() => nav('/')} style={{
              width: 38, height: 38, borderRadius: 8,
              background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon.Close s={18} c="white"/>
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Session{batchMode ? ' · Rafale' : ''}
              </div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-mono)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {scanCount} scannés · {sessionTime}
              </div>
            </div>

            <button onClick={toggleBatch} style={{
              height: 32, padding: '0 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: batchMode ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
              color: 'white', fontFamily: 'var(--font-mono)',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: batchMode ? 'white' : 'rgba(255,255,255,0.4)' }}/>
              Rafale
            </button>

            <button onClick={() => setShowPaste(s => !s)} style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: showPaste ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon.Edit s={14} c="white"/>
            </button>
          </div>
        </div>

        {/* ── CAMERA AREA (flex-1) — viewfinder centered here ── */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>

          {/* Viewfinder — centered in camera area */}
          {cameraActive && !lastDetected && <ViewfinderCorners amber={!!lowConf}/>}

          {/* Detection hint — above viewfinder center */}
          {cameraActive && !lowConf && !batchToast && !lastDetected && !showPaste && (
            <div style={{
              position: 'absolute', bottom: 'calc(50% + 30px)', left: 0, right: 0,
              display: 'flex', justifyContent: 'center', pointerEvents: 'none',
            }}>
              <div style={{
                padding: '5px 12px', borderRadius: 99,
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 12, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: 99, background: 'oklch(0.75 0.18 145)',
                  animation: 'pulse-ring 1.4s ease-out infinite',
                }}/>
                {batchMode ? 'Rafale active · scanne en continu' : 'Détection active'}
              </div>
            </div>
          )}

          {/* Batch toast */}
          {batchToast && (
            <div style={{
              position: 'absolute', bottom: 'calc(50% + 30px)', left: 0, right: 0,
              display: 'flex', justifyContent: 'center',
            }}>
              <div style={{
                padding: '8px 16px', borderRadius: 99,
                background: 'oklch(0.55 0.13 155)', color: 'white',
                fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                animation: 'detected-pop .35s cubic-bezier(.2,.8,.25,1)',
                maxWidth: '80%',
              }}>
                <Icon.Check s={14} c="white" w={2.5}/>
                <span style={{ fontWeight: 700 }}>+1</span>
                <span style={{ opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {batchToast.title}
                </span>
              </div>
            </div>
          )}

          {/* Detected (normal mode feedback) */}
          {lastDetected && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.75)', color: 'white',
              padding: '14px 22px', borderRadius: 12,
              fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500,
              animation: 'detected-pop .35s cubic-bezier(.2,.8,.25,1)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Icon.Check s={18} c="var(--success)"/>
              <span>{lastDetected}</span>
            </div>
          )}

          {/* Low confidence overlay — below viewfinder */}
          {lowConf && (
            <div style={{
              position: 'absolute', bottom: 16, left: 14, right: 14,
              padding: '14px 14px 12px',
              background: 'rgba(20,18,14,0.88)', backdropFilter: 'blur(20px)',
              borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.1)', color: 'white',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: 99, background: 'oklch(0.72 0.16 70)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon.Warn s={11} c="#1a1611" w={2.2}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'oklch(0.85 0.12 70)' }}>
                  Lecture incertaine
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 500, letterSpacing: '0.04em', marginBottom: 10 }}>
                {lowConf.masked}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={retryLowConf} style={{ flex: 1, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Rescanner
                </button>
                <button onClick={confirmLowConf} style={{ flex: 2, height: 36, borderRadius: 8, background: 'white', border: 'none', color: '#1a1611', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon.Check s={13} c="#1a1611" w={2.2}/> Confirmer
                </button>
              </div>
            </div>
          )}

          {/* Init state */}
          {supported === null && (
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 13, transform: 'translateY(-50%)' }}>
              Initialisation de la caméra…
            </div>
          )}
        </div>

        {/* ── BOTTOM STRIP ── */}
        <div style={{
          flexShrink: 0,
          paddingBottom: 'env(safe-area-inset-bottom, 24px)',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
          paddingTop: 12,
        }}>
          {showPaste ? (
            <div style={{ padding: '0 14px 12px' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Ou colle un EAN
              </div>
              <form onSubmit={submitManual} style={{
                display: 'flex', gap: 6, padding: 6, borderRadius: 12,
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)',
                border: '0.5px solid rgba(255,255,255,0.15)',
              }}>
                <input
                  value={manualEan}
                  onChange={e => setManualEan(e.target.value.replace(/\D/g, ''))}
                  placeholder="13 chiffres"
                  maxLength={13}
                  inputMode="numeric"
                  autoFocus
                  autoComplete="off"
                  style={{
                    flex: 1, height: 36, padding: '0 10px',
                    background: 'transparent', border: 'none', outline: 'none',
                    color: 'white', fontFamily: 'var(--font-mono)', fontSize: 15,
                    letterSpacing: '0.04em',
                  }}/>
                <button type="submit" disabled={manualEan.length < 8} style={{
                  height: 36, padding: '0 14px', borderRadius: 8, border: 'none',
                  background: manualEan.length >= 8 ? 'white' : 'rgba(255,255,255,0.18)',
                  color: manualEan.length >= 8 ? '#1a1611' : 'rgba(255,255,255,0.38)',
                  fontSize: 13, fontWeight: 500, cursor: manualEan.length >= 8 ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}>Chercher</button>
              </form>
              {error && <div style={{ fontSize: 12, color: 'oklch(0.72 0.16 70)', marginTop: 8 }}>{error}</div>}
            </div>
          ) : (
            !lowConf && cameraActive && <RecentStrip scans={recentScans}/>
          )}
          {/* Spacer for home indicator */}
          <div style={{ height: 16 }}/>
        </div>
      </div>
    </div>
  );
}
